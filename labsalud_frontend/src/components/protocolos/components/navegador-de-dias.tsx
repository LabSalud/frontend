"use client"

import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { comoFechaCorta, correrDias, diasEntre, hoy, nombreDelDia } from "@/lib/dias"

/**
 * Ver el listado un día por vez, y moverse de a un día.
 *
 * CÓMO SE USA
 * ===========
 * Apagado hay un solo botón, "Hoy". Al apretarlo el listado se recorta a hoy
 * y aparecen las flechas: la izquierda va al día anterior, la derecha al
 * siguiente. La derecha se apaga en el día de hoy porque no hay protocolos
 * cargados en el futuro, y una flecha que no lleva a ninguna parte es una
 * invitación a apretarla para nada.
 *
 * El input de fecha salta a cualquier día sin tener que llegar flecha por
 * flecha, y la X vuelve al listado completo.
 *
 * UN SOLO ESTADO
 * ==============
 * Las flechas, el botón de hoy y el input escriben todos en `dia`. No hay un
 * "modo hoy" aparte de "modo fecha": estar en hoy es tener `dia` en la fecha
 * de hoy, nada más. Con dos estados habría que decidir qué pasa cuando el
 * input apunta a hoy, y esa es una pregunta que no tiene por qué existir.
 */
interface Props {
  /** El día que se está viendo, o `null` para el listado completo. */
  dia: string | null
  onChange: (dia: string | null) => void
  className?: string
}

export function NavegadorDeDias({ dia, onChange, className }: Props) {
  if (!dia) {
    return (
      <Button
        variant="outline"
        onClick={() => onChange(hoy())}
        className={cn("h-11 gap-2", className)}
      >
        <CalendarDays className="h-4 w-4" />
        Hoy
      </Button>
    )
  }

  const esHoy = diasEntre(dia, hoy()) === 0

  return (
    <div
      className={cn(
        "flex h-11 items-center gap-0.5 rounded-md border border-[#204983] bg-[#204983]/5 pl-0.5 pr-1",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-8 shrink-0 text-[#204983] hover:bg-[#204983]/10"
        onClick={() => onChange(correrDias(dia, -1))}
        title={`Ir a ${comoFechaCorta(correrDias(dia, -1))}`}
        aria-label="Día anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* El input de fecha es también la etiqueta: muestra el día que se está
          viendo y deja saltar a otro sin gastar una fila más de la barra. */}
      <div className="relative">
        <Input
          type="date"
          value={dia}
          max={hoy()}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="h-9 w-[9.5rem] border-transparent bg-transparent px-2 text-sm font-semibold text-[#204983] shadow-none"
          aria-label="Ver otro día"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        disabled={esHoy}
        className="h-9 w-8 shrink-0 text-[#204983] hover:bg-[#204983]/10"
        onClick={() => onChange(correrDias(dia, 1))}
        title={esHoy ? "Ya estás en hoy" : `Ir a ${comoFechaCorta(correrDias(dia, 1))}`}
        aria-label="Día siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <span className="mx-1 hidden text-xs font-semibold text-[#204983] xl:inline">
        {nombreDelDia(dia)}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-8 shrink-0 text-[#204983]/60 hover:bg-[#204983]/10 hover:text-[#204983]"
        onClick={() => onChange(null)}
        title="Ver todos los protocolos"
        aria-label="Cancelar el filtro por día"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
