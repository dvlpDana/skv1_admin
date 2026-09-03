"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { ADMIN_AUTH_CHANNEL } from "@/lib/auth/constants";
import {
  redirectForAdminAuthEvent,
  type AdminAuthEvent,
} from "@/lib/auth/client-events";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
          mutations: { retry: 0 },
        },
      }),
  );

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel(ADMIN_AUTH_CHANNEL);
    channel.onmessage = (message: MessageEvent<AdminAuthEvent>) => {
      if (!["LOGOUT", "SESSION_EXPIRED"].includes(message.data)) return;
      queryClient.clear();
      redirectForAdminAuthEvent(message.data);
    };
    return () => channel.close();
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
