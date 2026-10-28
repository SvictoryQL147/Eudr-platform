"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { queryClient } from "@/lib/query";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="bottom-right" richColors closeButton toastOptions={{ className: "font-sans" }} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
