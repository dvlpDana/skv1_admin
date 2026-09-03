import { NextResponse } from "next/server";
import { UpstreamRequestError } from "@/lib/api/upstream";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

export function noStoreJson(
  body: unknown,
  init: { status?: number; headers?: HeadersInit } = {},
): NextResponse {
  return NextResponse.json(body, {
    status: init.status,
    headers: { ...NO_STORE_HEADERS, ...init.headers },
  });
}

export function upstreamUnavailableResponse(
  error: unknown,
  requestId: string,
): NextResponse {
  const timedOut =
    error instanceof UpstreamRequestError && error.kind === "TIMEOUT";
  return noStoreJson(
    {
      message: timedOut
        ? "관리자 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요."
        : "관리자 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
      requestId,
    },
    { status: timedOut ? 504 : 502 },
  );
}

export async function normalizedUpstreamError(
  response: Response,
  requestId: string,
): Promise<NextResponse> {
  const status = response.status;
  const messages: Record<number, string> = {
    400: "요청 값을 확인해주세요.",
    401: "로그인이 필요합니다.",
    403: "이 작업을 수행할 권한이 없습니다.",
    404: "요청한 데이터를 찾을 수 없습니다.",
    409: "현재 상태에서는 요청을 처리할 수 없습니다.",
    422: "입력한 내용을 처리할 수 없습니다.",
  };

  return noStoreJson(
    {
      message:
        messages[status] ??
        (status >= 500
          ? "관리자 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
          : "요청을 처리하지 못했습니다."),
      requestId,
    },
    { status },
  );
}

export function logServerEvent(input: {
  requestId: string;
  route: string;
  method: string;
  status: number;
  durationMs: number;
}): void {
  const level = input.status >= 500 ? "error" : "info";
  console[level]("admin_api_request", input);
}

export const noStoreHeaders = NO_STORE_HEADERS;
