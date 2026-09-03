import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountsManager } from "@/components/features/accounts-manager";
import {
  isAdminAuthError,
  requireMadeInLemonAdmin,
} from "@/lib/auth/dal";

export const metadata: Metadata = { title: "관리자 계정" };

export default async function AccountsPage() {
  try {
    await requireMadeInLemonAdmin();
    return <AccountsManager />;
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
