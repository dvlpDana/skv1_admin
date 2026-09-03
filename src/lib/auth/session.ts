import "server-only";

import { EncryptJWT, jwtDecrypt } from "jose";
import type { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_SESSION_CLOCK_TOLERANCE_SECONDS,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  LEGACY_ADMIN_ACCESS_TOKEN_COOKIE,
  LEGACY_ADMIN_PASSWORD_CHANGE_COOKIE,
} from "@/lib/auth/constants";
import { getSessionSecret } from "@/lib/auth/env";
import type { OrgType } from "@/types/admin";

const sessionSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.number().int().positive(),
  adminId: z.number().int().positive(),
  orgType: z.enum(["SKV1", "MADEINLEMON"]),
  mustChangePassword: z.boolean(),
});

export type AdminSession = z.infer<typeof sessionSchema>;

let encryptionKeyPromise: Promise<Uint8Array> | undefined;

async function getEncryptionKey(): Promise<Uint8Array> {
  if (!encryptionKeyPromise) {
    const secret = getSessionSecret();
    encryptionKeyPromise = crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(secret))
      .then((buffer) => new Uint8Array(buffer));
  }

  return encryptionKeyPromise;
}

export function normalizeAccessTokenTtl(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Invalid access token expiration.");
  }

  return Math.min(Math.floor(parsed), ADMIN_SESSION_MAX_AGE_SECONDS);
}

export function createAdminSessionPayload(input: {
  accessToken: string;
  accessTokenExpiresIn: unknown;
  adminId: number;
  orgType: OrgType;
  mustChangePassword: boolean;
}): AdminSession {
  const ttlSeconds = normalizeAccessTokenTtl(input.accessTokenExpiresIn);

  return sessionSchema.parse({
    accessToken: input.accessToken,
    expiresAt: Date.now() + ttlSeconds * 1000,
    adminId: input.adminId,
    orgType: input.orgType,
    mustChangePassword: input.mustChangePassword,
  });
}

export async function encryptAdminSession(
  session: AdminSession,
): Promise<string> {
  const key = await getEncryptionKey();

  return new EncryptJWT(session)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(session.expiresAt / 1000))
    .encrypt(key);
}

export async function decryptAdminSession(
  encryptedSession: string | undefined,
): Promise<AdminSession | null> {
  if (!encryptedSession) return null;

  const key = await getEncryptionKey();

  try {
    const { payload } = await jwtDecrypt(encryptedSession, key, {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
      clockTolerance: ADMIN_SESSION_CLOCK_TOLERANCE_SECONDS,
    });
    const session = sessionSchema.safeParse(payload);

    if (!session.success || session.data.expiresAt <= Date.now()) {
      return null;
    }

    return session.data;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
    priority: "high" as const,
  };
}

export async function setAdminSessionCookie(
  response: NextResponse,
  session: AdminSession,
): Promise<void> {
  const encryptedSession = await encryptAdminSession(session);
  const remainingSeconds = Math.max(
    1,
    Math.min(
      Math.floor((session.expiresAt - Date.now()) / 1000),
      ADMIN_SESSION_MAX_AGE_SECONDS,
    ),
  );

  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    encryptedSession,
    cookieOptions(remainingSeconds),
  );
  clearLegacyAdminCookies(response);
}

export function clearLegacyAdminCookies(response: NextResponse): void {
  response.cookies.delete(LEGACY_ADMIN_ACCESS_TOKEN_COOKIE);
  response.cookies.delete(LEGACY_ADMIN_PASSWORD_CHANGE_COOKIE);
}

export function clearAdminSessionCookies(response: NextResponse): void {
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  clearLegacyAdminCookies(response);
}
