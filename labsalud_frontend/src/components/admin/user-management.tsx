"use client"

import type React from "react"
import { useState } from "react"
import useAuth from "@/contexts/auth-context"
import { useApi } from "@/hooks/use-api"
import type { User, Role, Permission } from "@/types"
import { UserTable } from "./components/user-table"
import { CreateUserDialog } from "./components/create-user-dialog"
import { EditUserDialog } from "./components/edit-user-dialog"
import { TempPermissionDialog } from "./components/temp-permission-dialog"
import { RoleAssignDialog } from "./components/role-assign-dialog"
import { RoleRemoveDialog } from "./components/role-remove-dialog"
import { DeleteUserDialog } from "./components/delete-user-dialog"
import { Button } from "@/components/ui/button"
import { Plus, AlertCircle } from "lucide-react"
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Gestión de Usuarios</h2>

        {canCreateUser && (
          <Button className="bg-[#204983] w-full sm:w-auto" onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        )}
      </div>

      {canViewUsers ? (
        <UserTable
          users={validUsers}
          onSelectUser={handleSelectUser}
          canView={canViewUsers}
          canEdit={canEditUser}
          canDelete={canDeleteUser}
          canAssignRole={canAssignRole}
          canRemoveRole={canRemoveRole}
          canManageTempPermissions={canAssignTempPermission}
        />
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p className="text-sm sm:text-base">No tienes permiso para ver la lista de usuarios.</p>
          </div>
        </div>
      )}

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
      />

      <TempPermissionDialog
        open={isRevokeTempPermission}
        onOpenChange={(open) => !open && closeAllDialogs()}
        user={selectedUser}
        permissions={validPermissions}
        setUsers={setUsers}
        apiRequest={apiRequest}
        mode="revoke"
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
