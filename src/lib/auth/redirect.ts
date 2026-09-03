const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

export function getSafeInternalRedirect(
  value: string | null | undefined,
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  let url: URL;
  try {
    url = new URL(value, "https://admin.skv1.local");
  } catch {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  if (
    url.origin !== "https://admin.skv1.local" ||
    url.pathname.startsWith("/api") ||
    url.pathname === "/login"
  ) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
