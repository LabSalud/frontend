"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  aClaveDeDia,
  comoFechaCorta,
  deClaveDeDia,
  diasEntre,
  hoy,
} from "@/lib/dias"

/**
 * Rango de fechas como lo eligen los buscadores de vuelos y de hoteles.
 *
 * POR QUÉ NO DOS `<input type="date">`
 * ====================================
 * Con dos inputs sueltos hay que pensar el rango dos veces, en dos calendarios
 * distintos, sin ver nunca los dos extremos juntos. Y encima se puede escribir
 * un "hasta" anterior al "desde", que es un estado inválido que después hay
 * que atajar. Acá el rango se dibuja: primer click la punta de arranque,
 * segundo click la de cierre, y entre medio el camino se pinta solo al pasar
 * el mouse. Si el segundo click cae antes del primero, se toma como arranque
 * nuevo en vez de rechazarlo — nadie quiso elegir un rango al revés.
 *
 * Dos meses a la vista porque los rangos que se consultan cruzan el fin de mes
 * más veces de las que uno cree, y con un mes solo eso son dos navegaciones y
 * perder de vista la punta que ya se eligió.
 *
 * SIN LIBRERÍA
 * ============
 * El proyecto no tiene ninguna de calendario, y meter una por esto serían
 * decenas de KB para dibujar una grilla de siete columnas.
 */
interface Props {
  /** Punta de arranque. Vacío = todavía no se eligió ningún rango. */
  desde: string
  /** Punta de cierre. Vacío = todavía no se eligió ningún rango. */
  hasta: string
  onChange: (desde: string, hasta: string) => void
  /** Qué dice el botón sin rango elegido. */
  placeholder?: string
  /** Si se pasa, aparece "Sin filtro de fecha" para volver a dejarlo vacío.
   * Solo tiene sentido donde el rango es opcional, como el log de auditoría:
   * en el libro diario siempre hay un rango. */
  onLimpiar?: () => void
  /** Nada después de este día. Por defecto hoy: no se consulta el futuro. */
  max?: string
  min?: string
  className?: string
  /** Atajos que se ofrecen debajo del calendario. */
  atajos?: Array<{ label: string; desde: string; hasta: string }>
}

const DIAS = ["lu", "ma", "mi", "ju", "vi", "sá", "do"]

const FORMATO_MES = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" })

/** Las celdas de un mes, con los huecos del principio para que caiga en su día. */
function celdasDelMes(ancla: Date): Array<string | null> {
  const anio = ancla.getFullYear()
  const mes = ancla.getMonth()
  const primero = new Date(anio, mes, 1)
  // getDay() da 0 para domingo; acá la semana arranca el lunes.
  const huecos = (primero.getDay() + 6) % 7
  const cantidad = new Date(anio, mes + 1, 0).getDate()

  return [
    ...Array<string | null>(huecos).fill(null),
    ...Array.from({ length: cantidad }, (_, i) => aClaveDeDia(new Date(anio, mes, i + 1))),
  ]
}

