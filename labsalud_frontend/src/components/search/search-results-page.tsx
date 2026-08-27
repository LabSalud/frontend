"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  FlaskConical,
  Loader2,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  buildGlobalSearchPath,
  GLOBAL_SEARCH_FILTROS_CON_PERMISO,
  GLOBAL_SEARCH_MIN_CHARS,
  useGlobalSearchPorTipo,
} from "@/hooks/use-global-search"
import useAuth from "@/contexts/auth-context"
import type { GlobalSearchItem, GlobalSearchType } from "@/types"
import { SearchTypeColumn, type MetaDeTipo } from "./search-type-column"

/**
 * Búsqueda: una columna por tipo, en carrusel.
 *
 * POR QUÉ COLUMNAS Y NO UNA TABLA
 * ===============================
 * Los cinco tipos no compiten por el mismo lugar: quien busca un apellido
 * quiere ver al paciente Y sus protocolos, no una lista ordenada por
 * relevancia donde 20 validaciones tapan al paciente. Con una columna por tipo
 * cada uno tiene su espacio garantizado, y el backend las manda todas de una
 * (`?group=type`) sin buscar cinco veces.
 *
 * Se pasa de una a otra deslizando —el contenedor scrollea de costado y cada
 * columna es un punto de anclaje— o con los botones del costado, que en
 * pantallas sin touch son la única forma cómoda.
 *
 * El buscador vive en su propia barra fina arriba y no se mueve: son las
 * columnas las que scrollean por dentro, no la página. Cambiar el término sin
 * perder de vista lo que hay abajo es la mitad de una búsqueda.
 */

/**
 * Color, ícono y etiqueta de cada columna. El `Record` completo no es
 * decorativo: agregar un tipo nuevo en el backend rompe acá hasta que alguien
 * decida cómo se ve, en vez de dibujar una columna gris sin nombre.
 */
const META: Record<GlobalSearchType, MetaDeTipo> = {
  patient: {
    label: "Pacientes",
    icon: User,
    chip: "border-[#204983]/25 bg-[#204983]/10 text-[#204983]",
    vacio: "Ningún paciente",
  },
  protocol: {
    label: "Protocolos",
    icon: FileText,
    chip: "border-amber-200 bg-amber-50/90 text-amber-700",
    vacio: "Ningún protocolo",
  },
  result: {
    label: "Resultados",
    icon: FlaskConical,
    chip: "border-cyan-200 bg-cyan-50/90 text-cyan-700",
    vacio: "Ningún resultado",
  },
  validation: {
    label: "Validaciones",
    icon: ShieldCheck,
    chip: "border-emerald-200 bg-emerald-50/90 text-emerald-700",
    vacio: "Ninguna validación",
  },
  ledger: {
    label: "Libro diario",
    icon: BookOpen,
    chip: "border-violet-200 bg-violet-50/90 text-violet-700",
    vacio: "Ningún movimiento",
  },
}

/**
 * Lo que se puede tipear. Están las combinaciones a propósito: la búsqueda
 * cruza las palabras entre sí —el paciente por un lado y el análisis por
 * otro— y eso nadie lo descubre solo.
 */
const SEARCH_HINTS = [
  { label: "Paciente", example: "Pérez, María" },
  { label: "DNI", example: "30123456" },
  { label: "N° de protocolo", example: "4822" },
  { label: "Análisis", example: "hemograma" },
  { label: "Paciente + análisis", example: "perez orina" },
  { label: "Paciente + protocolo", example: "perez 4822" },
  { label: "Estado de pago", example: "perez debe" },
  { label: "Cobros", example: "coseguro · efectivo · 18400" },
]

/**
 * Con `counts_capped` el backend dejó de contar en un tope, así que los conteos
 * que llegaron a ese tope son un piso ("1000+"), no un total.
 */
function formatCount(value: number, cap: number | undefined, capped: boolean) {
  if (!capped || !cap) return String(value)
  return value >= cap ? `${value}+` : String(value)
}

/** Separación entre columnas, en píxeles. Tiene que coincidir con el `gap-3`. */
const GAP = 12

