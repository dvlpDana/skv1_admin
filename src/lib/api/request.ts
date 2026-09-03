import type { NextRequest } from "next/server";
import { ADMIN_API_MAX_BODY_BYTES } from "@/lib/auth/constants";

export class RequestBodyError extends Error {
  constructor(
    public readonly status: 400 | 413 | 415,
    message: string,
  ) {
    super(message);
    this.name = "RequestBodyError";
  }
}

export async function readJsonRequestBody(
  request: NextRequest,
): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new RequestBodyError(415, "JSON 요청만 허용됩니다.");
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > ADMIN_API_MAX_BODY_BYTES
  ) {
    throw new RequestBodyError(413, "요청 본문이 너무 큽니다.");
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > ADMIN_API_MAX_BODY_BYTES) {
    throw new RequestBodyError(413, "요청 본문이 너무 큽니다.");
  }

  if (!body.trim()) {
    throw new RequestBodyError(400, "요청 본문이 필요합니다.");
  }

  try {
    JSON.parse(body);
  } catch {
    throw new RequestBodyError(400, "올바른 JSON 형식이 아닙니다.");
  }

  return body;
}
