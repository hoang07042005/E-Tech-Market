import { useQuery, type QueryKey, type UseQueryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/configs/api.config'

export type UseApiQueryOptions<TData> = Omit<UseQueryOptions<TData, Error, TData, QueryKey>, 'queryKey' | 'queryFn'>

export function useApiQuery<TData>(queryKey: QueryKey, path: string, options?: UseApiQueryOptions<TData>) {
  return useQuery<TData>({
    queryKey,
    queryFn: () => apiFetch<TData>(path),
    ...options,
  })
}
