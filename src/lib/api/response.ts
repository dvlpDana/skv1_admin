import "server-only";

import { ADMIN_API_MAX_RESPONSE_BYTES } from "@/lib/auth/constants";

export class UpstreamResponseError extends Error {
  constructor(public readonly kind: "INVALID_JSON" | "TOO_LARGE") {
    super(
      kind === "TOO_LARGE"
        ? "Upstream response exceeded the size limit."
        : "Upstream response was not valid JSON.",
    );
    this.name = "UpstreamResponseError";
  }
}

export async function readUpstreamJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > ADMIN_API_MAX_RESPONSE_BYTES
  ) {
    throw new UpstreamResponseError("TOO_LARGE");
  }

  if (!response.body) throw new UpstreamResponseError("INVALID_JSON");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;

    if (totalBytes > ADMIN_API_MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new UpstreamResponseError("TOO_LARGE");
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(combined));
  } catch {
    throw new UpstreamResponseError("INVALID_JSON");
  }
}
