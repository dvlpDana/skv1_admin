import { Badge } from "@/components/ui/badge";
import type { InquiryStatus } from "@/types/admin";

const statusConfig: Record<
  InquiryStatus,
  { label: string; variant: "warning" | "success" }
> = {
  PENDING: { label: "답변 대기", variant: "warning" },
  ANSWERED: { label: "답변 완료", variant: "success" },
};

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
