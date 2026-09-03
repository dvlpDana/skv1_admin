import ky, { HTTPError } from "ky";
import {
  broadcastAdminAuthEvent,
  redirectForAdminAuthEvent,
} from "@/lib/auth/client-events";

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

const client = ky.create({
  prefixUrl: "/api/admin",
  timeout: 30_000,
  retry: { limit: 0 },
  hooks: {
    beforeError: [
      async (error) => {
        const data = (await error.response
          .clone()
          .json()
          .catch(() => undefined)) as { message?: string } | undefined;
        return new AdminApiError(
          error.response.status,
          data?.message ?? "요청을 처리하지 못했습니다.",
          data,
        ) as unknown as HTTPError;
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (response.status === 401 && typeof window !== "undefined") {
          broadcastAdminAuthEvent("SESSION_EXPIRED");
          redirectForAdminAuthEvent("SESSION_EXPIRED");
        }
        if (response.status === 403 && typeof window !== "undefined") {
          const data = (await response
            .clone()
            .json()
            .catch(() => undefined)) as { code?: string } | undefined;
          if (data?.code === "PASSWORD_CHANGE_REQUIRED") {
            window.location.replace("/settings/password?required=true");
          }
        }
        return response;
      },
    ],
  },
});

function withSearchParams(
  path: string,
  params?: Record<string, string | number | undefined>,
) {
  if (!params) return path;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "")
      searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export const adminApi = {
  get: <T>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ) => client.get(withSearchParams(path, params)).json<T>(),
  post: <T>(path: string, body?: unknown) =>
    client.post(path, { json: body }).json<T>(),
  put: <T>(path: string, body?: unknown) =>
    client.put(path, { json: body }).json<T>(),
  patch: <T>(path: string, body?: unknown) =>
    client.patch(path, { json: body }).json<T>(),
  delete: <T>(path: string) => client.delete(path).json<T>(),
};

export function pageItems<T>(data: T[] | { content?: T[] } | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : (data.content ?? []);
}

export async function uploadToPresignedUrl(url: string, file: File) {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) throw new Error(`${file.name} 업로드에 실패했습니다.`);
}
