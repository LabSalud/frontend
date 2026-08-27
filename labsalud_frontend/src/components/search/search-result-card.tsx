"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDniForDisplay } from "@/lib/dni"
import { formatUtcDate } from "@/lib/format-utils"
import { getProtocolStatusBadgeClassByName } from "@/lib/status-styles"
import type { GlobalSearchItem } from "@/types"

/**
 * Un resultado de la búsqueda, como tarjeta.
 *
 * Es la unidad de la columna de su tipo, así que la tarjeta NO repite el tipo:
 * ya lo dice el encabezado de la columna. Lo que muestra es lo que distingue a
 * un resultado del de al lado —quién es, de qué protocolo, en qué estado y de
 * cuándo—, en ese orden.
 */
export function SearchResultCard({
  item,
  onClick,
  /** Posición dentro de la columna: escalona la animación de entrada. */
  index = 0,
}: {
  item: GlobalSearchItem
  onClick: () => void
  index?: number
}) {
  // El paciente solo cuando agrega algo: en una tarjeta de paciente el nombre
  // ya es el título y repetirlo abajo es ruido.
  const muestraPaciente = Boolean(item.patient) && item.patient?.name !== item.title
  const dni = muestraPaciente ? formatDniForDisplay(item.patient?.dni) : ""
  // El estado del libro es un saldo ("Debe $ 500,00"), no un estado de
  // protocolo: por la paleta de estados saldría gris, que se lee como "sin dato".
  const esEstadoDeProtocolo = item.type !== "ledger"

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        // Escalonado y con tope: a partir de la décima tarjeta el retraso deja
        // de crecer, o el final de una columna larga entraría un segundo tarde.
        animationDelay: `${Math.min(index, 10) * 35}ms`,
        animationFillMode: "both",
      }}
      className={cn(
        "w-full rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-[#204983]/40 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204983]/40",
        // La entrada: bajan. Con `motion-safe` para que quien pidió menos
        // movimiento en el sistema las vea puestas, no cayendo.
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-3 motion-safe:duration-300",
      )}
    >
      <p className="truncate font-semibold text-gray-900">{item.title}</p>

      {(item.subtitle || item.matched_on) && (
        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
          {item.subtitle}
          {item.subtitle && item.matched_on && <span className="text-gray-300"> · </span>}
          {item.matched_on && <span className="text-gray-400">coincide por {item.matched_on}</span>}
        </p>
      )}

      {muestraPaciente && (
        <p className="mt-1 truncate text-xs text-gray-600">
          {item.patient?.name}
          {dni && <span className="text-gray-400"> · DNI {dni}</span>}
        </p>
      )}

      {(item.status || item.date) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {item.status ? (
            <Badge
              variant="outline"
              className={cn(
                "max-w-[70%] truncate text-[10px]",
                esEstadoDeProtocolo
                  ? getProtocolStatusBadgeClassByName(item.status, true)
                  : "border-violet-200 bg-violet-50 text-violet-700",
              )}
            >
              <span className="truncate">{item.status}</span>
            </Badge>
          ) : (
            <span />
          )}
          {item.date && (
            <span className="shrink-0 text-[11px] tabular-nums text-gray-400">
              {formatUtcDate(item.date)}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
