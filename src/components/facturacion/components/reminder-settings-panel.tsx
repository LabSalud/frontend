import { useState } from "react"
import { Bell, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { ReminderPhone } from "../types"

interface ReminderSettingsPanelProps {
  phones: ReminderPhone[]
  onAddPhone: (label: string, phone: string) => Promise<void>
  onTogglePhone: (id: number, active: boolean) => Promise<void>
  onRemovePhone: (id: number) => Promise<void>
}

/**
 * Números que reciben el recordatorio de cierre por WhatsApp. Son
 * **compartidos por todas las entidades**: la anticipación (días antes) y si
 * el aviso está activo se configuran por entidad en cada ficha.
 */
export function ReminderSettingsPanel({ phones, onAddPhone, onTogglePhone, onRemovePhone }: ReminderSettingsPanelProps) {
  const [newLabel, setNewLabel] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    if (!newPhone.trim()) return
    setAdding(true)
    try {
      await onAddPhone(newLabel.trim() || "Sin nombre", newPhone.trim())
      setNewLabel("")
      setNewPhone("")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-[#204983]" />
        <h2 className="text-base font-bold text-gray-800">Números para el recordatorio de cierre</h2>
      </div>
      <p className="text-sm text-gray-500">
        Todos los números activos reciben el mismo aviso de WhatsApp cuando una presentación abierta se acerca a su
        cierre. La anticipación y si el recordatorio está activo se configuran por entidad, arriba.
      </p>

      <div className="space-y-2 border-t border-gray-100 pt-3">
        {phones.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-gray-100 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800">{p.label}</p>
              <p className="truncate text-xs text-gray-500">{p.phone}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Switch checked={p.is_active} onCheckedChange={(v) => onTogglePhone(p.id, v)} className="data-[state=checked]:bg-[#204983]" />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                onClick={() => onRemovePhone(p.id)}
                aria-label={`Eliminar ${p.label}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {phones.length === 0 && <p className="text-sm text-gray-400">No hay números configurados.</p>}
      </div>

      <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row">
        <Input placeholder="Nombre (ej. Bioquímica)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="sm:max-w-[200px]" />
        <Input placeholder="+54 9 11 xxxx-xxxx" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="flex-1" />
        <Button className="shrink-0 bg-[#204983] hover:bg-[#1a3d6f]" disabled={adding || !newPhone.trim()} onClick={handleAdd}>
          {adding ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
          Agregar número
        </Button>
      </div>
    </div>
  )
}
