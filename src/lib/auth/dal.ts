import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";
import { decryptAdminSession, type AdminSession } from "@/lib/auth/session";
import { adminAccountSchema } from "@/lib/auth/schemas";
import { fetchAdminUpstream, UpstreamRequestError } from "@/lib/api/upstream";
import {
  readUpstreamJson,
  UpstreamResponseError,
} from "@/lib/api/response";
import type { AdminAccount } from "@/types/admin";

export type AdminAuthFailureCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "PASSWORD_CHANGE_REQUIRED"
  | "UPSTREAM_UNAVAILABLE";

export class AdminAuthError extends Error {
  constructor(public readonly code: AdminAuthFailureCode) {
    super(code);
    this.name = "AdminAuthError";
  }
}

export function isAdminAuthError(error: unknown): error is AdminAuthError {
  return error instanceof AdminAuthError;
}

export const verifySession = cache(async (): Promise<AdminSession> => {
  const cookieStore = await cookies();
  const encryptedSession = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await decryptAdminSession(encryptedSession);

  if (!session) throw new AdminAuthError("UNAUTHENTICATED");
  return session;
});

export const getCurrentAdmin = cache(async (): Promise<AdminAccount> => {
  const session = await verifySession();

  let response: Response;
  try {
    response = await fetchAdminUpstream("admin/me", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
  } catch (error) {
    if (error instanceof UpstreamRequestError) {
      throw new AdminAuthError("UPSTREAM_UNAVAILABLE");
    }
    throw error;
  }

  if (response.status === 401) {
    throw new AdminAuthError("UNAUTHENTICATED");
  }
  if (!response.ok) {
    throw new AdminAuthError(
      response.status === 403 ? "FORBIDDEN" : "UPSTREAM_UNAVAILABLE",
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new AdminAuthError("UPSTREAM_UNAVAILABLE");
  }

  let responseData: unknown;
  try {
    responseData = await readUpstreamJson(response);
  } catch (error) {
    if (error instanceof UpstreamResponseError) {
      throw new AdminAuthError("UPSTREAM_UNAVAILABLE");
    }
    throw error;
  }

  const parsed = adminAccountSchema.safeParse(responseData);
  if (!parsed.success || !parsed.data.active) {
    throw new AdminAuthError("UNAUTHENTICATED");
  }

  return parsed.data;
});

export async function requirePasswordChanged(): Promise<AdminAccount> {
  const admin = await getCurrentAdmin();
  if (admin.mustChangePassword) {
    throw new AdminAuthError("PASSWORD_CHANGE_REQUIRED");
  }
  return admin;
}

export async function requireMadeInLemonAdmin(): Promise<AdminAccount> {
  const admin = await requirePasswordChanged();
  if (admin.orgType !== "MADEINLEMON") {
    throw new AdminAuthError("FORBIDDEN");
  }
  return admin;
}
