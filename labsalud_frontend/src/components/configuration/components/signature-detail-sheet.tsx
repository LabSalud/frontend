"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Loader2, Star, Trash2 } from "lucide-react"
import type { Signature } from "@/types"

interface SignatureDetailSheetProps {
  signature: Signature | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSetDefault: (id: number) => void
  onDelete: (id: number) => void
  actionId: number | null
}

export function SignatureDetailSheet({
  signature,
  open,
  onOpenChange,
  onSetDefault,
  onDelete,
  actionId,
}: SignatureDetailSheetProps) {
  if (!signature) return null
  const busy = actionId === signature.id

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-gray-200 pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            {signature.name}
            {signature.is_default && (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Predeterminada
              </Badge>
            )}
          </SheetTitle>
          {(signature.biochemist_name || signature.biochemist_mp) && (
            <SheetDescription>
              {signature.biochemist_name}
              {signature.biochemist_name && signature.biochemist_mp ? " · " : ""}
              {signature.biochemist_mp ? `M.P. ${signature.biochemist_mp}` : ""}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="space-y-4 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vista previa</p>
          <div className="flex h-40 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
            {signature.image_url ? (
              <img src={signature.image_url} alt={signature.name} className="max-h-32 object-contain" />
            ) : (
              <span className="text-sm text-gray-400">Sin imagen</span>
            )}
          </div>
        </div>

        <div className="mt-auto space-y-2 border-t border-gray-200 p-4">
          <Separator className="mb-2" />
          {!signature.is_default && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onSetDefault(signature.id)}
              disabled={busy}
            >
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
      </SheetContent>
    </Sheet>
  )
}
