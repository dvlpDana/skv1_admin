import { NextRequest, NextResponse } from "next/server";
import {
  matchAdminApiContract,
  validateContractBody,
  validateContractQuery,
} from "@/lib/api/contracts";
import { readJsonRequestBody, RequestBodyError } from "@/lib/api/request";
import {
  logServerEvent,
  noStoreHeaders,
  noStoreJson,
  normalizedUpstreamError,
  upstreamUnavailableResponse,
} from "@/lib/api/route-response";
import { fetchAdminUpstream, UpstreamRequestError } from "@/lib/api/upstream";
import {
  readUpstreamJson,
  UpstreamResponseError,
} from "@/lib/api/response";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";
import { assertSameOriginMutation, CsrfError } from "@/lib/auth/csrf";
import { adminAccountSchema } from "@/lib/auth/schemas";
import {
  clearAdminSessionCookies,
  decryptAdminSession,
  setAdminSessionCookie,
  type AdminSession,
} from "@/lib/auth/session";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PASSWORD_CHANGE_ALLOWED_CONTRACTS = new Set(["me", "change-password"]);
const MADE_IN_LEMON_CONTRACTS = new Set(["accounts", "account-active", "account-reset-password", "audit-logs"]);

function hasUnexpectedBody(request: NextRequest): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  return contentLength > 0 || request.headers.has("transfer-encoding");
}

