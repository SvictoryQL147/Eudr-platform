"use client";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({ value, className, indicatorClassName }: { value: number; className?: string; indicatorClassName?: string }) {
  return (
    <ProgressPrimitive.Root className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)} value={value}>
      <ProgressPrimitive.Indicator
        className={cn("h-full bg-primary transition-transform duration-500", indicatorClassName)}
        style={{ transform: `translateX(-${100 - Math.max(0, Math.min(100, value))}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
