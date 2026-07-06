import { useState } from "react"
import { Bell, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { ReminderPhone } from "../mock-data"

interface ReminderSettingsPanelProps {
  phones: ReminderPhone[]
  daysBefore: number
  onAddPhone: (label: string, phone: string) => Promise<void>
  onTogglePhone: (id: number, active: boolean) => Promise<void>
  onRemovePhone: (id: number) => Promise<void>
  onChangeDaysBefore: (days: number) => Promise<void>
}

/**
 * Recordatorio por WhatsApp de cierre de presentación: varios números
 * configurables (todos reciben el mismo aviso) y una cantidad de días de
 * anticipación, compartida por todas las entidades.
 */
export function ReminderSettingsPanel({
  phones,
  daysBefore,
  onAddPhone,
  onTogglePhone,
  onRemovePhone,
  onChangeDaysBefore,
}: ReminderSettingsPanelProps) {
  const [newLabel, setNewLabel] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [adding, setAdding] = useState(false)
  const [daysDraft, setDaysDraft] = useState(String(daysBefore))
  const [savingDays, setSavingDays] = useState(false)

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

  const handleSaveDays = async () => {
    const parsed = Number.parseInt(daysDraft, 10)
    if (Number.isNaN(parsed) || parsed < 1) return
    setSavingDays(true)
    try {
      await onChangeDaysBefore(parsed)
    } finally {
      setSavingDays(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-[#204983]" />
        <h2 className="text-base font-bold text-gray-800">Recordatorio de cierre por WhatsApp</h2>
      </div>
      <p className="text-sm text-gray-500">
        Cuando falten los días configurados para el cierre de cualquier presentación abierta, se manda un WhatsApp a
        todos los números activos de la lista. Si se pasa la fecha y todavía no se cerró, se manda un recordatorio
        adicional una vez por día hasta que se cierre (nunca se cierra sola).
      </p>

      <div className="flex items-center gap-2">
        <Label htmlFor="days-before" className="text-sm text-gray-700">
          Avisar con
        </Label>
        <Input
          id="days-before"
          type="number"
          min="1"
          className="h-8 w-20 text-sm"
          value={daysDraft}
          onChange={(e) => setDaysDraft(e.target.value)}
        />
        <span className="text-sm text-gray-700">días de anticipación</span>
        <Button size="sm" variant="outline" className="h-8" disabled={savingDays || daysDraft === String(daysBefore)} onClick={handleSaveDays}>
          {savingDays ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}
        </Button>
      </div>

      <div className="space-y-2 border-t border-gray-100 pt-3">
        {phones.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-gray-100 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800">{p.label}</p>
              <p className="truncate text-xs text-gray-500">{p.phone}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Switch checked={p.active} onCheckedChange={(v) => onTogglePhone(p.id, v)} className="data-[state=checked]:bg-[#204983]" />
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
