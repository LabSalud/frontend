"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import type { User, Role, Group } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { ApiRequestOptions } from "@/hooks/use-api"
import { AC_ENDPOINTS } from "@/config/api"

const extractErrorMessage = (errorData: unknown): string => {
  if (!errorData || typeof errorData !== "object") return "Error desconocido"
  const err = errorData as Record<string, unknown>
  if (typeof err.detail === "string") return err.detail
  if (typeof err.error === "string") return err.error
  if (typeof err.message === "string") return err.message
  for (const key of Object.keys(err)) {
    const val = err[key]
    if (Array.isArray(val) && val.length > 0) {
      return `${key}: ${val[0]}`
    }
  }
  return "Error desconocido"
}

interface RoleRemoveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  roles: Role[]
  setUsers: React.Dispatch<React.SetStateAction<User[]>>
  apiRequest: (url: string, options?: ApiRequestOptions) => Promise<Response>
  refreshData?: () => Promise<void>
}

export function RoleRemoveDialog({
  open,
  onOpenChange,
  user,
  roles,
  setUsers,
  apiRequest,
  refreshData,
}: RoleRemoveDialogProps) {
  const { success, error: showError } = useToast()
  const [roleData, setRoleData] = useState({
    role_id: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const userRoles = useMemo(() => {
    if (!user || !roles || !Array.isArray(roles)) {
      return []
    }
    const userGroups = user.groups || user.roles || []
    const userRoleIds = userGroups.map((group: Group) => group.id)
    return roles.filter((role) => userRoleIds.includes(role.id))
  }, [user, roles])

  useEffect(() => {
    if (open && user && userRoles.length > 0) {
      const savedData = localStorage.getItem(`role-remove-${user.id}`)
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          if (userRoles.some((role) => role.id.toString() === parsed.role_id)) {
            setRoleData(parsed)
          } else {
            setRoleData({ role_id: userRoles[0].id.toString() })
          }
        } catch (e) {
          console.error("Error parsing saved role remove data:", e)
          setRoleData({ role_id: userRoles[0].id.toString() })
        }
      } else {
        setRoleData({ role_id: userRoles[0].id.toString() })
      }
    } else if (!open) {
      setRoleData({ role_id: "" })
      setIsSubmitting(false)
      localStorage.removeItem(`role-remove-${user?.id}`)
    }
  }, [open, user, userRoles])

  const saveRoleData = useCallback(
    (data: { role_id: string }) => {
      if (user && data.role_id) {
        localStorage.setItem(`role-remove-${user.id}`, JSON.stringify(data))
      }
    },
    [user],
  )

  useEffect(() => {
    if (roleData.role_id) {
      saveRoleData(roleData)
    }
  }, [roleData, saveRoleData])

  const handleRemoveRole = async () => {
    if (!user || !roleData.role_id) return

    setIsSubmitting(true)

    try {
      const currentGroups = user.groups || user.roles || []
      const remainingRoleIds = currentGroups
        .filter((g: Group) => g.id !== Number.parseInt(roleData.role_id))
        .map((g: Group) => g.id)

      const response = await apiRequest(AC_ENDPOINTS.ROLE_ASSIGN, {
        method: "POST",
        body: {
          user_id: user.id,
          role_ids: remainingRoleIds,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const updatedUser = {
          ...user,
          groups: data.assigned_roles || [],
        }

        setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)))

        if (refreshData) {
          await refreshData()
        }

        success("Rol eliminado", { description: "El rol ha sido eliminado exitosamente." })

        onOpenChange(false)
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Error desconocido" }))
        showError("Error al eliminar rol", {
          description: extractErrorMessage(errorData),
        })
      }
    } catch (err) {
      console.error("Error al eliminar rol:", err)
      showError("Error", { description: "Ha ocurrido un error al eliminar el rol." })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Quitar Rol</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {userRoles.length > 1 ? (
            <div className="space-y-4">
              <p className="text-sm sm:text-base">Selecciona el rol que deseas quitar:</p>
              <Select
                value={roleData.role_id}
                onValueChange={(value) => setRoleData((prev) => ({ ...prev, role_id: value }))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {userRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : userRoles.length === 1 ? (
            <p className="text-sm sm:text-base">
              ¿Estás seguro de que deseas quitar el rol <strong>{userRoles[0].name}</strong> del usuario{" "}
              <strong>{user?.username}</strong>?
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm sm:text-base">Este usuario no tiene roles asignados.</p>
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting} className="w-full sm:w-auto bg-transparent">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            onClick={handleRemoveRole}
            disabled={isSubmitting || userRoles.length === 0}
          >
            {isSubmitting ? "Quitando..." : "Quitar Rol"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
