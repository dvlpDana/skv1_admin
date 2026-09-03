import type { Metadata } from "next";
import "@fontsource-variable/outfit";
import "./globals.css";
import { AppProviders } from "@/lib/api/query-provider";

export const metadata: Metadata = {
  title: { default: "SK V1 Admin", template: "%s | SK V1 Admin" },
  description: "SK V1 운영 관리자 페이지",
  icons: {
    icon: [{ url: "/favicon.ico", type: "image/x-icon" }],
    shortcut: "/favicon.ico",
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
