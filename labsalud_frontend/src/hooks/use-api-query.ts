import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import { useApi } from "@/hooks/use-api"
import { readApiError } from "@/lib/api-error"

/**
 * Wrapper sobre `useQuery` que usa `apiRequest` del hook `useApi` para preservar:
 * - manejo de Authorization (cookies con JWT)
 * - refresh automático del access token en 401
 * - timeout/abort
 *
 * Uso:
 *   const { data, isLoading, refetch } = useApiQuery<DashboardResponse>({
 *     queryKey: ["analytics", "dashboard"],
 *     url: ANALYTICS_ENDPOINTS.DASHBOARD,
 *   })
 */
export interface UseApiQueryParams<T> extends Omit<UseQueryOptions<T>, "queryFn"> {
  url: string
}

export function useApiQuery<T = unknown>({ url, ...options }: UseApiQueryParams<T>) {
  const { apiRequest } = useApi()

  return useQuery<T>({
    ...options,
    queryFn: async () => {
      const response = await apiRequest(url)
      if (!response.ok) {
        const message = await readApiError(response, `Error ${response.status}`)
        throw new Error(message)
      }
      return (await response.json()) as T
    },
  })
}
