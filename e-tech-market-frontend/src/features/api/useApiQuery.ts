import { useQuery, type QueryKey, type UseQueryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/configs/api.config'

export type UseApiQueryOptions<TData> = Omit<UseQueryOptions<TData, Error, TData, QueryKey>, 'queryKey' | 'queryFn'> & {
  /** Pass extra fetch options forwarded to apiFetch (e.g. silent401: true) */
  fetchOptions?: RequestInit & { silent401?: boolean }
}

export function useApiQuery<TData>(queryKey: QueryKey, path: string, options?: UseApiQueryOptions<TData>) {
  const { fetchOptions, ...queryOptions } = options ?? {}
  return useQuery<TData>({
    queryKey,
    queryFn: () => apiFetch<TData>(path, fetchOptions),
    ...queryOptions,
  })
}
