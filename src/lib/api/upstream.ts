import "server-only";

import { ADMIN_API_TIMEOUT_MS } from "@/lib/auth/constants";
import { getAdminApiBaseUrl } from "@/lib/auth/env";

export type UpstreamFailureKind = "NETWORK" | "TIMEOUT";

export class UpstreamRequestError extends Error {
  constructor(public readonly kind: UpstreamFailureKind) {
    super(kind === "TIMEOUT" ? "Upstream request timed out." : "Upstream request failed.");
    this.name = "UpstreamRequestError";
  }
}

export function buildAdminApiUrl(path: string, search = ""): URL {
  if (path.startsWith("/") || path.includes("..") || path.includes("\\")) {
    throw new Error("Invalid upstream path.");
  }

  const url = new URL(path, getAdminApiBaseUrl());
  url.search = search;
  return url;
}

export async function fetchAdminUpstream(
  path: string,
  init: RequestInit = {},
  search = "",
): Promise<Response> {
  try {
    return await fetch(buildAdminApiUrl(path, search), {
      ...init,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(ADMIN_API_TIMEOUT_MS),
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      ["AbortError", "TimeoutError"].includes(error.name)
    ) {
      throw new UpstreamRequestError("TIMEOUT");
    }

    throw new UpstreamRequestError("NETWORK");
  }
}
