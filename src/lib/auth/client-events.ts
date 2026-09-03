"use client";

import { ADMIN_AUTH_CHANNEL } from "@/lib/auth/constants";

export type AdminAuthEvent = "LOGOUT" | "SESSION_EXPIRED";

let redirectInProgress = false;

export function broadcastAdminAuthEvent(event: AdminAuthEvent): void {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
  const channel = new BroadcastChannel(ADMIN_AUTH_CHANNEL);
  channel.postMessage(event);
  channel.close();
}

export function redirectForAdminAuthEvent(event: AdminAuthEvent): void {
  if (typeof window === "undefined" || redirectInProgress) return;
  redirectInProgress = true;
  const reason = event === "SESSION_EXPIRED" ? "?reason=session-expired" : "";
  window.location.replace(`/login${reason}`);
}
