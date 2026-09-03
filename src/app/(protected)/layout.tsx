import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { AdminServiceUnavailable } from "@/components/auth/admin-service-unavailable";
import {
  getCurrentAdmin,
  isAdminAuthError,
} from "@/lib/auth/dal";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const admin = await getCurrentAdmin();
    return <AdminShell admin={admin}>{children}</AdminShell>;
  } catch (error) {
    if (isAdminAuthError(error) && error.code === "UNAUTHENTICATED") {
      redirect("/login?reason=session-expired");
    }
    if (isAdminAuthError(error) && error.code === "UPSTREAM_UNAVAILABLE") {
      return <AdminServiceUnavailable />;
    }
    throw error;
  }
}
