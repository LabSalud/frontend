"use client"

import { useState, useEffect, useRef } from "react"
import { useApi } from "@/hooks/use-api"
import { useDebounce } from "@/hooks/use-debounce"
import { AC_ENDPOINTS } from "@/config/api"
import type { Permission } from "@/types"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { AlertCircle, Search } from "lucide-react"
import type { UIEvent, ChangeEvent } from "react"

interface PermissionManagementProps {
  permission: Permission[]
}

export function PermissionManagement({ permission }: PermissionManagementProps) {
  const { apiRequest } = useApi()

  const [permissions, setPermissions] = useState<Permission[]>(permission)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [searching, setSearching] = useState(false)
  const permsContainerRef = useRef<HTMLDivElement>(null)

  const loadMore = async (reset = false) => {
    if (loading || (!hasMore && !reset)) return
    setLoading(true)
    try {
      const res = await apiRequest(
        `${AC_ENDPOINTS.PERMISSIONS}?limit=20&offset=${reset ? 0 : offset}&search=${encodeURIComponent(debouncedSearch)}`,
      )
      if (res.ok) {
        const data = await res.json()
        const batch: Permission[] = data.results || []
        setPermissions((prev) => (reset ? batch : [...prev, ...batch]))
        setOffset((prev) => (reset ? batch.length : prev + batch.length))
        setHasMore(!!data.next && batch.length === 20)
      } else {
        setHasMore(false)
      }
    } catch {
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setOffset(0)
    setHasMore(true)
    setPermissions([])
    if (debouncedSearch) setSearching(true)
    loadMore(true).then(() => setSearching(false))
  }, [debouncedSearch])

  const onPermsScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 20) {
      loadMore()
    }
  }

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar permisos por nombre o codename…"
            value={search}
            onChange={handleSearch}
            className="w-full pl-9"
          />
        </div>
        <p className="text-sm text-gray-500">
          Los permisos son de solo lectura; se asignan a través de los roles.
        </p>
      </div>
      <div
        ref={permsContainerRef}
        onScroll={onPermsScroll}
        className="max-h-[28rem] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm"
      >
        <div className="block space-y-3 p-3 sm:hidden">
          {permissions.map((perm) => (
            <div key={perm.id} className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">ID: {perm.id}</span>
              </div>
              <p className="font-medium text-sm text-gray-900">{perm.name}</p>
              <p className="mt-1 font-mono text-xs text-gray-500">{perm.codename}</p>
            </div>
          ))}
          {(loading || searching) && <div className="text-center py-4 text-sm text-gray-500">Cargando permisos...</div>}
          {!hasMore && permissions.length === 0 && !loading && (
            <div className="text-center py-4 flex items-center justify-center text-sm text-gray-500">
              <AlertCircle className="w-5 h-5 mr-2" />
              No hay permisos disponibles.
            </div>
          )}
        </div>

        <div className="hidden sm:block">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 text-xs font-semibold uppercase tracking-wider text-gray-500">ID</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nombre</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">Codename</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((perm) => (
                <TableRow key={perm.id} className="border-gray-100">
                  <TableCell className="text-sm text-gray-400">{perm.id}</TableCell>
                  <TableCell className="font-medium text-gray-800">{perm.name}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{perm.codename}</TableCell>
                </TableRow>
              ))}
              {(loading || searching) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Cargando permisos...
                  </TableCell>
                </TableRow>
              )}
              {!hasMore && permissions.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    <AlertCircle className="inline w-6 h-6 mr-2" />
                    No hay permisos disponibles.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
