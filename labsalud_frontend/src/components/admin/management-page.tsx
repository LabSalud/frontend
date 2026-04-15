"use client"

import { useState, useEffect } from "react"
import useAuth from "@/contexts/auth-context"
import { useApi } from "@/hooks/use-api"
import { USER_ENDPOINTS, AC_ENDPOINTS } from "@/config/api"
import { PERMISSIONS } from "@/config/permissions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { UserManagement } from "./user-management"
import { RoleManagement } from "./role-management"
import { PermissionManagement } from "./permission-management"
import { AlertCircle } from "lucide-react"
import type { User, Role, Permission } from "@/types"

export default function ManagementPage() {
  const { hasPermission, user: currentUser } = useAuth()
  const { apiRequest } = useApi()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canManageUsers = hasPermission(PERMISSIONS.MANAGE_USERS.id)
  const canManageRoles = hasPermission(PERMISSIONS.MANAGE_ROLES.id)
  const canManageTempPermissions = hasPermission(PERMISSIONS.MANAGE_TEMP_PERMISSIONS.id)

  const canAccessManagement = canManageUsers || canManageRoles || canManageTempPermissions

  const refreshData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (canManageUsers) {
        let usersUrl = USER_ENDPOINTS.USERS
        if (!currentUser?.is_superuser) {
          usersUrl = `${USER_ENDPOINTS.USERS}?is_superuser=false&is_active=True`
        }

        const usersResponse = await apiRequest(usersUrl)
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          if (usersData && Array.isArray(usersData.results)) {
            setUsers(usersData.results)
          }
        }
      }

      if (canManageRoles) {
        const rolesResponse = await apiRequest(`${AC_ENDPOINTS.ROLES}?limit=100`)
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json()
          if (rolesData && Array.isArray(rolesData.results)) {
            setRoles(rolesData.results)
          }
        }
      }

      if (canManageRoles) {
        const permissionsResponse = await apiRequest(`${AC_ENDPOINTS.PERMISSIONS}?limit=100`)
        if (permissionsResponse.ok) {
          const permissionsData = await permissionsResponse.json()
          if (permissionsData && Array.isArray(permissionsData.results)) {
            setPermissions(permissionsData.results)
          }
        }
      }
    } catch (err) {
      console.error("Error al cargar datos:", err)
      setError("Error al cargar los datos. Por favor, intenta nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (canAccessManagement) {
      refreshData()
    }
  }, [canAccessManagement])

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6">
          {/* Header skeleton */}
          <Skeleton className="h-8 w-80 rounded mb-6" />

          {/* Tabs skeleton */}
          <Skeleton className="h-10 w-64 rounded mb-6" />

          {/* Toolbar skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-10 w-full sm:w-36 rounded" />
          </div>

          {/* Table skeleton */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-3 border-b border-gray-200">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-3 border-b border-gray-100 last:border-b-0">
                <div className="flex gap-4 items-center">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-4 w-48 rounded" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Gestión de Usuarios y Permisos</h1>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm sm:text-base">
            {error}
          </div>
        </div>
      </div>
    )
  }

  if (!canAccessManagement) {
    return (
      <div className="max-w-6xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Gestión de Usuarios y Permisos</h1>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <p className="text-sm sm:text-base">No tienes permisos para acceder a esta sección.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Gestión de Usuarios y Permisos</h1>
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-4 sm:mb-6 inline-flex overflow-x-auto">
            {canManageUsers && (
              <TabsTrigger value="users" className="text-sm">
                Usuarios
              </TabsTrigger>
            )}
            {canManageRoles && (
              <TabsTrigger value="roles" className="text-sm">
                Roles
              </TabsTrigger>
            )}
            {canManageRoles && (
              <TabsTrigger value="permissions" className="text-sm">
                Permisos
              </TabsTrigger>
            )}
          </TabsList>

          {canManageUsers && (
            <TabsContent value="users">
              <UserManagement
                users={users}
                roles={roles}
                permissions={permissions}
                setUsers={setUsers}
                refreshData={refreshData}
              />
            </TabsContent>
          )}

          {canManageRoles && (
            <TabsContent value="roles">
              <RoleManagement roles={roles} setRoles={setRoles} refreshData={refreshData} />
            </TabsContent>
          )}

          {canManageRoles && (
            <TabsContent value="permissions">
              <PermissionManagement permission={permissions} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
