import "server-only";

const MINIMUM_SESSION_SECRET_LENGTH = 32;

export function getAdminApiBaseUrl(): URL {
  const value = process.env.NEXT_PUBLIC_API_URL;

  if (!value) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_API_URL must be a valid absolute URL.");
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("NEXT_PUBLIC_API_URL must use http or https.");
  }

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_API_URL must use https in production.");
  }

  return new URL(url.href.endsWith("/") ? url.href : `${url.href}/`);
}

export function getSessionSecret(): string {
  const value = process.env.SESSION_SECRET;

  if (!value || value.length < MINIMUM_SESSION_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must contain at least ${MINIMUM_SESSION_SECRET_LENGTH} characters.`,
    );
  }

  return value;
}
