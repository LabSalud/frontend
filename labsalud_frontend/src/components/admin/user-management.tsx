"use client"

import type React from "react"
import { useState } from "react"
import { toast } from "sonner"
import useAuth from "@/contexts/auth-context"
import { useApi } from "@/hooks/use-api"
import { AC_ENDPOINTS } from "@/config/api"
import { formatApiError } from "@/lib/api-error"
import type { User, Role, Permission, Group } from "@/types"
import { UserCard, type UserCardAction } from "./components/user-card"
import { CreateUserDialog } from "./components/create-user-dialog"
import { EditUserDialog } from "./components/edit-user-dialog"
import { TempPermissionDialog } from "./components/temp-permission-dialog"
import { DeleteUserDialog } from "./components/delete-user-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, AlertCircle, Search, Users } from "lucide-react"
import { PERMISSIONS } from "@/config/permissions"

interface UserManagementProps {
  users: User[]
  roles: Role[]
  permissions: Permission[]
  setUsers: React.Dispatch<React.SetStateAction<User[]>>
  refreshData: () => Promise<void>
}

export function UserManagement({ users, roles, permissions, setUsers, refreshData }: UserManagementProps) {
  const { hasPermission } = useAuth()
  const { apiRequest } = useApi()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [search, setSearch] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isTempPermission, setIsTempPermission] = useState(false)
  const [isRevokeTempPermission, setIsRevokeTempPermission] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const canViewUsers = hasPermission(PERMISSIONS.MANAGE_USERS.codename)
  const canCreateUser = hasPermission(PERMISSIONS.MANAGE_USERS.codename)
  const canEditUser = hasPermission(PERMISSIONS.MANAGE_USERS.codename)
  const canDeleteUser = hasPermission(PERMISSIONS.MANAGE_USERS.codename)
  const canAssignRole = hasPermission(PERMISSIONS.MANAGE_ROLES.codename)
  const canAssignTempPermission = hasPermission(PERMISSIONS.MANAGE_TEMP_PERMISSIONS.codename)

  const closeAllDialogs = () => {
    setSelectedUser(null)
    setIsCreating(false)
    setIsEditing(false)
    setIsTempPermission(false)
    setIsRevokeTempPermission(false)
    setIsDeleting(false)
  }

  const handleCardAction = (user: User, action: UserCardAction) => {
    setSelectedUser(user)
    if (action === "edit" && canEditUser) setIsEditing(true)
    else if (action === "tempPermission" && canAssignTempPermission) setIsTempPermission(true)
    else if (action === "revokeTempPermission" && canAssignTempPermission) setIsRevokeTempPermission(true)
    else if (action === "delete" && canDeleteUser) setIsDeleting(true)
  }

  // Alta/baja de rol en línea: el endpoint recibe el set completo de role_ids.
  const handleToggleRole = async (user: User, roleId: number) => {
    const currentIds = (user.groups || user.roles || []).map((g: Group) => g.id)
    const nextIds = currentIds.includes(roleId) ? currentIds.filter((id) => id !== roleId) : [...currentIds, roleId]
    try {
      const response = await apiRequest(AC_ENDPOINTS.ROLE_ASSIGN, {
        method: "POST",
        body: { user_id: user.id, role_ids: nextIds },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast.error("No se pudo actualizar el rol", { description: formatApiError(errorData, "Intentá de nuevo.") })
        return
      }
      const data = await response.json()
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, groups: data.assigned_roles || [] } : u)))
    } catch {
      toast.error("Error de red al actualizar el rol")
    }
  }

  const validUsers = Array.isArray(users) ? users.filter((user) => user && user.id) : []
  const validRoles = Array.isArray(roles) ? roles.filter((role) => role && role.id) : []
  const validPermissions = Array.isArray(permissions)
    ? permissions.filter((permission) => permission && permission.id)
    : []

  const query = search.trim().toLowerCase()
  const filteredUsers = query
    ? validUsers.filter((u) =>
        [`${u.first_name} ${u.last_name}`, u.username, u.email ?? ""].some((f) => f.toLowerCase().includes(query)),
      )
    : validUsers

  if (!canViewUsers) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm sm:text-base">No tienes permiso para ver la lista de usuarios.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, usuario o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-gray-500 sm:inline">
            {filteredUsers.length} usuario{filteredUsers.length === 1 ? "" : "s"}
          </span>
          {canCreateUser && (
            <Button className="w-full bg-[#204983] sm:w-auto" onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo usuario
            </Button>
          )}
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-gray-400">
          <Users className="mb-3 h-10 w-10" />
          <p className="text-sm">
            {search ? "Ningún usuario coincide con la búsqueda." : "No hay usuarios registrados."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              roles={validRoles}
              canEdit={canEditUser}
              canDelete={canDeleteUser}
              canAssignRole={canAssignRole}
              canManageTempPermissions={canAssignTempPermission}
              onAction={handleCardAction}
              onToggleRole={handleToggleRole}
            />
          ))}
        </div>
      )}

      {/* Diálogos */}
      <CreateUserDialog
        open={isCreating}
        onOpenChange={(open) => !open && closeAllDialogs()}
        roles={validRoles}
        setUsers={setUsers}
        apiRequest={apiRequest}
        refreshData={refreshData}
      />

      <EditUserDialog
        open={isEditing}
        onOpenChange={(open) => !open && closeAllDialogs()}
        user={selectedUser}
        roles={validRoles}
        setUsers={setUsers}
        apiRequest={apiRequest}
        refreshData={refreshData}
      />

      <TempPermissionDialog
        open={isTempPermission}
        onOpenChange={(open) => !open && closeAllDialogs()}
        user={selectedUser}
        permissions={validPermissions}
        setUsers={setUsers}
        apiRequest={apiRequest}
        mode="assign"
        refreshData={refreshData}
      />

      <TempPermissionDialog
        open={isRevokeTempPermission}
        onOpenChange={(open) => !open && closeAllDialogs()}
        user={selectedUser}
        permissions={validPermissions}
        setUsers={setUsers}
        apiRequest={apiRequest}
        mode="revoke"
        refreshData={refreshData}
      />

      <DeleteUserDialog
        open={isDeleting}
        onOpenChange={(open) => !open && closeAllDialogs()}
        user={selectedUser}
        setUsers={setUsers}
        apiRequest={apiRequest}
        refreshData={refreshData}
      />
    </div>
  )
}
