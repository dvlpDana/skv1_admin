import type { Metadata } from "next";
import { InquiryCategoriesManager } from "@/components/features/inquiry-categories-manager";
export const metadata: Metadata = { title: "문의 항목 관리" };
export default function InquiryCategoriesPage() {
  return <InquiryCategoriesManager />;
}
