"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import type { UIEvent } from "react"
import useAuth from "@/contexts/auth-context"
import { useApi } from "@/hooks/use-api"
import { AC_ENDPOINTS } from "@/config/api"
import { PERMISSIONS } from "@/config/permissions"
import { toast } from "sonner"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Eye, Pencil, Trash, Plus, AlertCircle } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { HistoryList } from "@/components/common/history-list"
import { formatDateTime } from "@/utils/date-utils"
import type { Role, Permission, HistoryEntry } from "@/types"
import { formatApiError } from "@/lib/api-error"

const extractErrorMessage = (errorData: unknown): string => formatApiError(errorData, "Error desconocido")

type RoleWithDetails = Role & {
  permission_details?: Permission[]
  permissions?: number[]
  history?: HistoryEntry[]
  total_changes?: number
}

interface RoleManagementProps {
  roles: RoleWithDetails[]
  setRoles: React.Dispatch<React.SetStateAction<RoleWithDetails[]>>
  refreshData: () => Promise<void>
}

export function RoleManagement({ roles, setRoles, refreshData }: RoleManagementProps) {
  const { hasPermission } = useAuth()
  const { apiRequest } = useApi()

  const canView = hasPermission(PERMISSIONS.MANAGE_ROLES.id)
  const canCreate = hasPermission(PERMISSIONS.MANAGE_ROLES.id)
  const canEdit = hasPermission(PERMISSIONS.MANAGE_ROLES.id)
  const canDelete = hasPermission(PERMISSIONS.MANAGE_ROLES.id)

  const [allPerms, setAllPerms] = useState<Permission[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMorePerms, setHasMorePerms] = useState(true)
  const [loadingPerms, setLoadingPerms] = useState(false)
  const permsContainerRef = useRef<HTMLDivElement>(null)

  const fetchMorePermissions = async () => {
    if (loadingPerms || !hasMorePerms) return
    setLoadingPerms(true)
    try {
      const res = await apiRequest(`${AC_ENDPOINTS.PERMISSIONS}?limit=20&offset=${offset}`)
      if (!res.ok) {
        setHasMorePerms(false)
        return
      }
      const data = await res.json()
      const batch: Permission[] = data.results || []
      setAllPerms((prev) => {
        const existingIds = new Set(prev.map((p: Permission) => p.id))
        const newPerms = batch.filter((p) => !existingIds.has(p.id))
        return [...prev, ...newPerms]
      })
      setOffset((prev) => prev + batch.length)
      if (!data.next || batch.length < 20) {
        setHasMorePerms(false)
      }
    } catch {
      setHasMorePerms(false)
    } finally {
      setLoadingPerms(false)
    }
  }

  useEffect(() => {
    if (allPerms.length === 0 && hasMorePerms) {
      fetchMorePermissions()
    }
  }, [])

  const onPermsScroll = (e: UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget
    if (t.scrollTop + t.clientHeight >= t.scrollHeight - 20) {
      fetchMorePermissions()
    }
  }

  const validRoles = roles.filter((r) => r.id)

  const [selectedRole, setSelectedRole] = useState<RoleWithDetails | null>(null)
  const [isViewing, setIsViewing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [roleDetail, setRoleDetail] = useState<RoleWithDetails | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [formData, setFormData] = useState<{ name: string; permissions: number[] }>({
    name: "",
    permissions: [],
  })

  const resetForm = () => {
    setFormData({ name: "", permissions: [] })
    setSelectedRole(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePermissionToggle = (permId: number, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissions: checked
        ? Array.from(new Set([...prev.permissions, permId]))
        : prev.permissions.filter((id) => id !== permId),
    }))
  }

  const handleSelectRole = (role: RoleWithDetails) => {
    setSelectedRole(role)
    const existing: number[] = Array.isArray(role.permission_details)
      ? role.permission_details.map((p: Permission) => p.id)
      : Array.isArray(role.permissions)
        ? role.permissions
        : []
    setFormData({ name: role.name, permissions: Array.from(new Set(existing)) })
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre del rol es requerido")
      return
    }
    const id = toast.loading("Creando rol...")
    try {
      const res = await apiRequest(AC_ENDPOINTS.ROLES, {
        method: "POST",
        body: { name: formData.name.trim(), permissions: formData.permissions },
      })
      toast.dismiss(id)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Error desconocido" }))
        toast.error("Error al crear rol", { description: extractErrorMessage(err) })
        return
      }
      const newRole = await res.json()
      setRoles((prev) => [...prev, newRole])
      await refreshData()
      toast.success("Rol creado")
      setIsCreating(false)
      resetForm()
    } catch {
      toast.dismiss(id)
      toast.error("Error inesperado al crear rol")
    }
  }

  const handleEdit = async () => {
    if (!selectedRole?.id) return
    if (!formData.name.trim()) {
      toast.error("El nombre del rol es requerido")
      return
    }
    const id = toast.loading("Actualizando rol...")
    try {
      const res = await apiRequest(AC_ENDPOINTS.ROLE_DETAIL(selectedRole.id), {
        method: "PATCH",
        body: { name: formData.name.trim(), permissions: formData.permissions },
      })
      toast.dismiss(id)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Error desconocido" }))
        toast.error("Error al actualizar rol", { description: extractErrorMessage(err) })
        return
      }
      await refreshData()
      toast.success("Rol actualizado")
      setIsEditing(false)
      resetForm()
    } catch {
      toast.dismiss(id)
      toast.error("Error inesperado al actualizar rol")
    }
  }

  const handleDelete = async () => {
    if (!selectedRole?.id) return
    const id = toast.loading("Eliminando rol...")
    try {
      const res = await apiRequest(AC_ENDPOINTS.ROLE_DETAIL(selectedRole.id), { method: "DELETE" })
      toast.dismiss(id)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Error desconocido" }))
        toast.error("Error al eliminar rol", { description: extractErrorMessage(err) })
        return
      }
      setRoles((prev) => prev.filter((r) => r.id !== selectedRole.id))
      toast.success("Rol eliminado")
      setIsDeleting(false)
      resetForm()
    } catch {
      toast.dismiss(id)
      toast.error("Error inesperado al eliminar rol")
    }
  }

  const fetchRoleDetail = async (roleId: number) => {
    setLoadingDetail(true)
    try {
      const res = await apiRequest(AC_ENDPOINTS.ROLE_DETAIL(roleId), {
        method: "GET",
      })
      if (res.ok) {
        const data = await res.json()
        setRoleDetail(data)
      } else {
        toast.error("No se pudo cargar el detalle del rol")
      }
    } catch {
      toast.error("Error al cargar el detalle del rol")
    } finally {
      setLoadingDetail(false)
    }
  }

  if (!canView) return null

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Lista de Roles</h2>
        {canCreate && (
          <Dialog
            open={isCreating}
            onOpenChange={(open) => {
              setIsCreating(open)
              if (!open) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-[#204983] text-white w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Crear Rol
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Crear Rol</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Nombre del Rol</Label>
                  <Input name="name" value={formData.name} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Permisos ({formData.permissions.length})</Label>
                  <div
                    ref={permsContainerRef}
                    onScroll={onPermsScroll}
                    className="max-h-60 overflow-y-auto border rounded-md p-3"
                  >
                    {allPerms.map((perm) => (
                      <div key={perm.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`perm-create-${perm.id}`}
                          checked={formData.permissions.includes(perm.id)}
                          onCheckedChange={(ch) => handlePermissionToggle(perm.id, ch === true)}
                        />
                        <Label htmlFor={`perm-create-${perm.id}`} className="cursor-pointer text-sm">
                          {perm.name}
                        </Label>
                      </div>
                    ))}
                    {loadingPerms && <p className="text-center py-2 text-sm">Cargando más permisos…</p>}
                    {!hasMorePerms && allPerms.length === 0 && (
                      <p className="text-gray-500 text-sm">No hay permisos disponibles.</p>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <DialogClose asChild>
                  <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button onClick={handleCreate} className="w-full sm:w-auto">
                  Crear
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="block sm:hidden space-y-3">
        {validRoles.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="text-sm">No hay roles disponibles</p>
            </div>
          </div>
        ) : (
          validRoles.map((role) => (
            <div key={role.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium text-gray-900">{role.name}</h3>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {role.permission_details && role.permission_details.length > 0 ? (
                  role.permission_details.slice(0, 2).map((p: Permission) => (
                    <Badge key={p.id} variant="secondary" className="text-xs">
                      {p.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-gray-500 text-xs">Sin permisos</span>
                )}
                {role.permission_details && role.permission_details.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{role.permission_details.length - 2} más
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-600 mb-3">
                <p>Creado: {role.creation ? formatDateTime(role.creation.date) : "Sin fecha"}</p>
                <p>Último cambio: {role.last_change ? formatDateTime(role.last_change.date) : "Sin cambios"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleSelectRole(role)
                    setIsViewing(true)
                    fetchRoleDetail(role.id)
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetForm()
                      handleSelectRole(role)
                      setIsEditing(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-200 hover:bg-red-50 bg-transparent"
                    onClick={() => {
                      handleSelectRole(role)
                      setIsDeleting(true)
                    }}
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden sm:block rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Permisos</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Último Cambio</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validRoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>No hay roles disponibles</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              validRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permission_details && role.permission_details.length > 0 ? (
                        role.permission_details.slice(0, 3).map((p: Permission) => (
                          <Badge key={p.id} variant="secondary" className="text-xs">
                            {p.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm">Sin permisos</span>
                      )}
                      {role.permission_details && role.permission_details.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permission_details.length - 3} más
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {role.creation ? formatDateTime(role.creation.date) : "Sin fecha"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {role.last_change ? formatDateTime(role.last_change.date) : "Sin cambios"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleSelectRole(role)
                          setIsViewing(true)
                          fetchRoleDetail(role.id)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            resetForm()
                            handleSelectRole(role)
                            setIsEditing(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 hover:bg-red-50 bg-transparent"
                          onClick={() => {
                            handleSelectRole(role)
                            setIsDeleting(true)
                          }}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Ver Rol */}
      <Dialog
        open={isViewing}
        onOpenChange={(open) => {
          setIsViewing(open)
          if (!open) {
            resetForm()
            setRoleDetail(null)
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-x-hidden overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Detalles del Rol</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="py-8 text-center text-gray-500 text-sm sm:text-base">Cargando detalles del rol...</div>
          ) : roleDetail ? (
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label className="text-sm sm:text-base">Nombre</Label>
                <p className="text-gray-700">{roleDetail.name}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Permisos</Label>
                <div className="flex flex-wrap gap-1">
                  {roleDetail.permission_details && roleDetail.permission_details.length > 0 ? (
                    roleDetail.permission_details.map((p: Permission) => (
                      <Badge key={p.id} variant="secondary" className="text-xs">
                        {p.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">Sin permisos</span>
                  )}
                </div>
              </div>

              {roleDetail.history && roleDetail.history.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                      Historial de Cambios ({roleDetail.total_changes || roleDetail.history.length})
                    </h4>
                    <HistoryList history={roleDetail.history} />
                  </div>
                </>
              )}
            </div>
          ) : selectedRole ? (
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label className="text-sm sm:text-base">Nombre</Label>
                <p className="text-gray-700">{selectedRole.name}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Permisos</Label>
                <div className="flex flex-wrap gap-1">
                  {selectedRole.permission_details && selectedRole.permission_details.length > 0 ? (
                    selectedRole.permission_details.map((p: Permission) => (
                      <Badge key={p.id} variant="secondary" className="text-xs">
                        {p.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">Sin permisos</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                Cerrar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Rol */}
      <Dialog
        open={isEditing}
        onOpenChange={(open) => {
          setIsEditing(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Editar Rol</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Nombre del Rol</Label>
              <Input name="name" value={formData.name} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Permisos ({formData.permissions.length})</Label>
              <div onScroll={onPermsScroll} className="max-h-60 overflow-y-auto border rounded-md p-3">
                {allPerms.map((perm) => (
                  <div key={perm.id} className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id={`perm-edit-${perm.id}`}
                      checked={formData.permissions.includes(perm.id)}
                      onCheckedChange={(ch) => handlePermissionToggle(perm.id, ch === true)}
                    />
                    <Label htmlFor={`perm-edit-${perm.id}`} className="cursor-pointer text-sm">
                      {perm.name}
                    </Label>
                  </div>
                ))}
                {loadingPerms && <p className="text-center py-2 text-sm">Cargando más permisos…</p>}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                Cancelar
              </Button>
            </DialogClose>
            <Button onClick={handleEdit} className="w-full sm:w-auto">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar Rol */}
      <Dialog
        open={isDeleting}
        onOpenChange={(open) => {
          setIsDeleting(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Eliminar Rol</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm sm:text-base">
              ¿Estás seguro de que deseas eliminar el rol <strong>{selectedRole?.name}</strong>? Esta acción no se puede
              deshacer.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                Cancelar
              </Button>
            </DialogClose>
            <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
