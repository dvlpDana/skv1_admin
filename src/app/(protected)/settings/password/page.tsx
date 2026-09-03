import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordSettings } from "@/components/features/password-settings";
export const metadata: Metadata = { title: "비밀번호 변경" };
export default function PasswordPage() {
  return (
    <Suspense>
      <PasswordSettings />
    </Suspense>
  );
}
