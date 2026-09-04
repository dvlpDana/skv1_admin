import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";
import {
  clearAdminSessionCookies,
  decryptAdminSession,
} from "@/lib/auth/session";

const MADE_IN_LEMON_ROUTES = ["/accounts", "/audit-logs"];

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  const response = NextResponse.redirect(loginUrl);
  clearAdminSessionCookies(response);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected =
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.includes(".");

  if (!isProtected) return NextResponse.next();

  try {
    const encryptedSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const session = await decryptAdminSession(encryptedSession);
    if (!session) return redirectToLogin(request);

    if (session.mustChangePassword && pathname !== "/settings/password") {
      return NextResponse.redirect(
        new URL("/settings/password?required=true", request.url),
      );
    }

    if (
      session.orgType !== "MADEINLEMON" &&
      MADE_IN_LEMON_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
      )
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    return redirectToLogin(request);
  }
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