function EstadoVacio({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/80 px-4 py-14 text-center backdrop-blur-sm">
      <Icon className="h-8 w-8 text-gray-300" />
      <p className="mt-3 text-sm font-medium text-gray-700">{title}</p>
      <div className="mt-1 text-sm text-gray-500">{description}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export default function SearchResultsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasPermission } = useAuth()

  const urlTerm = searchParams.get("q") ?? ""
  const [inputValue, setInputValue] = useState(urlTerm)

  // La URL manda: si cambia (Enter en la navbar, botón atrás, link compartido)
  // el input tiene que reflejar lo que se está mostrando.
  useEffect(() => {
    setInputValue(urlTerm)
  }, [urlTerm])

  const { state, columnas, counts, countsCapped, countsCap, tookMs, searchedTerm, error, isFetching, refetch, cargarMas } =
    useGlobalSearchPorTipo({ term: urlTerm })

  // Un tipo que este usuario no puede ver no se ofrece: el backend ya lo manda
  // vacío, y una columna que siempre dice "ninguno" se lee como "no hay nada",
  // no como "no lo podés ver".
  const visibles = columnas.filter((columna) => {
    const permiso = GLOBAL_SEARCH_FILTROS_CON_PERMISO[columna.tipo]
    return !permiso || hasPermission(permiso)
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const term = inputValue.trim()
    if (term.length < GLOBAL_SEARCH_MIN_CHARS) return
    navigate(buildGlobalSearchPath({ q: term }))
  }

  const limpiar = () => {
    setInputValue("")
    // Sin término la pantalla queda en su estado inicial, pero sigue siendo una
    // URL válida y compartible (por eso se navega en vez de solo limpiar).
    setSearchParams({}, { replace: true })
  }

  // --- el carrusel -------------------------------------------------------
  const pista = useRef<HTMLDivElement>(null)
  const [puedeIzquierda, setPuedeIzquierda] = useState(false)
  const [puedeDerecha, setPuedeDerecha] = useState(false)
  const [activa, setActiva] = useState(0)

  const revisarPosicion = useCallback(() => {
    const el = pista.current
    if (!el) return
    // El margen de 4px es para el rebote elástico y para los redondeos de
    // ancho: sin él, el botón de la derecha queda habilitado en el final.
    setPuedeIzquierda(el.scrollLeft > 4)
    setPuedeDerecha(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)

    const primera = el.firstElementChild as HTMLElement | null
    const paso = primera ? primera.offsetWidth + GAP : el.clientWidth
    setActiva(paso > 0 ? Math.round(el.scrollLeft / paso) : 0)
  }, [])

  useEffect(() => {
    const el = pista.current
    if (!el) return
    revisarPosicion()
    el.addEventListener("scroll", revisarPosicion, { passive: true })
    window.addEventListener("resize", revisarPosicion)
    return () => {
      el.removeEventListener("scroll", revisarPosicion)
      window.removeEventListener("resize", revisarPosicion)
    }
    // `searchedTerm` está en las dependencias porque la pista se remonta con
    // cada búsqueda (`key`): sin esto el listener quedaría enganchado al nodo
    // viejo y los botones del costado se congelarían en el estado anterior.
  }, [revisarPosicion, visibles.length, state, searchedTerm])

  const mover = (direccion: -1 | 1) => {
    const el = pista.current
    if (!el) return
    const primera = el.firstElementChild as HTMLElement | null
    // Una columna por click. Si por lo que sea no hay ninguna, se mueve casi
    // una pantalla, que es lo que hace cualquier carrusel.
    const paso = primera ? primera.offsetWidth + GAP : el.clientWidth * 0.9
    el.scrollBy({ left: direccion * paso, behavior: "smooth" })
  }

  const irA = (indice: number) => {
    const el = pista.current
    if (!el) return
    const primera = el.firstElementChild as HTMLElement | null
    const paso = primera ? primera.offsetWidth + GAP : el.clientWidth
    el.scrollTo({ left: indice * paso, behavior: "smooth" })
  }

  const abrir = (item: GlobalSearchItem) => navigate(item.url)

  const totalEncontrado = counts.all ?? 0

  return (
    <div className="w-full overflow-x-hidden py-4">
      {/* LA BARRA. Fina y todo en una fila: título, buscador y el resumen de
          lo que se encontró. Es lo único fijo de la pantalla. */}
      <div className="flex items-center gap-3 rounded-2xl bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm md:px-4">
        <h1 className="hidden shrink-0 items-center gap-2 text-base font-bold text-gray-800 sm:flex">
          <Search className="h-4 w-4 text-[#204983]" />
          Búsqueda
        </h1>

        <form role="search" onSubmit={handleSubmit} className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 sm:hidden" />
          <Input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Paciente, DNI, N° de protocolo o análisis…"
            aria-label="Buscar"
            autoComplete="off"
            spellCheck={false}
            className="h-9 pl-9 pr-16 sm:pl-3"
          />
          {isFetching && (
            <Loader2 className="pointer-events-none absolute right-9 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#204983]" />
          )}
          {inputValue && (
            <button
              type="button"
              onClick={limpiar}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {state === "results" && (
          <p className="hidden shrink-0 text-xs text-gray-500 tabular-nums lg:block">
            {formatCount(totalEncontrado, countsCap, countsCapped)} resultados
            {typeof tookMs === "number" && ` · ${Math.round(tookMs)} ms`}
          </p>
        )}
      </div>

      <div className="mt-3">
        {state === "idle" && (
          <EstadoVacio
            icon={Search}
            title="Escribí algo para buscar"
            description={
              <>
                <span>Mínimo {GLOBAL_SEARCH_MIN_CHARS} caracteres. Después, Enter.</span>
                <div className="mt-4 grid grid-cols-1 gap-1.5 text-left sm:grid-cols-2">
                  {SEARCH_HINTS.map((hint) => (
                    <div key={hint.label} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">
                        {hint.label}
                      </span>
                      <span className="truncate text-gray-400">ej. {hint.example}</span>
                    </div>
                  ))}
                </div>
              </>
            }
          />
        )}

        {state === "error" && (
          <EstadoVacio
            icon={AlertCircle}
            title="La búsqueda falló"
            description={error instanceof Error ? error.message : "No se pudo completar la búsqueda"}
            action={
              <Button variant="outline" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          />
        )}

        {state === "empty" && (
          <EstadoVacio
            icon={Search}
            title={`Sin resultados para «${searchedTerm}»`}
            description="Probá con el apellido, el DNI sin puntos o el número de protocolo."
          />
        )}

        {(state === "loading" || state === "results") && (
          <div className="relative">
            {/* Los botones del costado. Van por encima de la pista y se
                esconden en touch, donde el gesto natural es deslizar. */}
            <button
              type="button"
              onClick={() => mover(-1)}
              disabled={!puedeIzquierda}
              aria-label="Ver los tipos anteriores"
              className={cn(
                "absolute -left-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-md backdrop-blur transition-all sm:flex",
                "hover:border-[#204983]/40 hover:text-[#204983]",
                "disabled:pointer-events-none disabled:opacity-0",
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => mover(1)}
              disabled={!puedeDerecha}
              aria-label="Ver los tipos siguientes"
              className={cn(
                "absolute -right-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-md backdrop-blur transition-all sm:flex",
                "hover:border-[#204983]/40 hover:text-[#204983]",
                "disabled:pointer-events-none disabled:opacity-0",
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* LA PISTA. `snap-x` hace que cada columna quede encuadrada sola
                al soltar el dedo; sin eso el deslizar termina siempre a mitad
                de camino entre dos. La `key` es el término: una búsqueda nueva
                remonta las tarjetas y la animación de entrada vuelve a correr. */}
            <div
              key={searchedTerm}
              ref={pista}
              className="sin-barra-de-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1"
            >
              {visibles.map((columna) => (
                <SearchTypeColumn
                  key={columna.tipo}
                  columna={columna}
                  meta={META[columna.tipo]}
                  cargando={state === "loading"}
                  total={formatCount(columna.total, countsCap, countsCapped)}
                  onAbrir={abrir}
                  onCargarMas={() => void cargarMas(columna.tipo)}
                />
              ))}
            </div>

            {/* Los puntitos: en mobile entra una columna sola y sin esto no hay
                forma de saber cuántas hay ni en cuál se está. */}
            <div className="mt-1 flex items-center justify-center gap-1.5 sm:hidden">
              {visibles.map((columna, indice) => (
                <button
                  key={columna.tipo}
                  type="button"
                  onClick={() => irA(indice)}
                  aria-label={`Ir a ${META[columna.tipo].label}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    indice === activa ? "w-5 bg-[#204983]" : "w-1.5 bg-gray-300",
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
