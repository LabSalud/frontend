"use client"

import type React from "react"
import { Loader2 } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { cn } from "@/lib/utils"
import type { ColumnaDeBusqueda } from "@/hooks/use-global-search"
import type { GlobalSearchItem } from "@/types"
import { SearchResultCard } from "./search-result-card"

export interface MetaDeTipo {
  label: string
  icon: React.ElementType
  /** Clases del encabezado: dan el color de la columna. */
  chip: string
  vacio: string
}

/**
 * Una columna del carrusel: todos los resultados de un tipo.
 *
 * El encabezado queda AFUERA del contenedor que scrollea, así que no se mueve
 * cuando la lista es larga: no hay que subir para saber qué se está mirando.
 */
export function SearchTypeColumn({
  columna,
  meta,
  cargando,
  total,
  onAbrir,
  onCargarMas,
}: {
  columna: ColumnaDeBusqueda
  meta: MetaDeTipo
  /** La búsqueda entera está en vuelo: la columna muestra su esqueleto. */
  cargando: boolean
  /** El total ya formateado (puede venir con "+" si el backend cortó de contar). */
  total: string
  onAbrir: (item: GlobalSearchItem) => void
  onCargarMas: () => void
}) {
  const Icono = meta.icon

  // Scroll infinito, el mismo de protocolos y pacientes: cuando el centinela
  // del final asoma, se pide el lote siguiente de ESTA columna. `dependencies`
  // lleva la cantidad para que, si el lote entró entero sin llenar la columna,
  // el observer vuelva a leer y encadene el que sigue.
  const centinelaRef = useInfiniteScroll({
    loading: columna.cargandoMas,
    hasMore: columna.hayMas,
    onLoadMore: onCargarMas,
    dependencies: [columna.items.length],
  })

  return (
    <section
      className={cn(
        // `basis` y no `w-`: es un item de flex que no se encoge. En mobile
        // entra una sola y el resto asoma apenas, que es lo que le dice a la
        // mano que hay más para el costado.
        "flex min-w-0 shrink-0 snap-start flex-col",
        "basis-[86%] sm:basis-[48%] lg:basis-[32%] xl:basis-[24%] 2xl:basis-[19.5%]",
      )}
      aria-label={meta.label}
    >
      <header
        className={cn(
          "mb-2 flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
          meta.chip,
        )}
      >
        <Icono className="h-4 w-4 shrink-0" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{meta.label}</h2>
        {!cargando && (
          <span className="shrink-0 rounded-full bg-white/70 px-1.5 text-[11px] font-medium tabular-nums">
            {total}
          </span>
        )}
      </header>

      {/* La columna scrollea sola: la página se queda quieta y el buscador de
          arriba no se va nunca de la pantalla. */}
      <div className="sin-barra-de-scroll flex max-h-[calc(100dvh-17rem)] min-h-[8rem] flex-col gap-2 overflow-y-auto pb-1">
        {cargando ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[86px] w-full rounded-xl" />
            ))}
          </>
        ) : columna.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-xs text-gray-400">
            {meta.vacio}
          </p>
        ) : (
          <>
            {columna.items.map((item, indice) => (
              <SearchResultCard
                key={`${item.type}-${item.id}`}
                item={item}
                index={indice}
                onClick={() => onAbrir(item)}
              />
            ))}

            {columna.hayMas && (
              // El centinela va en un elemento con altura: uno de 0px puede no
              // llegar a intersectar nunca dentro de un contenedor que scrollea.
              <div ref={centinelaRef} className="flex h-9 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
