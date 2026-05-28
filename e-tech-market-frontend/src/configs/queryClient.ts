import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiRequestError, notifyGlobalError } from '@/configs/api.config'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiRequestError && error.globalErrorNotified) return
      notifyGlobalError(error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tải dữ liệu.')
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error instanceof ApiRequestError && error.globalErrorNotified) return
      notifyGlobalError(error instanceof Error ? error.message : 'Thao tác không thành công.')
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: false,
      staleTime: 1000 * 60 * 2,
    },
  },
})
