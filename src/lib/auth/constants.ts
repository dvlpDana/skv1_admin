export const ADMIN_SESSION_COOKIE = "skv1_admin_session";
export const LEGACY_ADMIN_ACCESS_TOKEN_COOKIE = "skv1_admin_access_token";
export const LEGACY_ADMIN_PASSWORD_CHANGE_COOKIE =
  "skv1_admin_password_change_required";

export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
export const ADMIN_SESSION_CLOCK_TOLERANCE_SECONDS = 30;
export const ADMIN_API_TIMEOUT_MS = 15_000;
export const ADMIN_API_MAX_BODY_BYTES = 1024 * 1024;
export const ADMIN_API_MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
export const ADMIN_AUTH_CHANNEL = "skv1-admin-auth";
