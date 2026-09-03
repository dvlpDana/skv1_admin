import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "관리자 로그인" };

export default function LoginPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white">
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
          관리자만 이용할 수 있어요
        </div>
      </nav>
      <section className="grid min-h-screen lg:grid-cols-[1.12fr_0.88fr]">
        <div className="relative hidden min-h-screen overflow-hidden bg-zinc-950 lg:flex lg:flex-col lg:justify-end lg:px-12 lg:pb-16 xl:px-20 xl:pb-20">
          <Image
            src="/images/admin-hero.webp"
            alt="SK V1 showroom"
            fill
            priority
            className="object-cover opacity-70 grayscale contrast-125"
            sizes="60vw"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(184,15,10,0.15),transparent_35%),linear-gradient(180deg,rgba(9,9,11,0.08),rgba(9,9,11,0.95))]" />
          <div className="noise-overlay absolute inset-0 mix-blend-soft-light" />
          <div className="relative z-10 max-w-3xl text-white">
            <p className="mb-6 text-sm font-semibold tracking-[0.18em] text-white/60">
              SK V1 관리자 페이지
            </p>
            <h1 className="max-w-3xl text-[clamp(3rem,5vw,5.5rem)] font-semibold leading-[0.96] tracking-[-0.055em]">
              SK V1 운영 업무를
              <br />한 곳에서 관리하세요.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-white/65">
              FAQ와 공지사항, 고객 문의, 관리자 계정을 한눈에 확인하고 관리할 수
              있습니다.
            </p>
          </div>
        </div>
        <div className="admin-grid relative flex min-h-screen items-center justify-center px-6 py-28 lg:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,224,222,0.75),transparent_35%)]" />
          <div className="relative w-full max-w-md">
            <Image
              src="/svg/logo_skv1.svg"
              alt="SK V1 Motors"
              width={148}
              height={34}
              className="mb-12 lg:hidden"
              priority
            />
            <div className="mb-9">
              <p className="text-sm font-semibold text-primary">
                SK V1 관리자 페이지
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-zinc-950">
                관리 업무를 시작하세요.
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
