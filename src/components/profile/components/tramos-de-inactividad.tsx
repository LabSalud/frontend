"use client"

import { useState } from "react"
import { Clock, Plus, Trash2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { USER_ENDPOINTS } from "@/config/api"
import { formatApiError } from "@/lib/api-error"
import {
  minutosDeInactividadAhora,
  type TramoDeInactividad,
} from "@/lib/idle-config"
import { cn } from "@/lib/utils"

/**
 * Los horarios en los que la sesión dura distinto.
 *
 * POR QUÉ EXISTE
 * ==============
 * El cierre por inactividad era uno solo para las 24 horas, y el día del
 * laboratorio no es uno solo. De 7:30 a 13:30 hay gente y la computadora queda
 * a la vista: cinco minutos es lo correcto. A las tres de la tarde, con la
 * bioquímica sola cargando resultados, esos mismos cinco minutos son una pelea
 * cada vez que atiende el teléfono.
 *
 * Se guarda aparte del resto del perfil —y no con el `FormData` de la foto—
 * porque es una lista: mandarla dentro de un multipart la convertiría en texto
 * y el servidor tendría que adivinar que adentro hay JSON.
 */
export function TramosDeInactividad({
  tramos,
  minutosPorDefecto,
  onGuardado,
}: {
  tramos: TramoDeInactividad[]
  /** Lo que rige en las horas que no cubre ningún tramo. */
  minutosPorDefecto: number
  onGuardado: (tramos: TramoDeInactividad[]) => void
}) {
  const { apiRequest } = useApi()
  const toast = useToast()
  const [borrador, setBorrador] = useState<TramoDeInactividad[]>(tramos)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cambiar = (indice: number, campo: keyof TramoDeInactividad, valor: string) => {
    setError(null)
    setBorrador((prev) =>
      prev.map((tramo, i) =>
        i !== indice
          ? tramo
          : { ...tramo, [campo]: campo === "minutos" ? Number(valor) : valor },
      ),
    )
  }

  const agregar = () => {
    setError(null)
    // Un tramo nuevo arranca con el horario de atención, que es el caso que
    // motivó todo esto: quien lo agrega casi siempre viene a poner eso.
    setBorrador((prev) => [...prev, { desde: "07:30", hasta: "13:30", minutos: 5 }])
  }

  const quitar = (indice: number) => {
    setError(null)
    setBorrador((prev) => prev.filter((_, i) => i !== indice))
  }

  const guardar = async () => {
    setGuardando(true)
    setError(null)
    try {
      const respuesta = await apiRequest(USER_ENDPOINTS.ME, {
        method: "PATCH",
        body: { tramos_de_inactividad: borrador },
      })
      const cuerpo = await respuesta.json().catch(() => ({}))
      if (!respuesta.ok) {
        // El mensaje del servidor explica QUÉ tramo está mal y por qué; se
        // muestra tal cual, al lado del formulario y no en un toast que se va.
        setError(formatApiError(cuerpo, "No se pudieron guardar los horarios."))
        return
      }
      const guardados: TramoDeInactividad[] = cuerpo.tramos_de_inactividad ?? []
      setBorrador(guardados)
      onGuardado(guardados)
      toast.success("Horarios guardados", {
        description: "El tiempo de inactividad cambia solo según la hora.",
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar los horarios.")
    } finally {
      setGuardando(false)
    }
  }

  const rigeAhora = minutosDeInactividadAhora(borrador, minutosPorDefecto)
  const hayCambios = JSON.stringify(borrador) !== JSON.stringify(tramos)

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-sm">Horarios con otro tiempo de inactividad</Label>
          <p className="mt-1 text-xs text-gray-500">
            En la franja que pongas, la sesión se cierra con ese tiempo. Las horas
            que no cubras usan los {minutosPorDefecto} minutos de arriba.
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-[#204983]/10 px-2 py-1 text-xs font-medium text-[#204983]">
          Ahora: {rigeAhora} min
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {borrador.length === 0 && (
          <p className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400">
            Sin horarios: la sesión dura {minutosPorDefecto} minutos todo el día.
          </p>
        )}

        {borrador.map((tramo, indice) => (
          <div key={indice} className="flex flex-wrap items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-gray-400" />
            <Input
              type="time"
              value={tramo.desde}
              onChange={(e) => cambiar(indice, "desde", e.target.value)}
              aria-label="Desde"
              className="h-9 w-[7.5rem]"
            />
            <span className="text-xs text-gray-500">a</span>
            <Input
              type="time"
              value={tramo.hasta}
              onChange={(e) => cambiar(indice, "hasta", e.target.value)}
              aria-label="Hasta"
              className="h-9 w-[7.5rem]"
            />
            <span className="text-xs text-gray-500">cierra a los</span>
            <Input
              type="number"
              min={1}
              max={1440}
              value={tramo.minutos}
              onChange={(e) => cambiar(indice, "minutos", e.target.value)}
              aria-label="Minutos"
              className="h-9 w-20"
            />
            <span className="text-xs text-gray-500">min</span>
            <button
              type="button"
              onClick={() => quitar(indice)}
              aria-label="Quitar este horario"
              className="ml-auto rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={agregar}>
          <Plus className="mr-1 h-4 w-4" />
          Agregar horario
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={guardar}
          disabled={guardando || !hayCambios}
          className={cn("bg-[#204983] hover:bg-[#1a3d6f]")}
        >
          {guardando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Guardar horarios
        </Button>
        {hayCambios && !guardando && (
          <span className="text-xs text-amber-700">Hay cambios sin guardar</span>
        )}
      </div>
    </div>
  )
}
