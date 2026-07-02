"use client"

import type React from "react"
import { useState } from "react"
import useAuth from "@/contexts/auth-context"
import { useApi } from "@/hooks/use-api"
import type { User, Role, Permission } from "@/types"
import { UserTable } from "./components/user-table"
import { UserDetailSheet, type UserAction } from "./components/user-detail-sheet"
import { CreateUserDialog } from "./components/create-user-dialog"
import { EditUserDialog } from "./components/edit-user-dialog"
import { TempPermissionDialog } from "./components/temp-permission-dialog"
import { RoleAssignDialog } from "./components/role-assign-dialog"
import { RoleRemoveDialog } from "./components/role-remove-dialog"
import { DeleteUserDialog } from "./components/delete-user-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, AlertCircle, Search } from "lucide-react"
import { PERMISSIONS } from "@/config/permissions"
import { ViewUserDialog } from "./components/view-user-dialog"

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
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [sheetUser, setSheetUser] = useState<User | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isViewing, setIsViewing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isTempPermission, setIsTempPermission] = useState(false)
  const [isRevokeTempPermission, setIsRevokeTempPermission] = useState(false)
  const [isRoleAssign, setIsRoleAssign] = useState(false)
  const [isRoleRemove, setIsRoleRemove] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const canViewUsers = hasPermission(PERMISSIONS.MANAGE_USERS.codename)
  const canCreateUser = hasPermission(PERMISSIONS.MANAGE_USERS.codename)
  const canEditUser = hasPermission(PERMISSIONS.MANAGE_USERS.codename)
  const canDeleteUser = hasPermission(PERMISSIONS.MANAGE_USERS.codename)
  const canAssignRole = hasPermission(PERMISSIONS.MANAGE_ROLES.codename)
  const canRemoveRole = hasPermission(PERMISSIONS.MANAGE_ROLES.codename)
  const canAssignTempPermission = hasPermission(PERMISSIONS.MANAGE_TEMP_PERMISSIONS.codename)

  const handleSelectUser = (user: User, action: string) => {
    if (!user || !user.id) {
      console.error("Usuario inválido seleccionado:", user)
      return
    }

    setSelectedUser(user)
    setSelectedUserId(user.id)
    switch (action) {
      case "view":
        setIsViewing(true)
        break
      case "edit":
        if (canEditUser) setIsEditing(true)
        break
      case "tempPermission":
        if (canAssignTempPermission) setIsTempPermission(true)
        break
      case "revokeTempPermission":
        if (canAssignTempPermission) setIsRevokeTempPermission(true)
        break
      case "assignRole":
        if (canAssignRole) setIsRoleAssign(true)
        break
      case "removeRole":
        if (canRemoveRole) setIsRoleRemove(true)
        break
      case "delete":
        if (canDeleteUser) setIsDeleting(true)
        break
    }
  }

  const closeAllDialogs = () => {
    setSelectedUser(null)
    setSelectedUserId(null)
    setIsCreating(false)
    setIsViewing(false)
    setIsEditing(false)
    setIsTempPermission(false)
    setIsRevokeTempPermission(false)
    setIsRoleAssign(false)
    setIsRoleRemove(false)
    setIsDeleting(false)
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

  const openSheet = (user: User) => {
    setSheetUser(user)
    setSheetOpen(true)
  }

  // Desde la ficha lateral se disparan los diálogos existentes; cerramos la ficha
  // para no apilar overlays.
  const handleSheetAction = (action: UserAction) => {
    if (!sheetUser) return
    setSheetOpen(false)
    handleSelectUser(sheetUser, action)
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
            <Button className="bg-[#204983] w-full sm:w-auto" onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo usuario
            </Button>
          )}
        </div>
      </div>

      {canViewUsers ? (
        <UserTable users={filteredUsers} onRowClick={openSheet} />
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p className="text-sm sm:text-base">No tienes permiso para ver la lista de usuarios.</p>
          </div>
        </div>
      )}

      {/* Ficha lateral con toda la info + acciones */}
      <UserDetailSheet
        user={sheetUser}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onAction={handleSheetAction}
        canEdit={canEditUser}
        canDelete={canDeleteUser}
        canAssignRole={canAssignRole}
        canRemoveRole={canRemoveRole}
        canManageTempPermissions={canAssignTempPermission}
      />

      {/* Dialogs */}
      <CreateUserDialog
        open={isCreating}
        onOpenChange={(open) => !open && closeAllDialogs()}
        roles={validRoles}
        setUsers={setUsers}
        apiRequest={apiRequest}
        refreshData={refreshData}
      />

      <ViewUserDialog
        open={isViewing}
        onOpenChange={(open) => !open && closeAllDialogs()}
        userId={selectedUserId}
        apiRequest={apiRequest}
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

      <RoleAssignDialog
        open={isRoleAssign}
        onOpenChange={(open) => !open && closeAllDialogs()}
        user={selectedUser}
        roles={validRoles}
        setUsers={setUsers}
        apiRequest={apiRequest}
        refreshData={refreshData}
      />

      <RoleRemoveDialog
        open={isRoleRemove}
        onOpenChange={(open) => !open && closeAllDialogs()}
        user={selectedUser}
        roles={validRoles}
        setUsers={setUsers}
        apiRequest={apiRequest}
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
