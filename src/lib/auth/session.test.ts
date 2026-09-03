import { beforeAll, describe, expect, it } from "vitest";
import {
  createAdminSessionPayload,
  decryptAdminSession,
  encryptAdminSession,
  normalizeAccessTokenTtl,
  type AdminSession,
} from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET =
    "test-only-session-secret-that-is-longer-than-thirty-two-characters";
});

function session(overrides: Partial<AdminSession> = {}): AdminSession {
  return {
    accessToken: "backend-access-token",
    expiresAt: Date.now() + 60_000,
    adminId: 1,
    orgType: "MADEINLEMON",
    mustChangePassword: false,
    ...overrides,
  };
}

describe("admin session", () => {
  it("encrypts and decrypts a valid session without exposing the access token", async () => {
    const encrypted = await encryptAdminSession(session());

    expect(encrypted.split(".")).toHaveLength(5);
    expect(encrypted).not.toContain("backend-access-token");
    await expect(decryptAdminSession(encrypted)).resolves.toMatchObject({
      adminId: 1,
      orgType: "MADEINLEMON",
    });
  });

  it("rejects a tampered session", async () => {
    const encrypted = await encryptAdminSession(session());
    const tampered = `${encrypted.slice(0, -2)}aa`;
    await expect(decryptAdminSession(tampered)).resolves.toBeNull();
  });

  it("rejects an expired session", async () => {
    const encrypted = await encryptAdminSession(
      session({ expiresAt: Date.now() - 1_000 }),
    );
    await expect(decryptAdminSession(encrypted)).resolves.toBeNull();
  });

  it("clamps backend expiration to eight hours", () => {
    expect(normalizeAccessTokenTtl(60 * 60 * 24)).toBe(60 * 60 * 8);
  });

  it.each([undefined, null, 0, -1, "invalid"])(
    "rejects an invalid backend expiration: %s",
    (value) => {
      expect(() => normalizeAccessTokenTtl(value)).toThrow(
        "Invalid access token expiration",
      );
    },
  );

  it("creates a minimal validated session payload", () => {
    const payload = createAdminSessionPayload({
      accessToken: "token",
      accessTokenExpiresIn: "28800",
      adminId: 3,
      orgType: "SKV1",
      mustChangePassword: true,
    });
    expect(payload).toMatchObject({
      accessToken: "token",
      adminId: 3,
      orgType: "SKV1",
      mustChangePassword: true,
    });
  });
});
