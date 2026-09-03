"use client";

import { useGSAP } from "@gsap/react";
import { useQueries } from "@tanstack/react-query";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  CircleHelp,
  Clock3,
  MessagesSquare,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useAdmin } from "@/components/auth/admin-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi, pageItems } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import type {
  AdminAccount,
  AuditLog,
  Faq,
  InquiryListItem,
  NoticeListItem,
  PageResponse,
} from "@/types/admin";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const quickLinks = [
  {
    href: "/inquiries",
    label: "문의 답변하기",
    description: "대기 중인 고객 문의를 확인합니다.",
    icon: MessagesSquare,
  },
  {
    href: "/faqs",
    label: "FAQ 정리하기",
    description: "자주 묻는 질문과 노출 순서를 관리합니다.",
    icon: CircleHelp,
  },
  {
    href: "/notices",
    label: "공지 등록하기",
    description: "고객에게 중요한 소식을 전달합니다.",
    icon: BookOpenText,
  },
];

export function DashboardOverview() {
  const admin = useAdmin();
  const root = useRef<HTMLDivElement>(null);
  const [activityIndex, setActivityIndex] = useState(0);
  const isMadeInLemon = admin.orgType === "MADEINLEMON";
  const results = useQueries({
    queries: [
      {
        queryKey: ["faqs"],
        queryFn: () => adminApi.get<Faq[]>("faqs"),
      },
      {
        queryKey: ["notices", 0],
        queryFn: () =>
          adminApi.get<PageResponse<NoticeListItem> | NoticeListItem[]>(
            "notices",
            { page: 0, size: 5, sort: "createdAt,desc" },
          ),
      },
      {
        queryKey: ["inquiries", "PENDING", 0],
        queryFn: () =>
          adminApi.get<PageResponse<InquiryListItem>>("inquiries", {
            status: "PENDING",
            page: 0,
            size: 5,
            sort: "createdAt,desc",
          }),
      },
      {
        queryKey: ["accounts"],
        queryFn: () => adminApi.get<AdminAccount[]>("accounts"),
        enabled: isMadeInLemon,
      },
      {
        queryKey: ["audit-logs", 0],
        queryFn: () =>
          adminApi.get<PageResponse<AuditLog>>("audit-logs", {
            page: 0,
            size: 6,
            sort: "createdAt,desc",
          }),
        enabled: isMadeInLemon,
      },
    ],
  });

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-dashboard-reveal]", {
        opacity: 0.1,
        y: 24,
        stagger: 0.08,
        duration: 0.8,
        ease: "power3.out",
      });
      gsap.utils
        .toArray<HTMLElement>("[data-scroll-card]")
        .forEach((card: HTMLElement) =>
          gsap.fromTo(
            card,
            { scale: 0.94, opacity: 0.45 },
            {
              scale: 1,
              opacity: 1,
              scrollTrigger: {
                trigger: card,
                start: "top 88%",
                end: "top 55%",
                scrub: 0.6,
              },
            },
          ),
        );
      gsap.fromTo(
        "[data-dashboard-image]",
        { scale: 0.8, opacity: 0.25 },
        {
          scale: 1,
          opacity: 1,
          scrollTrigger: {
            trigger: "[data-dashboard-image]",
            start: "top 90%",
            end: "top 45%",
            scrub: 0.7,
          },
        },
      );
      gsap.to("[data-statement-word]", {
        opacity: 1,
        stagger: 0.08,
        scrollTrigger: {
          trigger: "[data-dashboard-statement]",
          start: "top 85%",
          end: "center 45%",
          scrub: 0.8,
        },
      });
    },
    { scope: root },
  );

  const faqs = pageItems<Faq>(results[0].data);
  const notices = pageItems<NoticeListItem>(results[1].data);
  const inquiries = pageItems<InquiryListItem>(results[2].data);
  const accounts = pageItems<AdminAccount>(results[3].data);
  const auditLogs = pageItems<AuditLog>(results[4].data);
  const activities: Array<AuditLog | InquiryListItem> = isMadeInLemon
    ? auditLogs
    : inquiries;
  const activeActivity =
    activities[activityIndex % Math.max(activities.length, 1)];
  const loading = results.some((result) => result.isLoading);
  const hasError = results.some((result) => result.isError);
  const noticeTotal =
    results[1].data && !Array.isArray(results[1].data)
      ? ((results[1].data as PageResponse<NoticeListItem>).totalElements ??
        notices.length)
      : notices.length;
  const inquiryTotal =
    (results[2].data as PageResponse<InquiryListItem> | undefined)
      ?.totalElements ?? inquiries.length;
  const stats = [
    {
      label: "답변 대기 문의",
      value: inquiryTotal,
      detail: "우선 확인이 필요합니다",
      icon: MessagesSquare,
      accent: true,
    },
    {
      label: "등록된 FAQ",
      value: faqs.length,
      detail: "전체 카테고리",
      icon: CircleHelp,
    },
    {
      label: "최근 공지",
      value: noticeTotal,
      detail: "운영 중인 콘텐츠",
      icon: BookOpenText,
    },
    ...(isMadeInLemon
      ? [
          {
            label: "이용 가능한 관리자",
            value: accounts.filter((account) => account.active).length,
            detail: "전체 조직",
            icon: UsersRound,
          },
        ]
      : []),
  ];

  return (
    <div ref={root} className="space-y-10 overflow-x-hidden">
      <section className="relative overflow-hidden rounded-2xl bg-zinc-950 px-6 py-9 text-white shadow-2xl sm:px-9 sm:py-11 lg:px-12">
        <div className="absolute -right-20 -top-24 size-80 rounded-full bg-primary/30 blur-3xl" />
        <div className="noise-overlay absolute inset-0 opacity-30" />
        <div className="relative max-w-5xl" data-dashboard-reveal>
          <div className="mb-7 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
            <span className="size-2 rounded-full bg-[#f7201a]" />
            Live operations
          </div>
          <h1 className="max-w-5xl text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">
            안녕하세요, {admin.name}님.
            <br className="hidden sm:block" /> 오늘의{" "}
            <span
              data-dashboard-image
              className="relative mx-1 inline-block h-8 w-20 overflow-hidden rounded-full align-middle sm:h-11 sm:w-28"
            >
              <span className="absolute inset-0 bg-[url('/images/admin-hero.webp')] bg-cover bg-center grayscale" />
              <span className="absolute inset-0 bg-primary/25" />
            </span>{" "}
            운영 흐름을 확인하세요.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
            고객 응대와 콘텐츠 변경을 빠르게 판단할 수 있도록 중요한 작업을 한
            화면에 모았습니다.
          </p>
        </div>
      </section>

      {hasError && (
        <Card className="overflow-hidden">
          <QueryErrorState
            title="일부 운영 정보를 불러오지 못했습니다"
            description="현재 표시된 숫자가 실제 현황과 다를 수 있습니다. 다시 불러와 최신 정보를 확인해 주세요."
            onRetry={() => {
              results.forEach((result) => {
                if (result.isError) result.refetch();
              });
            }}
          />
        </Card>
      )}

      <section
        className="grid grid-flow-dense grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12"
        aria-label="운영 요약"
      >
        {loading
          ? Array.from({ length: isMadeInLemon ? 4 : 3 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-40 sm:col-span-1 xl:col-span-3"
              />
            ))
          : stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.label}
                  data-dashboard-reveal
                  className={`group overflow-hidden p-6 transition duration-500 hover:-translate-y-1 hover:shadow-xl xl:col-span-3 ${stat.accent ? "border-primary/20 bg-primary text-white" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex size-10 items-center justify-center rounded-lg ${stat.accent ? "bg-white/15" : "bg-zinc-100 text-zinc-600"}`}
                    >
                      <Icon className="size-5" />
                    </div>
                  </div>
                  <p
                    className={`mt-7 text-sm font-medium ${stat.accent ? "text-white/70" : "text-zinc-500"}`}
                  >
                    {stat.label}
                  </p>
                  <div className="mt-1 flex items-end justify-between">
                    <strong className="text-3xl font-semibold tracking-tight">
                      {stat.value}
                    </strong>
                    <span
                      className={`text-xs ${stat.accent ? "text-white/55" : "text-zinc-400"}`}
                    >
                      {stat.detail}
                    </span>
                  </div>
                </Card>
              );
            })}
      </section>

      <section
        data-dashboard-statement
        className="mx-auto max-w-5xl py-10 text-center text-2xl font-semibold leading-[1.35] tracking-[-0.035em] text-zinc-900 sm:text-4xl"
      >
        {"빠른 판단 정확한 기록 일관된 고객 경험이 좋은 운영을 만듭니다"
          .split(" ")
          .map((word) => (
            <span
              key={word}
              data-statement-word
              className="mr-[0.28em] inline-block opacity-10"
            >
              {word}
            </span>
          ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <Card data-scroll-card className="overflow-hidden xl:col-span-7">
          <div className="flex items-center justify-between border-b px-6 py-5">
            <div>
              <h2 className="font-semibold text-zinc-900">빠른 작업</h2>
              <p className="mt-1 text-xs text-zinc-500">
                지금 바로 처리할 수 있는 운영 업무입니다.
              </p>
            </div>
          </div>
          <div className="divide-y">
            {quickLinks.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-4 px-6 py-5 transition hover:bg-zinc-50"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition group-hover:bg-primary group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-zinc-900">
                    {label}
                  </span>
                  <span className="mt-1 block truncate text-sm text-zinc-500">
                    {description}
                  </span>
                </span>
                <ArrowUpRight className="size-4 text-zinc-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </Card>
        <Card data-scroll-card className="overflow-hidden xl:col-span-5">
          <div className="flex items-center justify-between border-b px-6 py-5">
            <div>
              <h2 className="font-semibold text-zinc-900">최근 활동</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {isMadeInLemon ? "관리자 변경 기록" : "최근 고객 문의"}
              </p>
            </div>
            <Clock3 className="size-4 text-zinc-400" />
          </div>
          {activeActivity ? (
            <div className="flex min-h-64 flex-col justify-between p-6">
              <div>
                <Badge
                  variant={"action" in activeActivity ? "secondary" : "warning"}
                >
                  {"action" in activeActivity
                    ? activeActivity.targetType
                    : "답변 대기"}
                </Badge>
                <p className="mt-6 text-xl font-semibold leading-8 tracking-tight text-zinc-900">
                  {"action" in activeActivity
                    ? `${activeActivity.adminName} 관리자가 ${activeActivity.action} 작업을 수행했습니다.`
                    : activeActivity.title}
                </p>
                <p className="mt-3 text-sm text-zinc-500">
                  {formatDateTime(activeActivity.createdAt)}
                </p>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <p className="text-xs text-zinc-400">
                  {activityIndex + 1} / {activities.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setActivityIndex(
                        (value) =>
                          (value - 1 + activities.length) % activities.length,
                      )
                    }
                    aria-label="이전 활동"
                  >
                    <ArrowLeft />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setActivityIndex(
                        (value) => (value + 1) % activities.length,
                      )
                    }
                    aria-label="다음 활동"
                  >
                    <ArrowRight />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-zinc-400">
              표시할 최근 활동이 없습니다.
            </div>
          )}
        </Card>
      </section>

      <div className="overflow-hidden border-y py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
        <div className="admin-marquee-track flex w-max gap-12 pr-12">
          {Array.from({ length: 2 }).flatMap((_, index) => [
            <span key={`${index}-operations`}>SK V1 운영 관리</span>,
            <span key={`${index}-secure`} className="text-primary">
              안전한 관리자 환경
            </span>,
            <span key={`${index}-audit`}>모든 변경 기록</span>,
            <span key={`${index}-customer`}>고객 문의 우선</span>,
          ])}
        </div>
      </div>
      <footer className="flex flex-col gap-3 border-t pt-6 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
        <p>SK V1 관리자 페이지</p>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4" />
          로그인은 8시간 동안 유지됩니다.
        </div>
      </footer>
    </div>
  );
}
