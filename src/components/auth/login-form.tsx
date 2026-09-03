"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CircleUserRound,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSafeInternalRedirect } from "@/lib/auth/redirect";

const schema = z.object({
  email: z.string().email("올바른 이메일을 입력해 주세요."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});
type Values = z.infer<typeof schema>;
type HelpTopic = "account" | "credentials";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [helpTopic, setHelpTopic] = useState<HelpTopic | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        admin?: { mustChangePassword?: boolean };
      };
      if (!response.ok) {
        toast.error(data.message ?? "로그인에 실패했습니다.");
        return;
      }
      toast.success("로그인되었습니다.");
      router.replace(
        data.admin?.mustChangePassword
          ? "/settings/password?required=true"
          : getSafeInternalRedirect(searchParams.get("next")),
      );
      router.refresh();
    } catch {
      toast.error(
        "로그인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      {searchParams.get("reason") === "session-expired" && (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          로그인 시간이 만료되었습니다. 다시 로그인해 주세요.
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">아이디</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="skv1@example.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">비밀번호</Label>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="*********"
            className="pr-11"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-900"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>
      <Button
        type="submit"
        size="lg"
        className="group w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="animate-spin" />
            로그인 중
          </>
        ) : (
          "로그인"
        )}
      </Button>
      <div className="space-y-2 border-t pt-5 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500">관리자 계정이 없나요?</span>
          <Button
            type="button"
            variant="link"
            className="h-auto shrink-0 px-0 py-1"
            onClick={() => setHelpTopic("account")}
          >
            계정 신청 안내
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500">로그인 정보가 기억나지 않나요?</span>
          <Button
            type="button"
            variant="link"
            className="h-auto shrink-0 px-0 py-1"
            onClick={() => setHelpTopic("credentials")}
          >
            아이디·비밀번호 찾기 안내
          </Button>
        </div>
        <Dialog
          open={helpTopic !== null}
          onOpenChange={(open) => {
            if (!open) setHelpTopic(null);
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {helpTopic === "account"
                  ? "관리자 계정 신청 안내"
                  : "아이디·비밀번호 찾기 안내"}
              </DialogTitle>
              <DialogDescription>
                보안을 위해 계정과 로그인 정보는 메이드인레몬 관리자가
                확인합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {helpTopic === "account" ? (
                <div className="flex gap-3 rounded-lg border bg-zinc-50 p-4">
                  <CircleUserRound className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      직접 회원가입하지 않아도 됩니다
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      이 페이지는 승인된 관리자만 이용할 수 있어 직접 가입하는
                      기능을 제공하지 않습니다. 메이드인레몬 관리자에게 새 계정
                      생성을 요청해 주세요.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-3 rounded-lg border bg-zinc-50 p-4">
                    <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        아이디를 잊었어요
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">
                        관리자 아이디는 계정에 등록된 이메일입니다. 등록
                        이메일이 기억나지 않으면 계정을 만든 관리자에게 확인을
                        요청해 주세요.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 rounded-lg border bg-zinc-50 p-4">
                    <KeyRound className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        비밀번호를 잊었어요
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">
                        메이드인레몬 관리자에게 비밀번호 초기화를 요청해 주세요.
                        전달받은 임시 비밀번호로 로그인한 뒤 새 비밀번호로
                        변경해야 합니다.
                      </p>
                    </div>
                  </div>
                </>
              )}
              <div className="rounded-lg bg-red-50 px-4 py-3 text-xs leading-5 text-red-800">
                계정 보안을 위해 이메일이나 임시 비밀번호는 화면에서 자동으로
                안내하지 않습니다.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </form>
  );
}
