import type { NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export class CsrfError extends Error {
  constructor(message = "요청 출처를 확인할 수 없습니다.") {
    super(message);
    this.name = "CsrfError";
  }
}

function configuredOrigins(): Set<string> {
  return new Set(
    (process.env.ADMIN_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => new URL(value).origin),
  );
}

export function assertSameOriginMutation(request: NextRequest): void {
  if (SAFE_METHODS.has(request.method)) return;

  const origin = request.headers.get("origin");
  if (!origin) throw new CsrfError();

  const allowedOrigins = configuredOrigins();
  allowedOrigins.add(request.nextUrl.origin);

  let normalizedOrigin: string;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    throw new CsrfError();
  }

  if (!allowedOrigins.has(normalizedOrigin)) throw new CsrfError();

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") throw new CsrfError();
}
