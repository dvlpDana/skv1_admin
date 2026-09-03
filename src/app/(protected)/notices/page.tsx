import type { Metadata } from "next";
import { NoticesManager } from "@/components/features/notices-manager";
export const metadata: Metadata = { title: "공지사항" };
export default function NoticesPage() {
  return <NoticesManager />;
}
