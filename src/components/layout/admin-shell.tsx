"use client";

import { Bars3Icon } from "@heroicons/react/24/outline";
import {
  Activity,
  BookOpenText,
  ChevronDown,
  CircleHelp,
  FileClock,
  LayoutDashboard,
  LogOut,
  Settings,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
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
  icon: LucideIcon;
  madeInLemonOnly?: boolean;
};
const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "현황",
    items: [{ href: "/dashboard", label: "대시보드", icon: LayoutDashboard }],
  },
  {
    label: "콘텐츠 관리",
    items: [
      { href: "/faqs", label: "FAQ 관리", icon: CircleHelp },
      { href: "/notices", label: "공지사항", icon: BookOpenText },
    ],
  },
  {
    label: "고객 관리",
    items: [
      { href: "/inquiries", label: "1:1 문의", icon: Activity },
      { href: "/inquiry-categories", label: "문의 항목 관리", icon: Settings },
    ],
  },
  {
    label: "계정 및 기록",
    items: [
      {
        href: "/accounts",
        label: "관리자 계정",
        icon: UsersRound,
        madeInLemonOnly: true,
      },
      {
        href: "/audit-logs",
        label: "관리 작업 기록",
        icon: FileClock,
        madeInLemonOnly: true,
      },
    ],
  },
];

function Navigation({
  admin,
  onNavigate,
}: {
  admin: AdminAccount;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav
      className="flex flex-1 flex-col gap-6 px-3 py-5"
      aria-label="관리자 메뉴"
    >
      {navGroups.map((group) => {
        const items = group.items.filter(
          (item) => !item.madeInLemonOnly || admin.orgType === "MADEINLEMON",
        );
        if (!items.length) return null;
        return (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              {group.label}
            </p>
            <div className="space-y-1">
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
                      active
                        ? "bg-primary text-white shadow-[0_8px_22px_rgba(184,15,10,0.18)]"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-[18px]",
                        active
                          ? "text-white"
                          : "text-zinc-400 group-hover:text-zinc-700",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
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
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-20 items-center border-b px-6">
        <Image
          src="/svg/logo_skv1.svg"
          alt="SK V1 Motors"
          width={126}
          height={29}
          priority
        />
        <span className="ml-3 border-l pl-3 text-xs font-semibold tracking-[0.14em] text-zinc-400">
          ADMIN
        </span>
      </div>
      <Navigation admin={admin} onNavigate={onNavigate} />
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
      <div className="min-h-screen bg-[#f7f7f8]">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r lg:block">
          <SidebarContent admin={admin} />
        </aside>
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogContent className="left-0 top-0 h-screen w-[min(88vw,320px)] max-w-none translate-x-0 translate-y-0 rounded-none p-0">
            <DialogTitle className="sr-only">관리자 메뉴</DialogTitle>
            <SidebarContent
              admin={admin}
              onNavigate={() => setMobileOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 flex h-16 items-center border-b bg-white/92 px-4 backdrop-blur-xl sm:px-6 lg:h-20 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="메뉴 열기"
            >
              <Bars3Icon className="size-6" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="ml-auto h-11 gap-3 px-2">
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
                <DropdownMenuItem data-variant="destructive" onSelect={logout}>
                  <LogOut />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
            {children}
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}
