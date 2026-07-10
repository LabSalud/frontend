import { useState } from "react"
import { Loader2, Pencil, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDateAR } from "../format"

interface EditableCloseDateProps {
  closeDate: string | null
  onSave: (date: string) => Promise<void>
}

/**
 * Fecha de cierre de la presentación abierta: se puede definir, cambiar o
 * dejar "pendiente" en cualquier momento (no es fija ni obligatoria).
 */
export function EditableCloseDate({ closeDate, onSave }: EditableCloseDateProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(closeDate ?? "")
  const [saving, setSaving] = useState(false)

  const startEditing = () => {
    setDraft(closeDate ?? "")
    setEditing(true)
  }

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input type="date" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="h-8 w-[150px] text-xs" />
        <Button size="sm" className="h-8 w-8 shrink-0 bg-[#204983] p-0" disabled={saving || !draft} onClick={handleSave}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0 text-gray-400" onClick={() => setEditing(false)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className="group inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[#204983]"
    >
      {closeDate ? (
        <>cierra {formatDateAR(closeDate)}</>
      ) : (
        <span className="font-medium text-amber-600">fecha de cierre pendiente</span>
      )}
      <Pencil className="h-3 w-3 text-gray-300 group-hover:text-[#204983]" />
    </button>
  )
}
