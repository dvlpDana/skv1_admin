"use client";

import { Bars3Icon } from "@heroicons/react/24/outline";
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { ComponentType, SVGProps } from "react";
import type { AdminAccount } from "@/types/admin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminProvider } from "@/components/auth/admin-context";
import {
  broadcastAdminAuthEvent,
  redirectForAdminAuthEvent,
} from "@/lib/auth/client-events";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  madeInLemonOnly?: boolean;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "대시보드",
    icon: Squares2X2Icon,
  },
  {
    href: "/faqs",
    label: "FAQ 관리",
    icon: QuestionMarkCircleIcon,
  },
  {
    href: "/notices",
    label: "공지사항",
    icon: DocumentTextIcon,
  },
  {
    href: "/inquiries",
    label: "1:1 문의",
    icon: ChatBubbleLeftRightIcon,
  },
  {
    href: "/inquiry-categories",
    label: "문의 항목 관리",
    icon: Cog6ToothIcon,
  },
  {
    href: "/accounts",
    label: "관리자 계정",
    icon: UserGroupIcon,
    madeInLemonOnly: true,
  },
  {
    href: "/audit-logs",
    label: "관리 작업 기록",
    icon: ClipboardDocumentListIcon,
    madeInLemonOnly: true,
  },
];

type ShellHeaderContent = {
  title: string;
  description?: string;
};

const shellHeaders: Record<string, ShellHeaderContent> = {
  "/dashboard": {
    title: "대시보드",
  },
  "/faqs": {
    title: "FAQ 관리",
    description: "고객에게 공개되는 FAQ를 등록하고 노출 순서를 관리합니다.",
  },
  "/notices": {
    title: "공지사항",
    description: "고객에게 공개할 공지사항을 작성하고 관리합니다.",
  },
  "/inquiries": {
    title: "1:1 문의",
    description: "고객 문의를 확인하고 답변을 등록·수정합니다.",
  },
  "/inquiry-categories": {
    title: "문의 항목 관리",
    description: "고객이 선택하는 문의 항목과 표시 순서를 관리합니다.",
  },
  "/accounts": {
    title: "관리자 계정",
    description: "관리자 계정을 생성하고 이용 상태를 관리합니다.",
  },
  "/audit-logs": {
    title: "관리 작업 기록",
    description: "관리자별 작업 내용과 처리 시각을 최신순으로 확인합니다.",
  },
  "/settings/password": {
    title: "비밀번호 변경",
    description: "현재 계정의 로그인 비밀번호를 변경합니다.",
  },
};

function getShellHeader(pathname: string): ShellHeaderContent {
  const matchedPath = Object.keys(shellHeaders).find(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const header = matchedPath
    ? shellHeaders[matchedPath]
    : shellHeaders["/dashboard"];

  return header;
}

function Navigation({
  admin,
  onNavigate,
}: {
  admin: AdminAccount;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const visibleItems = navItems.filter(
    (item) => !item.madeInLemonOnly || admin.orgType === "MADEINLEMON",
  );

  return (
    <nav
      className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-10"
      aria-label="관리자 메뉴"
    >
      <div className="space-y-3">
        {visibleItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-12 items-center gap-2 overflow-hidden rounded-md py-3 pl-5 pr-3 text-base font-semibold leading-none transition-colors before:absolute before:inset-y-[-1px] before:left-[-1px] before:w-2 before:rounded-r-md before:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2",
                active
                  ? "border border-zinc-200 bg-white font-bold text-zinc-950 shadow-[0_2px_8px_rgba(0,0,0,0.04)] before:bg-gradient-to-b before:from-primary/45 before:via-primary before:to-primary-hover"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
              )}
            >
              <Icon
                className={cn(
                  "size-5 shrink-0",
                  active
                    ? "text-primary"
                    : "text-zinc-400 group-hover:text-zinc-700",
                )}
              />
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SidebarContent({
  admin,
  onNavigate,
}: {
  admin: AdminAccount;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col border-r bg-zinc-50/80 shadow-[4px_0_12px_rgba(24,24,27,0.02)] backdrop-blur-md">
      <div className="flex shrink-0 items-center px-10 pt-10">
        <Image
          src="/svg/logo_skv1.svg"
          alt="SK V1 Motors"
          width={138}
          height={34}
          priority
        />
      </div>
      <Navigation admin={admin} onNavigate={onNavigate} />
      <footer className="shrink-0 px-5 pb-8 text-center text-[10px] leading-none text-zinc-400">
        Copyright © Madeinlemon. All Rights Reserved.
      </footer>
    </div>
  );
}

export function AdminShell({
  admin,
  children,
}: {
  admin: AdminAccount;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const shellHeader = getShellHeader(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        toast.error("로그아웃하지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      broadcastAdminAuthEvent("LOGOUT");
      redirectForAdminAuthEvent("LOGOUT");
    } catch {
      toast.error("로그아웃 서버에 연결할 수 없습니다. 다시 시도해 주세요.");
    }
  }
  return (
    <AdminProvider admin={admin}>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] lg:block">
          <SidebarContent admin={admin} />
        </aside>
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogContent className="left-0 top-0 h-screen w-[min(88vw,280px)] max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0">
            <DialogTitle className="sr-only">관리자 메뉴</DialogTitle>
            <SidebarContent
              admin={admin}
              onNavigate={() => setMobileOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <div className="min-h-screen bg-white lg:pl-[280px]">
          <header className="sticky top-0 z-20 border-b bg-white">
            <div className="mx-auto flex min-h-20 w-full max-w-[1600px] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="메뉴 열기"
              >
                <Bars3Icon className="size-6" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-row flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h1 className="shrink-0 text-xl font-bold tracking-[-0.03em] text-zinc-950 sm:text-2xl">
                    {shellHeader.title}
                  </h1>
                  {shellHeader.description && (
                    <p className="min-w-0 text-sm leading-5 text-zinc-500 sm:text-base sm:leading-6">
                      {shellHeader.description}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-11 gap-3 px-2">
                    <span className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                      {admin.name.slice(0, 1)}
                    </span>
                    <span className="hidden text-left sm:block">
                      <span className="block text-sm font-semibold leading-4 text-zinc-900">
                        {admin.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium text-zinc-400">
                        {admin.orgType}
                      </span>
                    </span>
                    <ChevronDown className="size-4 text-zinc-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-zinc-900">
                      {admin.email}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {admin.authMethod}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => router.push("/settings/password")}
                  >
                    <Settings />
                    비밀번호 변경
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-variant="destructive"
                    onSelect={logout}
                  >
                    <LogOut />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
            {children}
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}
