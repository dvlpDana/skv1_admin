import type { Metadata } from "next";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export const metadata: Metadata = { title: "대시보드" };
export default function DashboardPage() {
  return <DashboardOverview />;
}
