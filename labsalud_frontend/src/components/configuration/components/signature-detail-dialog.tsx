"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Loader2, Star, Trash2 } from "lucide-react"
import type { Signature } from "@/types"

interface SignatureDetailDialogProps {
  signature: Signature | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSetDefault: (id: number) => void
  onDelete: (id: number) => void
  actionId: number | null
}

export function SignatureDetailDialog({
  signature,
  open,
  onOpenChange,
  onSetDefault,
  onDelete,
  actionId,
}: SignatureDetailDialogProps) {
  if (!signature) return null
  const busy = actionId === signature.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-1 border-b border-gray-100 p-5 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {signature.name}
            {signature.is_default && (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Predeterminada
              </Badge>
            )}
          </DialogTitle>
          {(signature.biochemist_name || signature.biochemist_mp) && (
            <DialogDescription>
              {signature.biochemist_name}
              {signature.biochemist_name && signature.biochemist_mp ? " · " : ""}
              {signature.biochemist_mp ? `M.P. ${signature.biochemist_mp}` : ""}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vista previa</p>
          <div className="flex h-40 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
            {signature.image_url ? (
              <img src={signature.image_url} alt={signature.name} className="max-h-32 object-contain" />
            ) : (
              <span className="text-sm text-gray-400">Sin imagen</span>
            )}
          </div>
        </div>

        <div className="space-y-2 border-t border-gray-100 bg-gray-50/60 p-4">
          {!signature.is_default && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => onSetDefault(signature.id)} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Star className="mr-1.5 h-4 w-4" />}
              Marcar como predeterminada
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => onDelete(signature.id)}
            disabled={busy}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Eliminar firma
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
