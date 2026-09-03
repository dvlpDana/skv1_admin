import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuditLogsView } from "@/components/features/audit-logs-view";
import {
  isAdminAuthError,
  requireMadeInLemonAdmin,
} from "@/lib/auth/dal";

export const metadata: Metadata = { title: "관리 작업 기록" };

export default async function AuditLogsPage() {
  try {
    await requireMadeInLemonAdmin();
    return <AuditLogsView />;
  } catch (error) {
    if (isAdminAuthError(error)) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login?reason=session-expired");
      }
      if (error.code === "PASSWORD_CHANGE_REQUIRED") {
        redirect("/settings/password?required=true");
      }
      if (error.code === "FORBIDDEN") redirect("/dashboard");
    }
    throw error;
  }
}
