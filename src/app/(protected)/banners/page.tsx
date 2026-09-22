import type { Metadata } from "next";
import { BannersManager } from "@/components/features/banners-manager";

export const metadata: Metadata = { title: "광고 배너" };

export default function BannersPage() {
  return <BannersManager />;
}
