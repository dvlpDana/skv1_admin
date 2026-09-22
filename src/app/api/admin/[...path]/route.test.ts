import { NextRequest } from "next/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";
import { encryptAdminSession, type AdminSession } from "@/lib/auth/session";
import { GET, POST, PUT } from "./route";

const routeContext = (path: string[]) => ({
  params: Promise.resolve({ path }),
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

async function request(
  path: string,
  options: { method?: string; session?: AdminSession; origin?: string } = {},
) {
  const headers = new Headers();
  if (options.session) {
    headers.set(
      "Cookie",
      `${ADMIN_SESSION_COOKIE}=${await encryptAdminSession(options.session)}`,
    );
  }
  if (options.origin) headers.set("Origin", options.origin);

  return new NextRequest(`http://localhost:3001/api/admin/${path}`, {
    method: options.method ?? "GET",
    headers,
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

describe("admin API proxy", () => {
  it("rejects unknown paths without contacting the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      await request("unknown", { session: session() }),
      routeContext(["unknown"]),
    );

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the cookie when the backend invalidates a session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    const response = await GET(
      await request("accounts", { session: session() }),
      routeContext(["accounts"]),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toContain(
      `${ADMIN_SESSION_COOKIE}=`,
    );
    expect(response.headers.get("set-cookie")).toMatch(
      /(?:Max-Age=0|Expires=Thu, 01 Jan 1970 00:00:00 GMT)/i,
    );
  });

  it("enforces organization permissions before contacting the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      await request("accounts", {
        session: session({ orgType: "SKV1" }),
      }),
      routeContext(["accounts"]),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only permits password endpoints for a forced-change session", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      await request("faqs", {
        session: session({ mustChangePassword: true }),
      }),
      routeContext(["faqs"]),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "PASSWORD_CHANGE_REQUIRED",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a cross-site mutation before session or body processing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await PUT(
      await request("me/password", {
        method: "PUT",
        session: session(),
        origin: "https://attacker.example",
      }),
      routeContext(["me", "password"]),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards a body-less banner upload URL request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        presignedUrl: "https://uploads.example.com/banner",
        key: "banners/image-key",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      await request("banners/1/creatives/ko/upload-url?assetType=IMAGE", {
        method: "POST",
        session: session(),
        origin: "http://localhost:3001",
      }),
      routeContext(["banners", "1", "creatives", "ko", "upload-url"]),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/admin/banners/1/creatives/ko/upload-url?assetType=IMAGE",
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: undefined,
    });
  });
});
