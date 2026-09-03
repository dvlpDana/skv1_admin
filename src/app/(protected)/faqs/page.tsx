import type { Metadata } from "next";
import { FaqsManager } from "@/components/features/faqs-manager";
export const metadata: Metadata = { title: "FAQ 관리" };
export default function FaqsPage() {
  return <FaqsManager />;
}
