"use client"

import type { Role } from "@/types"
import { Check, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface RoleChipsProps {
  roles: Role[]
  selectedIds: number[]
  onToggle: (roleId: number) => void
}

/**
 * Chips de roles seleccionables (mismo lenguaje visual que las cards de usuario).
 * Activo = pill azul de marca; inactivo = outline que invita a agregar.
 */
export function RoleChips({ roles, selectedIds, onToggle }: RoleChipsProps) {
  if (!roles.length) {
    return <p className="text-sm text-gray-400">No hay roles disponibles.</p>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => {
        const active = selectedIds.includes(role.id)
        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onToggle(role.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-[#204983] bg-[#204983] text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-[#204983]/40 hover:text-[#204983]",
            )}
          >
            {active ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {role.name}
          </button>
        )
      })}
    </div>
  )
}
