import { CATALOG_ENDPOINTS } from "@/config/api"
import { useApiQuery } from "@/hooks/use-api-query"
import type { NBU } from "@/types"

type NbuResponse = { results?: NBU[] } | NBU[]

const getNbusFromResponse = (data?: NbuResponse): NBU[] => {
  if (!data) return []
  return Array.isArray(data) ? data : data.results || []
}

export const getNbuDisplayName = (nbu?: NBU | { id: number; name: string } | number | string | null, nbus: NBU[] = []) => {
  if (!nbu) return "NBU principal"
  if (typeof nbu === "object") return nbu.name
  const found = nbus.find((item) => item.id === Number(nbu))
  return found?.name || `NBU #${nbu}`
}

export const getPreferredNbuId = (nbus: NBU[]) => {
  const active = nbus.filter((nbu) => nbu.is_active)
  const newest = [...active].sort((a, b) => {
    const yearDiff = Number(b.year || 0) - Number(a.year || 0)
    if (yearDiff !== 0) return yearDiff
    return b.id - a.id
  })[0]
  return newest?.id ? String(newest.id) : ""
}

export function useNbuOptions() {
  const query = useApiQuery<NbuResponse>({
    queryKey: ["catalog", "nbu", "options"],
    url: `${CATALOG_ENDPOINTS.NBU}?limit=200&is_active=true`,
    staleTime: 10 * 60 * 1000,
  })

  return {
    ...query,
    nbus: getNbusFromResponse(query.data),
  }
}
