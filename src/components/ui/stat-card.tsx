import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardTone = "neutral" | "warning" | "info" | "success";

const toneStyles: Record<
  StatCardTone,
  { icon: string; value: string; border: string }
> = {
  neutral: {
    icon: "bg-zinc-100 text-zinc-600",
    value: "text-zinc-950",
    border: "border-zinc-200",
  },
  warning: {
    icon: "bg-warning-soft text-warning-foreground",
    value: "text-warning-foreground",
    border: "border-warning-border",
  },
  info: {
    icon: "bg-info-soft text-info-foreground",
    value: "text-info-foreground",
    border: "border-info-border",
  },
  success: {
    icon: "bg-success-soft text-success-foreground",
    value: "text-success-foreground",
    border: "border-success-border",
  },
};

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  tone?: StatCardTone;
  className?: string;
}) {
  const styles = toneStyles[tone];

  return (
    <Card className={cn("p-5 sm:p-6", styles.border, className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-600">{label}</p>
          <p
            className={cn(
              "mt-3 text-3xl font-semibold tabular-nums tracking-tight",
              styles.value,
            )}
          >
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            styles.icon,
          )}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
      </div>
    </Card>
  );
}