async function resolvePasswordRequirement(
  session: AdminSession,
): Promise<"REQUIRED" | "NOT_REQUIRED" | "UNAUTHENTICATED" | "UNKNOWN"> {
  try {
    const response = await fetchAdminUpstream("admin/me", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (response.status === 401) return "UNAUTHENTICATED";
    if (!response.ok) return "UNKNOWN";

    const admin = adminAccountSchema.safeParse(await readUpstreamJson(response));
    if (!admin.success || !admin.data.active) return "UNAUTHENTICATED";
    return admin.data.mustChangePassword ? "REQUIRED" : "NOT_REQUIRED";
  } catch {
    return "UNKNOWN";
  }
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const requestId = crypto.randomUUID();
  const startedAt = performance.now();
  const pathSegments = (await context.params).path;
  const path = pathSegments.join("/");

  const finish = (response: NextResponse) => {
    response.headers.set("X-Request-Id", requestId);
    logServerEvent({
      requestId,
      route: path || "unknown",
      method: request.method,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return response;
  };

  try {
    const rawPath = request.url.split("?", 1)[0];
    if (/%2f|%5c|%2e/i.test(rawPath)) {
      return finish(
        noStoreJson(
          { message: "허용되지 않은 관리자 API 경로입니다.", requestId },
          { status: 404 },
        ),
      );
    }

    const match = matchAdminApiContract(path, request.method);
    if (!match.ok) {
      return finish(
        noStoreJson(
          {
            message:
              match.status === 405
                ? "허용되지 않은 요청 방식입니다."
                : "허용되지 않은 관리자 API 경로입니다.",
            requestId,
          },
          {
            status: match.status,
            headers: match.allowedMethods
              ? { Allow: match.allowedMethods.join(", ") }
              : undefined,
          },
        ),
      );
    }

    if (!validateContractQuery(request.nextUrl.searchParams, match.contract)) {
      return finish(
        noStoreJson(
          { message: "허용되지 않은 쿼리 파라미터입니다.", requestId },
          { status: 400 },
        ),
      );
    }

    assertSameOriginMutation(request);

    const encryptedSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const session = await decryptAdminSession(encryptedSession);
    if (!session) {
      const response = noStoreJson(
        { message: "로그인이 필요합니다.", requestId },
        { status: 401 },
      );
      clearAdminSessionCookies(response);
      return finish(response);
    }

    if (
      session.mustChangePassword &&
      !PASSWORD_CHANGE_ALLOWED_CONTRACTS.has(match.contract.id)
    ) {
      return finish(
        noStoreJson(
          {
            code: "PASSWORD_CHANGE_REQUIRED",
            message: "비밀번호 변경이 필요합니다.",
            requestId,
          },
          { status: 403 },
        ),
      );
    }

    if (
      session.orgType !== "MADEINLEMON" &&
      MADE_IN_LEMON_CONTRACTS.has(match.contract.id)
    ) {
      return finish(
        noStoreJson(
          { message: "이 작업을 수행할 권한이 없습니다.", requestId },
          { status: 403 },
        ),
      );
    }

    let body: string | undefined;
    const isMutation = MUTATION_METHODS.has(request.method);
    if (
      isMutation &&
      match.contract.bodyMethods?.includes(
        request.method as "POST" | "PUT" | "PATCH" | "DELETE",
      )
    ) {
      const requestBody = await readJsonRequestBody(request);
      const validatedBody = validateContractBody(
        requestBody,
        match.contract,
        request.method,
      );
      if (!validatedBody.ok) {
        return finish(
          noStoreJson(
            { message: "요청 내용을 다시 확인해 주세요.", requestId },
            { status: 400 },
          ),
        );
      }
      body = validatedBody.normalizedBody;
    } else if (isMutation && hasUnexpectedBody(request)) {
      return finish(
        noStoreJson(
          { message: "이 요청에는 본문을 보낼 수 없습니다.", requestId },
          { status: 400 },
        ),
      );
    }

    const upstream = await fetchAdminUpstream(
      `admin/${path}`,
      {
        method: request.method,
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
          "X-Request-Id": requestId,
        },
        body,
      },
      request.nextUrl.search,
    );

    if (upstream.status >= 300 && upstream.status < 400) {
      return finish(
        noStoreJson(
          {
            message: "관리자 서버가 예상하지 못한 응답을 반환했습니다.",
            requestId,
          },
          { status: 502 },
        ),
      );
    }

    if (!upstream.ok) {
      if (upstream.status === 401) {
        const response = await normalizedUpstreamError(upstream, requestId);
        clearAdminSessionCookies(response);
        return finish(response);
      }

      if (
        upstream.status === 403 &&
        !PASSWORD_CHANGE_ALLOWED_CONTRACTS.has(match.contract.id)
      ) {
        const passwordRequirement = await resolvePasswordRequirement(session);
        if (passwordRequirement === "UNAUTHENTICATED") {
          const response = noStoreJson(
            { message: "로그인이 필요합니다.", requestId },
            { status: 401 },
          );
          clearAdminSessionCookies(response);
          return finish(response);
        }
        if (passwordRequirement === "REQUIRED") {
          const response = noStoreJson(
            {
              code: "PASSWORD_CHANGE_REQUIRED",
              message: "비밀번호 변경이 필요합니다.",
              requestId,
            },
            { status: 403 },
          );
          await setAdminSessionCookie(response, {
            ...session,
            mustChangePassword: true,
          });
          return finish(response);
        }
      }

      return finish(await normalizedUpstreamError(upstream, requestId));
    }

    if (upstream.status === 204) {
      return finish(
        new NextResponse(null, {
          status: 204,
          headers: noStoreHeaders,
        }),
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return finish(
        noStoreJson(
          {
            message: "관리자 서버 응답 형식을 확인하지 못했습니다.",
            requestId,
          },
          { status: 502 },
        ),
      );
    }

    const responseData = await readUpstreamJson(upstream);

    const response = noStoreJson(responseData, { status: upstream.status });
    if (match.contract.id === "change-password") {
      await setAdminSessionCookie(response, {
        ...session,
        mustChangePassword: false,
      });
    }
    return finish(response);
  } catch (error) {
    if (error instanceof CsrfError) {
      return finish(
        noStoreJson(
          { message: error.message, requestId },
          { status: 403 },
        ),
      );
    }
    if (error instanceof RequestBodyError) {
      return finish(
        noStoreJson(
          { message: error.message, requestId },
          { status: error.status },
        ),
      );
    }
    if (error instanceof UpstreamRequestError) {
      return finish(upstreamUnavailableResponse(error, requestId));
    }
    if (error instanceof UpstreamResponseError) {
      return finish(
        noStoreJson(
          {
            message: "관리자 서버 응답을 해석하지 못했습니다.",
            requestId,
          },
          { status: 502 },
        ),
      );
    }

    console.error("admin_api_unexpected_error", {
      requestId,
      route: path,
      method: request.method,
    });
    return finish(
      noStoreJson(
        { message: "요청을 처리하지 못했습니다.", requestId },
        { status: 500 },
      ),
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