export function DateRangePicker({
  desde,
  hasta,
  onChange,
  placeholder = "Elegir fechas",
  onLimpiar,
  max = hoy(),
  min,
  className,
  atajos,
}: Props) {
  const [abierto, setAbierto] = useState(false)
  // La punta que ya se eligió mientras el rango está a medio hacer.
  const [arranque, setArranque] = useState<string | null>(null)
  const [encima, setEncima] = useState<string | null>(null)
  const [mesIzquierdo, setMesIzquierdo] = useState(() => deClaveDeDia(desde || hoy()))

  // Al abrir, el calendario se para donde está el rango actual y se limpia
  // cualquier selección a medias que haya quedado de la vez anterior.
  useEffect(() => {
    if (!abierto) return
    setArranque(null)
    setEncima(null)
    setMesIzquierdo(deClaveDeDia(desde || hoy()))
  }, [abierto, desde])

  const mesDerecho = useMemo(
    () => new Date(mesIzquierdo.getFullYear(), mesIzquierdo.getMonth() + 1, 1),
    [mesIzquierdo],
  )

  // Lo que se pinta: el rango guardado, o el que se está por elegir.
  const [pintaDesde, pintaHasta] = useMemo(() => {
    if (!arranque) return [desde, hasta]
    if (!encima) return [arranque, arranque]
    return diasEntre(arranque, encima) >= 0 ? [arranque, encima] : [encima, arranque]
  }, [arranque, encima, desde, hasta])

  const elegir = (dia: string) => {
    if (!arranque) {
      setArranque(dia)
      return
    }
    // Segundo click antes del primero: nadie quiso un rango al revés, así que
    // se reinterpreta como una punta de arranque nueva.
    if (diasEntre(arranque, dia) < 0) {
      setArranque(dia)
      return
    }
    onChange(arranque, dia)
    setArranque(null)
    setEncima(null)
    setAbierto(false)
  }

  const fueraDeRango = (dia: string) =>
    Boolean(max && diasEntre(dia, max) < 0) || Boolean(min && diasEntre(min, dia) < 0)

  const renderMes = (ancla: Date) => (
    <div className="w-64">
      <p className="mb-2 text-center text-sm font-semibold capitalize text-gray-700">
        {FORMATO_MES.format(ancla)}
      </p>
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {DIAS.map((d) => (
          <span key={d} className="text-center text-[10px] font-medium uppercase text-gray-400">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {celdasDelMes(ancla).map((dia, i) => {
          if (!dia) return <span key={`hueco-${i}`} />

          const deshabilitado = fueraDeRango(dia)
          const esArranque = dia === pintaDesde
          const esCierre = dia === pintaHasta
          const adentro =
            !!pintaDesde && !!pintaHasta &&
            diasEntre(pintaDesde, dia) >= 0 && diasEntre(dia, pintaHasta) >= 0
          const esHoy = dia === hoy()

          return (
            <button
              key={dia}
              type="button"
              disabled={deshabilitado}
              onClick={() => elegir(dia)}
              onMouseEnter={() => setEncima(dia)}
              className={cn(
                "relative h-8 rounded text-xs font-medium transition-colors",
                deshabilitado && "cursor-not-allowed text-gray-300",
                !deshabilitado && !adentro && "text-gray-700 hover:bg-[#204983]/10",
                adentro && !esArranque && !esCierre && "bg-[#204983]/15 text-[#204983]",
                (esArranque || esCierre) && "bg-[#204983] font-bold text-white",
                esHoy && !esArranque && !esCierre && "ring-1 ring-inset ring-[#204983]/40",
              )}
            >
              {deClaveDeDia(dia).getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )

  // Sin rango elegido el botón dice el placeholder: `comoFechaCorta("")`
  // imprimiría "//" y eso no le dice nada a nadie.
  const sinRango = !desde || !hasta
  const etiqueta = sinRango
    ? placeholder
    : desde === hasta
      ? comoFechaCorta(desde)
      : `${comoFechaCorta(desde)} — ${comoFechaCorta(hasta)}`

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-9 justify-start gap-2 font-normal", className)}>
          <CalendarDays className="h-4 w-4 shrink-0 text-[#204983]" />
          <span className={cn("truncate", sinRango && "text-gray-500")}>{etiqueta}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3" onMouseLeave={() => setEncima(null)}>
        <div className="mb-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() =>
              setMesIzquierdo(new Date(mesIzquierdo.getFullYear(), mesIzquierdo.getMonth() - 1, 1))
            }
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-xs text-gray-500">
            {arranque
              ? "Elegí la fecha de cierre"
              : "Elegí la fecha de inicio"}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() =>
              setMesIzquierdo(new Date(mesIzquierdo.getFullYear(), mesIzquierdo.getMonth() + 1, 1))
            }
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-4">
          {renderMes(mesIzquierdo)}
          <div className="hidden sm:block">{renderMes(mesDerecho)}</div>
        </div>

        {(atajos?.length || onLimpiar) && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
            {onLimpiar && (
              <button
                type="button"
                onClick={() => {
                  onLimpiar()
                  setArranque(null)
                  setEncima(null)
                  setAbierto(false)
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  sinRango
                    ? "border-[#204983] bg-[#204983] text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50",
                )}
              >
                Sin filtro de fecha
              </button>
            )}
            {atajos?.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  onChange(a.desde, a.hasta)
                  setArranque(null)
                  setEncima(null)
                  setAbierto(false)
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  a.desde === desde && a.hasta === hasta
                    ? "border-[#204983] bg-[#204983] text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
