import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readJsonRequestBody, RequestBodyError } from "@/lib/api/request";
import {
  logServerEvent,
  noStoreJson,
  normalizedUpstreamError,
  upstreamUnavailableResponse,
} from "@/lib/api/route-response";
import { fetchAdminUpstream, UpstreamRequestError } from "@/lib/api/upstream";
import {
  readUpstreamJson,
  UpstreamResponseError,
} from "@/lib/api/response";
import { assertSameOriginMutation, CsrfError } from "@/lib/auth/csrf";
import { adminAccountSchema, adminLoginResponseSchema } from "@/lib/auth/schemas";
import {
  clearLegacyAdminCookies,
  createAdminSessionPayload,
  setAdminSessionCookie,
} from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(256),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = performance.now();
  let status = 500;

  const finish = (response: NextResponse) => {
    status = response.status;
    logServerEvent({
      requestId,
      route: "admin-login",
      method: request.method,
      status,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return response;
  };

  try {
    assertSameOriginMutation(request);
    const body = await readJsonRequestBody(request);
    const parsed = loginSchema.safeParse(JSON.parse(body));

    if (!parsed.success) {
      return finish(
        noStoreJson(
          { message: "이메일과 비밀번호를 확인해 주세요.", requestId },
          { status: 400 },
        ),
      );
    }

    const loginResponse = await fetchAdminUpstream("admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (!loginResponse.ok) {
      const response =
        loginResponse.status === 401
          ? noStoreJson(
              {
                message:
                  "이메일 또는 비밀번호가 올바르지 않거나 계정이 잠겼습니다.",
                requestId,
              },
              { status: 401 },
            )
          : await normalizedUpstreamError(loginResponse, requestId);
      clearLegacyAdminCookies(response);
      return finish(response);
    }

    const loginData = adminLoginResponseSchema.safeParse(
      await readUpstreamJson(loginResponse),
    );
    if (!loginData.success) {
      return finish(
        noStoreJson(
          { message: "로그인 응답을 확인하지 못했습니다.", requestId },
          { status: 502 },
        ),
      );
    }

    const meResponse = await fetchAdminUpstream("admin/me", {
      headers: { Authorization: `Bearer ${loginData.data.accessToken}` },
    });
    if (!meResponse.ok) {
      return finish(await normalizedUpstreamError(meResponse, requestId));
    }

    const admin = adminAccountSchema.safeParse(await readUpstreamJson(meResponse));
    if (!admin.success || !admin.data.active) {
      return finish(
        noStoreJson(
          { message: "관리자 계정 정보를 확인하지 못했습니다.", requestId },
          { status: 502 },
        ),
      );
    }

    const session = createAdminSessionPayload({
      accessToken: loginData.data.accessToken,
      accessTokenExpiresIn: loginData.data.accessTokenExpiresIn,
      adminId: admin.data.id,
      orgType: admin.data.orgType,
      mustChangePassword: admin.data.mustChangePassword,
    });
    const response = noStoreJson({ admin: admin.data, requestId });
    await setAdminSessionCookie(response, session);
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
          { message: "관리자 서버 응답을 확인하지 못했습니다.", requestId },
          { status: 502 },
        ),
      );
    }

    console.error("admin_login_unexpected_error", { requestId });
    return finish(
      noStoreJson(
        { message: "로그인 요청을 처리하지 못했습니다.", requestId },
        { status: 500 },
      ),
    );
  }
}
