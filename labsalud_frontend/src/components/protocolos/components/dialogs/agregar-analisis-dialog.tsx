"use client"

import { useState } from "react"
import { Loader2, Plus } from "lucide-react"

import { AnalysisSearch } from "@/components/ingreso/components/analysis-search"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { SelectedAnalysis } from "@/types"

/**
 * Agregar análisis a un protocolo que ya existe.
 *
 * USA EL MISMO BUSCADOR QUE EL INGRESO
 * ====================================
 * No es sólo por no repetir código: el buscador ya sabe filtrar obsoletos,
 * mostrar los módulos y no ofrecer dos veces lo mismo. Un segundo buscador
 * distinto acá terminaría con otras reglas, y agregar un análisis desde el
 * detalle no debería comportarse distinto que cargarlo al principio.
 *
 * QUÉ SE MANDA
 * ============
 * Solo los ids. Las UB, los precios y la autorización los resuelve el backend
 * con el nomenclador de la obra social del protocolo — que es el mismo cálculo
 * de siempre, y no algo que la pantalla pueda adivinar.
 *
 * EL ACTO BIOQUÍMICO TAMBIÉN SE PUEDE AGREGAR
 * ===========================================
 * Ya no se pone solo al cargar el protocolo, así que el que se olvidó en el
 * ingreso hay que poder sumarlo desde acá. Cobrarlo dos veces no es un riesgo:
 * el buscador no ofrece los análisis que el protocolo ya tiene, y el backend
 * rebota el duplicado igual.
 */

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Los que el protocolo ya tiene: id del ANÁLISIS y su código.
   *
   * El id del análisis y no el del detalle — son cosas distintas y el buscador
   * deduplica por análisis. El código lo usa el buscador para dejar los actos
   * bioquímicos arriba de la lista.
   */
  yaEstan: { id: number; code: string }[]
  onAgregar: (analysisIds: number[]) => Promise<void>
}

export function AgregarAnalisisDialog({ open, onOpenChange, yaEstan, onAgregar }: Props) {
  const [elegidos, setElegidos] = useState<SelectedAnalysis[]>([])
  const [guardando, setGuardando] = useState(false)

  const cerrar = (abierto: boolean) => {
    if (!abierto) setElegidos([])
    onOpenChange(abierto)
  }

  const confirmar = async () => {
    if (elegidos.length === 0) return
    setGuardando(true)
    try {
      await onAgregar(elegidos.map((a) => a.id))
      setElegidos([])
      onOpenChange(false)
    } finally {
      setGuardando(false)
    }
  }

  // El buscador recibe los ya elegidos MÁS los que el protocolo ya tiene, así
  // no ofrece un análisis que va a rebotar del backend por duplicado.
  const idsQueYaEstan = yaEstan.map((a) => a.id)
  const paraElBuscador: SelectedAnalysis[] = [
    ...elegidos,
    ...yaEstan
      .filter((a) => !elegidos.some((e) => e.id === a.id))
      .map((a) => ({ id: a.id, code: a.code }) as SelectedAnalysis),
  ]

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar análisis</DialogTitle>
          <DialogDescription>
            Se agregan al final de la lista. El precio y la autorización se
            recalculan con la obra social del protocolo.
          </DialogDescription>
        </DialogHeader>

        <AnalysisSearch
          selectedAnalyses={paraElBuscador}
          onAnalysisChange={(todos) =>
            // El buscador devuelve la lista entera; acá interesan solo los que
            // no estaban en el protocolo.
            setElegidos(todos.filter((a) => !idsQueYaEstan.includes(a.id)))
          }
        />

        {elegidos.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-medium text-gray-600">
              Se van a agregar {elegidos.length}:
            </p>
            <ul className="space-y-1">
              {elegidos.map((a) => (
                <li key={a.id} className="text-sm text-gray-800">
                  · {a.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => cerrar(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            disabled={elegidos.length === 0 || guardando}
            className="bg-[#204983] hover:bg-[#1a3d6f]"
          >
            {guardando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
