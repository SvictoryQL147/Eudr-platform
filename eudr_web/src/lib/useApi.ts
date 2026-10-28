"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

/** GET an endpoint through TanStack Query (cached, deduplicated, refreshed
 * after any change). Same shape as before: { data, error, loading, reload }. */
export function useApi<T>(path: string | null, opts: { refetchInterval?: number | false } = {}) {
  const q = useQuery<T, Error>({
    queryKey: [path],
    queryFn: () => api<T>(path as string),
    enabled: !!path,
    refetchInterval: opts.refetchInterval,
  });
  return {
    data: (q.data ?? null) as T | null,
    error: q.error ? q.error.message : null,
    loading: q.isLoading,
    fetching: q.isFetching,
    reload: () => q.refetch(),
  };
}
