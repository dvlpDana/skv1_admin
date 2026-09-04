"use client";

import { useQueries } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  CircleHelp,
  Clock3,
  MessagesSquare,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/components/auth/admin-context";
import { InquiryStatusBadge } from "@/components/features/inquiry-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
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

const quickLinks = [
  {
    href: "/inquiries",
    label: "문의 답변하기",
    description: "대기 중인 고객 문의를 확인합니다.",
    icon: MessagesSquare,
  },
  {
    href: "/faqs",
    label: "FAQ 관리하기",
    description: "자주 묻는 질문과 노출 순서를 관리합니다.",
    icon: CircleHelp,
  },
  {
    href: "/notices",
    label: "공지 등록하기",
    description: "고객에게 안내할 공지사항을 등록합니다.",
    icon: BookOpenText,
  },
];

type DashboardStat = {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone: "neutral" | "warning" | "info" | "success";
};

export function DashboardOverview() {
  const admin = useAdmin();
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

  const faqs = pageItems<Faq>(results[0].data);
  const notices = pageItems<NoticeListItem>(results[1].data);
  const inquiries = pageItems<InquiryListItem>(results[2].data);
  const accounts = pageItems<AdminAccount>(results[3].data);
  const auditLogs = pageItems<AuditLog>(results[4].data);
  const activities: Array<AuditLog | InquiryListItem> = isMadeInLemon
    ? auditLogs
    : inquiries;
  const normalizedActivityIndex =
    activityIndex % Math.max(activities.length, 1);
  const activeActivity = activities[normalizedActivityIndex];
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
  const stats: DashboardStat[] = [
    {
      label: "답변 대기 문의",
      value: inquiryTotal,
      description: "우선 확인이 필요한 문의",
      icon: MessagesSquare,
      tone: "warning",
    },
    {
      label: "등록된 FAQ",
      value: faqs.length,
      description: "전체 카테고리 기준",
      icon: CircleHelp,
      tone: "neutral",
    },
    {
      label: "등록된 공지",
      value: noticeTotal,
      description: "현재 운영 중인 콘텐츠",
      icon: BookOpenText,
      tone: "info",
    },
    ...(isMadeInLemon
      ? [
          {
            label: "이용 가능한 관리자",
            value: accounts.filter((account) => account.active).length,
            description: "전체 조직 기준",
            icon: UsersRound,
            tone: "success" as const,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
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
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="운영 요약"
        aria-busy={loading}
      >
        {loading
          ? Array.from({ length: isMadeInLemon ? 4 : 3 }).map((_, index) => (
              <Skeleton key={index} className="h-36" />
            ))
          : stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-12" aria-label="운영 작업">
        <Card className="overflow-hidden xl:col-span-7">
          <CardHeader className="border-b px-6 py-5">
            <CardTitle className="text-base">바로 처리할 작업</CardTitle>
            <CardDescription>
              자주 사용하는 운영 업무로 이동합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {quickLinks.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex min-h-20 items-center gap-4 px-6 py-4 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600"
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-zinc-900">
                    {label}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-zinc-500">
                    {description}
                  </span>
                </span>
                <ArrowUpRight
                  className="size-4 shrink-0 text-zinc-400 group-hover:text-zinc-700"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden xl:col-span-5">
          <CardHeader className="flex-row items-start justify-between gap-4 border-b px-6 py-5">
            <div>
              <CardTitle className="text-base">최근 활동</CardTitle>
              <CardDescription className="mt-1">
                {isMadeInLemon ? "관리자 변경 기록" : "최근 고객 문의"}
              </CardDescription>
            </div>
            <Clock3
              className="mt-0.5 size-4 text-zinc-400"
              aria-hidden="true"
            />
          </CardHeader>
          {activeActivity ? (
            <CardContent
              className="flex min-h-64 flex-col justify-between p-6"
              aria-live="polite"
            >
              <div>
                {"action" in activeActivity ? (
                  <Badge
                    variant={
                      activeActivity.action === "DELETE"
                        ? "destructive"
                        : "neutral"
                    }
                  >
                    {activeActivity.targetType}
                  </Badge>
                ) : (
                  <InquiryStatusBadge status={activeActivity.status} />
                )}
                <p className="mt-5 text-lg font-semibold leading-7 tracking-tight text-zinc-900">
                  {"action" in activeActivity
                    ? `${activeActivity.adminName} 관리자가 ${activeActivity.action} 작업을 수행했습니다.`
                    : activeActivity.title}
                </p>
                <p className="mt-3 text-sm text-zinc-500">
                  {formatDateTime(activeActivity.createdAt)}
                </p>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <p className="text-xs tabular-nums text-zinc-500">
                  {normalizedActivityIndex + 1} / {activities.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={activities.length <= 1}
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
                    disabled={activities.length <= 1}
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
            </CardContent>
          ) : (
            <CardContent className="flex min-h-64 items-center justify-center px-6 py-12 text-center text-sm text-zinc-500">
              표시할 최근 활동이 없습니다.
            </CardContent>
          )}
        </Card>
      </section>
    </div>
  );
}
