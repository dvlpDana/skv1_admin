"use client";

import { AlertTriangle, LogOut, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AdminServiceUnavailable() {
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      window.location.replace("/login");
    } catch {
      setLoggingOut(false);
      toast.error("로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-lg text-center">
        <Image
          src="/svg/logo_skv1.svg"
          alt="SK V1 Motors"
          width={148}
          height={34}
          className="mx-auto"
          priority
        />
        <span className="mx-auto mt-12 flex size-14 items-center justify-center rounded-full bg-warning-soft text-warning-foreground">
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950">
          관리자 정보를 불러오지 못했습니다
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          일시적인 서버 문제일 수 있습니다. 잠시 후 다시 시도해 주세요. 반복되면
          관리자에게 문의해 주세요.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={() => window.location.reload()}>
            <RotateCcw />
            다시 시도
          </Button>
          <Button variant="outline" disabled={loggingOut} onClick={logout}>
            <LogOut />
            다른 계정으로 로그인
          </Button>
        </div>
      </div>
    </main>
  );
}
