import { QueryClient } from "@tanstack/react-query";

/** One cache for the whole app. Data stays fresh for 30s, refetches when you
 * come back to the tab, and retries once on network blips. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (failures, error) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failures < 1;
      },
    },
  },
});
