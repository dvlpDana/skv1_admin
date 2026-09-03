import type { Metadata } from "next";
import { InquiriesManager } from "@/components/features/inquiries-manager";
export const metadata: Metadata = { title: "1:1 문의" };
export default function InquiriesPage() {
  return <InquiriesManager />;
}
