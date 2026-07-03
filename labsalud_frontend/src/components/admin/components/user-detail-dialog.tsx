"use client"

import type { User, Group } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AuditAvatars } from "@/components/common/audit-avatars"
import { Clock, Pencil, Shield, ShieldX, UserPlus, UserMinus, Trash, Mail } from "lucide-react"

export type UserAction =
  | "view"
  | "edit"
  | "tempPermission"
  | "revokeTempPermission"
  | "assignRole"
  | "removeRole"
  | "delete"

interface UserDetailDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAction: (action: UserAction) => void
  canEdit: boolean
  canDelete: boolean
  canAssignRole: boolean
  canRemoveRole: boolean
  canManageTempPermissions: boolean
}

const roleVariant = (name: string): "default" | "secondary" | "destructive" | "outline" => {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    Administradora: "destructive",
    Bioquimica: "default",
    Tecnica: "secondary",
    Secretaria: "outline",
  }
  return map[name] || "secondary"
}

const initials = (u: User) =>
  u.first_name && u.last_name
    ? `${u.first_name.charAt(0)}${u.last_name.charAt(0)}`.toUpperCase()
    : u.username.substring(0, 2).toUpperCase()

const auditInfo = (audit?: User["creation"] | User["last_change"]) =>
  audit ? { user: audit.user ? { username: audit.user.username, photo: audit.user.photo } : null, date: audit.date } : undefined

export function UserDetailDialog({
  user,
  open,
  onOpenChange,
  onAction,
  canEdit,
  canDelete,
  canAssignRole,
  canRemoveRole,
  canManageTempPermissions,
}: UserDetailDialogProps) {
  if (!user) return null

  const roles: Group[] = user.groups || user.roles || []
  const hasTemp = user.permissions?.some((p) => p.temporary) || false
  const fullName = `${user.first_name} ${user.last_name}`.trim() || user.username

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-3 border-b border-gray-100 p-5 text-left">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.photo || "/placeholder.svg"} alt={user.username} />
              <AvatarFallback className="bg-[#204983] text-base text-white">{initials(user)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg">{fullName}</DialogTitle>
              <DialogDescription className="truncate">@{user.username}</DialogDescription>
            </div>
          </div>
          {(user.is_superuser || user.is_staff || hasTemp || user.is_active === false) && (
            <div className="flex flex-wrap gap-1.5">
              {user.is_superuser && <Badge variant="destructive">Superusuario</Badge>}
              {user.is_staff && <Badge variant="outline">Staff</Badge>}
              {hasTemp && (
                <Badge variant="secondary">
                  <Clock className="mr-1 h-3 w-3" />
                  Permiso temporal
                </Badge>
              )}
              {user.is_active === false && (
                <Badge variant="outline" className="border-red-200 text-red-600">
                  Inactivo
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-5 p-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contacto</p>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Mail className="h-4 w-4 text-gray-400" />
              {user.email || <span className="text-gray-400">Sin email</span>}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Clock className="h-4 w-4 text-gray-400" />
              Cierre por inactividad: <span className="font-medium">{user.inactivity_logout_minutes ?? 30} min</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Roles</p>
            <div className="flex flex-wrap gap-1.5">
              {roles.length > 0 ? (
                roles.map((r) => (
                  <Badge key={r.id} variant={roleVariant(r.name)}>
                    {r.name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-gray-400">Sin roles asignados</span>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Auditoría</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Creado</span>
              {user.creation ? <AuditAvatars creation={auditInfo(user.creation)} size="sm" /> : <span className="text-gray-400">—</span>}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Último cambio</span>
              {user.last_change ? <AuditAvatars lastChange={auditInfo(user.last_change)} size="sm" /> : <span className="text-gray-400">—</span>}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50/60 p-4">
          <div className="grid grid-cols-2 gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => onAction("edit")}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Editar
              </Button>
            )}
            {canAssignRole && (
              <Button variant="outline" size="sm" onClick={() => onAction("assignRole")}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                Asignar rol
              </Button>
            )}
            {canRemoveRole && roles.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => onAction("removeRole")}>
                <UserMinus className="mr-1.5 h-4 w-4" />
                Quitar rol
              </Button>
            )}
            {canManageTempPermissions && (
              <Button variant="outline" size="sm" onClick={() => onAction("tempPermission")}>
                <Shield className="mr-1.5 h-4 w-4" />
                Permiso temporal
              </Button>
            )}
            {canManageTempPermissions && hasTemp && (
              <Button variant="outline" size="sm" onClick={() => onAction("revokeTempPermission")}>
                <ShieldX className="mr-1.5 h-4 w-4" />
                Revocar temporal
              </Button>
            )}
          </div>
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => onAction("delete")}
            >
              <Trash className="mr-1.5 h-4 w-4" />
              Eliminar usuario
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
