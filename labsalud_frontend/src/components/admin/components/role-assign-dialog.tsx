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

interface RoleAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  roles: Role[]
  setUsers: React.Dispatch<React.SetStateAction<User[]>>
  apiRequest: (url: string, options?: ApiRequestOptions) => Promise<Response>
  refreshData?: () => Promise<void>
}

export function RoleAssignDialog({
  open,
  onOpenChange,
  user,
  roles,
  setUsers,
  apiRequest,
  refreshData,
}: RoleAssignDialogProps) {
  const { success, error: showError } = useToast()
  const [roleData, setRoleData] = useState({
    role_id: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availableRoles = useMemo(() => {
    if (!user || !roles || !Array.isArray(roles)) {
      return []
    }
    const userGroups = user.groups || user.roles || []
    const userRoleIds = userGroups.map((group: Group) => group.id)
    return roles.filter((role) => !userRoleIds.includes(role.id))
  }, [user, roles])

  useEffect(() => {
    if (open && user && availableRoles.length > 0) {
      const savedData = localStorage.getItem(`role-assign-${user.id}`)
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          if (availableRoles.some((role) => role.id.toString() === parsed.role_id)) {
            setRoleData(parsed)
          } else {
            setRoleData({ role_id: availableRoles[0].id.toString() })
          }
        } catch (e) {
          console.error("Error parsing saved role assign data:", e)
          setRoleData({ role_id: availableRoles[0].id.toString() })
        }
      } else {
        setRoleData({ role_id: availableRoles[0].id.toString() })
      }
    } else if (!open) {
      setRoleData({ role_id: "" })
      setIsSubmitting(false)
      localStorage.removeItem(`role-assign-${user?.id}`)
    }
  }, [open, user, availableRoles])

  const saveRoleData = useCallback(
    (data: { role_id: string }) => {
      if (user && data.role_id) {
        localStorage.setItem(`role-assign-${user.id}`, JSON.stringify(data))
      }
    },
    [user],
  )

  useEffect(() => {
    if (roleData.role_id) {
      saveRoleData(roleData)
    }
  }, [roleData, saveRoleData])

  const handleAssignRole = async () => {
    if (!user || !roleData.role_id) return

    setIsSubmitting(true)

    try {
      const currentRoleIds = (user.groups || user.roles || []).map((group: Group) => group.id)
      const newRoleId = Number.parseInt(roleData.role_id)
      const allRoleIds = [...currentRoleIds, newRoleId]

      const response = await apiRequest(AC_ENDPOINTS.ROLE_ASSIGN, {
        method: "POST",
        body: {
          user_id: user.id,
          role_ids: allRoleIds,
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
        success("Rol asignado", { description: "El rol ha sido asignado exitosamente." })
        onOpenChange(false)
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Error desconocido" }))
        showError("Error al asignar rol", {
          description: extractErrorMessage(errorData),
        })
      }
    } catch (err) {
      console.error("Error al asignar rol:", err)
      showError("Error", { description: "Ha ocurrido un error de red o inesperado." })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Asignar Rol</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {availableRoles.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm sm:text-base">
                Selecciona el rol que deseas asignar a <strong>{user.username}</strong>:
              </p>
              <Select
                value={roleData.role_id}
                onValueChange={(value) => setRoleData((prev) => ({ ...prev, role_id: value }))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm sm:text-base">Este usuario ya tiene todos los roles disponibles asignados.</p>
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
            onClick={handleAssignRole}
            disabled={isSubmitting || availableRoles.length === 0}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Asignando..." : "Asignar Rol"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
