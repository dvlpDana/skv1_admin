"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAdmin } from "@/components/auth/admin-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/api/client";

const schema = z
  .object({
    currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요."),
    newPassword: z.string().min(8, "새 비밀번호는 8자 이상이어야 합니다."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "새 비밀번호가 일치하지 않습니다.",
  });
type Values = z.infer<typeof schema>;

export function PasswordSettings() {
  const admin = useAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const required =
    searchParams.get("required") === "true" || admin.mustChangePassword;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  async function onSubmit(values: Values) {
    try {
      await adminApi.put<{ result: string }>("me/password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("비밀번호를 변경했습니다.");
      reset();
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "비밀번호를 변경하지 못했습니다.",
      );
    }
  }
  if (admin.authMethod === "SOCIAL")
    return (
      <div className="space-y-7">
        <Card className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <ShieldCheck className="size-10 text-zinc-400" />
          <h2 className="mt-4 font-semibold">소셜 로그인 계정입니다</h2>
          <p className="mt-2 text-sm text-zinc-500">
            소셜 관리자 계정은 비밀번호를 변경할 수 없습니다.
          </p>
        </Card>
      </div>
    );
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      {required && (
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4 text-sm leading-6 text-warning-foreground">
          <strong>최초 로그인 보안 절차</strong>
          <br />
          비밀번호 변경을 완료하면 모든 관리자 기능을 사용할 수 있습니다.
        </div>
      )}
      <Card className="p-6 sm:p-8">
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="current-password">현재 비밀번호</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-xs text-destructive-foreground">
                {errors.currentPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">새 비밀번호</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-xs text-destructive-foreground">
                {errors.newPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive-foreground">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-zinc-50 p-4">
            <ul className="space-y-2 text-xs text-zinc-500">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-success" />
                8자 이상의 비밀번호를 사용하세요.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-success" />
                이전 비밀번호와 다른 값을 권장합니다.
              </li>
            </ul>
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <KeyRound />
            )}
            비밀번호 변경
          </Button>
        </form>
      </Card>
    </div>
  );
}
