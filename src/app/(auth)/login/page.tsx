import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "관리자 로그인" };

export default function LoginPage() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-white">
      <nav className="absolute inset-x-0 top-0 z-20 hidden h-20 items-center justify-between px-12 lg:flex">
        <Image
          src="/svg/logo_skv1_white.svg"
          alt="SK V1 Motors"
          width={132}
          height={30}
          priority
        />
        <div className="flex items-center gap-2 text-sm font-medium text-white/75">
          <ShieldCheckIcon className="size-5" />
          관리자 전용 페이지입니다.
        </div>
      </nav>
      <section className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden min-h-dvh overflow-hidden bg-zinc-950 lg:flex lg:flex-col lg:justify-end lg:px-12 lg:pb-16 xl:px-20 xl:pb-20">
          <Image
            src="/images/admin-hero.webp"
            alt=""
            fill
            priority
            className="object-cover opacity-55 grayscale"
            sizes="55vw"
          />
          <div className="absolute inset-0 bg-zinc-950/65" />
          <div className="relative z-10 max-w-3xl text-white">
            <p className="mb-4 text-sm font-semibold text-white/65">
              SK V1 관리자 페이지
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.04em] xl:text-5xl">
              운영 현황과 고객 문의를
              <br />
              확인합니다.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/70">
              FAQ, 공지사항, 고객 문의와 관리자 계정을 관리합니다.
            </p>
          </div>
        </div>
        <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-6 py-20 lg:px-12">
          <div className="w-full max-w-md">
            <Image
              src="/svg/logo_skv1.svg"
              alt="SK V1 Motors"
              width={148}
              height={34}
              className="mb-10 lg:hidden"
              priority
            />
            <div className="mb-9">
              <p className="text-sm font-semibold text-zinc-500">
                SK V1 관리자 페이지
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-zinc-950">
                관리자 로그인
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                등록된 이메일과 비밀번호로 로그인해 주세요.
              </p>
            </div>
            <Suspense>
              <LoginForm />
            </Suspense>
            <p className="mt-8 text-xs leading-5 text-zinc-400">
              로그인에 5회 연속 실패하면 계정 보호를 위해 15분간 로그인이
              제한됩니다.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
