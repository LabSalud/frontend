"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import type { User, Role, Group } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import type { ApiRequestOptions } from "@/hooks/use-api"
import { USER_ENDPOINTS, AC_ENDPOINTS } from "@/config/api"

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

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  roles: Role[]
  setUsers: React.Dispatch<React.SetStateAction<User[]>>
  apiRequest: (url: string, options?: ApiRequestOptions) => Promise<Response>
  refreshData: () => Promise<void>
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  roles,
  setUsers,
  apiRequest,
  refreshData,
}: EditUserDialogProps) {
  const { success, error: showError } = useToast()
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
  })
  const [selectedRoles, setSelectedRoles] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && user) {
      const userGroups = user.groups || user.roles || []
      setUserData({
        username: user.username,
        email: user.email || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
      })
      setSelectedRoles(userGroups.map((group: Group) => group.id))
    } else if (!open) {
      setUserData({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
      })
      setSelectedRoles([])
      setIsSubmitting(false)
    }
  }, [open, user])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setUserData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }, [])

  const handleRoleChange = useCallback((roleId: number, checked: boolean) => {
    setSelectedRoles((prev) => (checked ? [...prev, roleId] : prev.filter((id) => id !== roleId)))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)

    try {
      const response = await apiRequest(USER_ENDPOINTS.USER_DETAIL(user.id), {
        method: "PATCH",
        body: userData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Error desconocido" }))
        showError("Error al actualizar usuario", {
          description: extractErrorMessage(errorData),
        })
        setIsSubmitting(false)
        return
      }

      const updatedUser = await response.json()

      const currentRoles = (user.groups || user.roles || []).map((r: Group) => r.id)
      const rolesChanged =
        selectedRoles.length !== currentRoles.length || selectedRoles.some((id) => !currentRoles.includes(id))

      if (rolesChanged) {
        const roleResponse = await apiRequest(AC_ENDPOINTS.ROLE_ASSIGN, {
          method: "POST",
          body: {
            user_id: user.id,
            role_ids: selectedRoles,
          },
        })

        if (!roleResponse.ok) {
          showError("Roles no actualizados", {
            description: "El usuario fue actualizado pero los roles no pudieron ser modificados debido a permisos.",
          })
        }
      }

      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? { ...updatedUser, groups: selectedRoles } : u)))
      await refreshData()
      success("Usuario actualizado", {
        description: "Los datos del usuario han sido actualizados exitosamente.",
      })
      onOpenChange(false)
    } catch (err) {
      console.error("Error al actualizar usuario:", err)
      showError("Error", {
        description: "Ha ocurrido un error de red o inesperado.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuario: {user?.username}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de usuario *</Label>
              <Input
                id="username"
                name="username"
                value={userData.username}
                onChange={handleChange}
                required
                placeholder="usuario123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={userData.email}
                onChange={handleChange}
                required
                placeholder="usuario@ejemplo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre</Label>
              <Input
                id="first_name"
                name="first_name"
                value={userData.first_name}
                onChange={handleChange}
                placeholder="Juan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido</Label>
              <Input
                id="last_name"
                name="last_name"
                value={userData.last_name}
                onChange={handleChange}
                placeholder="Pérez"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
              {Array.isArray(roles) && roles.length > 0 ? (
                roles.map((role) => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={selectedRoles.includes(role.id)}
                      onCheckedChange={(checked) => handleRoleChange(role.id, Boolean(checked))}
                    />
                    <Label htmlFor={`role-${role.id}`} className="text-sm">
                      {role.name}
                    </Label>
                  </div>
                ))
              ) : (
                <p className="col-span-2 text-gray-500 text-sm">No hay roles disponibles.</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-transparent"
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
