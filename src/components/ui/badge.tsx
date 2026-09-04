import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "border-zinc-200 bg-zinc-100 text-zinc-700",
        neutral: "border-zinc-200 bg-zinc-100 text-zinc-700",
        brand: "border-transparent bg-primary text-primary-foreground",
        outline: "bg-white text-zinc-700",
        success:
          "border-success-border bg-success-soft text-success-foreground",
        warning:
          "border-warning-border bg-warning-soft text-warning-foreground",
        info: "border-info-border bg-info-soft text-info-foreground",
        destructive:
          "border-destructive-border bg-destructive-soft text-destructive-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}
export { Badge, badgeVariants };
