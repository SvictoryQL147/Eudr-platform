import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-secondary-foreground ring-border",
        green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
        red: "bg-red-50 text-red-700 ring-red-200",
        amber: "bg-amber-50 text-amber-800 ring-amber-200",
        orange: "bg-orange-50 text-orange-800 ring-orange-200",
        blue: "bg-sky-50 text-sky-800 ring-sky-200",
        violet: "bg-violet-50 text-violet-800 ring-violet-200",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
