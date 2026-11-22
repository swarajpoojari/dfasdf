import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-px text-2xs font-semibold uppercase tracking-wide whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-border-strong bg-surface-2 text-muted-foreground",
        accent: "border-accent/30 bg-accent-muted text-accent",
        positive: "border-positive/30 bg-positive-muted text-positive",
        negative: "border-negative/30 bg-negative-muted text-negative",
        warning: "border-warning/30 bg-warning-muted text-warning",
        info: "border-info/30 bg-info-muted text-info",
        fixture: "border-data-fixture/40 bg-data-fixture-muted text-data-fixture",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />;
}
