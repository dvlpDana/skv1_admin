import { NextRequest } from "next/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";
import { decryptAdminSession } from "@/lib/auth/session";
import { POST } from "./route";

const admin = {
  id: 7,
  email: "admin@example.com",
  name: "Admin",
  orgType: "MADEINLEMON",
  authMethod: "PASSWORD",
  active: true,
  mustChangePassword: false,
  createdAt: "2026-09-03T00:00:00",
};

function loginRequest(origin = "http://localhost:3001") {
  return new NextRequest("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
    },
    body: JSON.stringify({
      email: "ADMIN@example.com",
      password: "valid-password",
    }),
  });
}

beforeAll(() => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/";
  process.env.SESSION_SECRET =
    "test-only-session-secret-that-is-longer-than-thirty-two-characters";
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/auth/login", () => {
  it("sets an encrypted HttpOnly session after validating the account", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          accessToken: "backend-access-token",
          accessTokenExpiresIn: 28_800,
        }),
      )
      .mockResolvedValueOnce(Response.json(admin));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(loginRequest());
    const cookie = response.cookies.get(ADMIN_SESSION_COOKIE);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("strict");
    expect(cookie?.value).not.toContain("backend-access-token");
    await expect(decryptAdminSession(cookie?.value)).resolves.toMatchObject({
      adminId: admin.id,
      orgType: admin.orgType,
      mustChangePassword: false,
    });
  });

  it("does not disclose whether the account exists on a 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    const response = await POST(loginRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toContain("이메일 또는 비밀번호");
    expect(body.message).not.toContain("존재");
  });

  it("rejects cross-site requests before contacting the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(loginRequest("https://attacker.example"));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
