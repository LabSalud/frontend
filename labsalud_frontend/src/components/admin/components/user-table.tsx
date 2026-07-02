"use client"

import type { User, Group } from "@/types"
import { DataTable, type Column } from "@/components/common/data-table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AuditAvatars } from "@/components/common/audit-avatars"
import { Clock } from "lucide-react"

interface UserTableProps {
  users: User[]
  onRowClick: (user: User) => void
  isLoading?: boolean
}

const getInitials = (firstName: string, lastName: string, username: string) =>
  firstName && lastName ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() : username.substring(0, 2).toUpperCase()

const getRoleColor = (roleName: string): "default" | "secondary" | "destructive" | "outline" => {
  const roleColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    Administradora: "destructive",
    Bioquimica: "default",
    Tecnica: "secondary",
    Secretaria: "outline",
  }
  return roleColors[roleName] || "secondary"
}

const getActiveRoles = (user: User): Group[] => user.groups || user.roles || []
const hasTemporaryPermissions = (user: User) => user.permissions?.some((p) => p.temporary) || false
const getAuditInfo = (audit?: User["creation"] | User["last_change"]) =>
  audit ? { user: audit.user ? { username: audit.user.username, photo: audit.user.photo } : null, date: audit.date } : undefined

export function UserTable({ users, onRowClick, isLoading }: UserTableProps) {
  const columns: Column<User>[] = [
    {
      id: "user",
      header: "Usuario",
      cell: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photo || "/placeholder.svg"} alt={user.username} />
            <AvatarFallback className="bg-[#204983] text-xs text-white">
              {getInitials(user.first_name, user.last_name, user.username)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium text-gray-900">
              {`${user.first_name} ${user.last_name}`.trim() || user.username}
            </div>
            <div className="truncate text-xs text-gray-500">@{user.username}</div>
          </div>
        </div>
      ),
    },
    {
      id: "email",
      header: "Email",
      responsive: "hidden md:table-cell",
      cell: (user) => <span className="block max-w-[220px] truncate text-sm text-gray-600">{user.email || "—"}</span>,
    },
    {
      id: "roles",
      header: "Roles",
      cell: (user) => {
        const roles = getActiveRoles(user)
        const hasTemp = hasTemporaryPermissions(user)
        return (
          <div className="flex flex-wrap gap-1">
            {user.is_superuser && <Badge variant="destructive" className="text-[10px]">Super</Badge>}
            {hasTemp && (
              <Badge variant="secondary" className="text-[10px]">
                <Clock className="mr-1 h-3 w-3" />
                Temp
              </Badge>
            )}
            {roles.length > 0 ? (
              roles.slice(0, 2).map((role) => (
                <Badge key={role.id} variant={getRoleColor(role.name)} className="text-[10px]">
                  {role.name}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="text-[10px] text-gray-500">Sin rol</Badge>
            )}
            {roles.length > 2 && <Badge variant="outline" className="text-[10px]">+{roles.length - 2}</Badge>}
          </div>
        )
      },
    },
    {
      id: "inactivity",
      header: "Inactividad",
      responsive: "hidden lg:table-cell",
      cell: (user) => (
        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-600">
          <Clock className="h-3 w-3 text-gray-400" />
          {user.inactivity_logout_minutes ?? 30} min
        </span>
      ),
    },
    {
      id: "created",
      header: "Creado",
      responsive: "hidden xl:table-cell",
      cell: (user) =>
        user.creation ? <AuditAvatars creation={getAuditInfo(user.creation)} size="sm" /> : <span className="text-xs text-gray-400">—</span>,
    },
    {
      id: "changed",
      header: "Último cambio",
      responsive: "hidden xl:table-cell",
      cell: (user) =>
        user.last_change ? <AuditAvatars lastChange={getAuditInfo(user.last_change)} size="sm" /> : <span className="text-xs text-gray-400">—</span>,
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={users}
      getRowId={(u) => u.id}
      onRowClick={onRowClick}
      isLoading={isLoading}
      emptyMessage="No hay usuarios que coincidan con la búsqueda."
    />
  )
}
