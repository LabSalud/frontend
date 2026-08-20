"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CATALOG_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import { useApi } from "@/hooks/use-api"
import { useDebounce } from "@/hooks/use-debounce"
import { useToast } from "@/hooks/use-toast"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import { resolverUb, ubPropio } from "@/lib/ub-por-nomenclador"
import type { Analysis, NBU } from "@/types"

/**
 * Buscar un análisis y ponerle el UB en el nomenclador elegido.
 *
 * POR QUÉ REEMPLAZA AL FORMULARIO DE "CÓDIGO + UB"
 * ================================================
 * Antes había que escribir el código de memoria. Un código equivocado no falla:
 * carga el UB en OTRO análisis, y eso recién se descubre cuando un paciente paga
 * de más o de menos. Acá se busca por nombre o por código, se ve cuál es y qué UB
 * tiene hoy, y recién ahí se escribe.
 *
 * SE VE TAMBIÉN EL HEREDADO
 * =========================
 * La tabla de abajo lista solo los UB PROPIOS de este nomenclador, que en una
 * actualización son un puñado. Buscando aparece cualquier análisis del catálogo
 * con el UB que rige para él acá —propio o heredado del padre— porque para
 * decidir si hay que revalorizarlo hay que ver de qué número se parte.
 */

type Props = {
  nbu: NBU
  nomencladores: NBU[]
  /** Para que la tabla de UB propios y los contadores se enteren. */
  onCambio: () => void
}

export function BuscadorDeUb({ nbu, nomencladores, onCambio }: Props) {
  const { apiRequest } = useApi()
  const { success, error } = useToast()

  const [texto, setTexto] = useState("")
  const buscado = useDebounce(texto.trim(), 300)
  const [buscando, setBuscando] = useState(false)
  const [encontrados, setEncontrados] = useState<Analysis[]>([])
  const [edicion, setEdicion] = useState<Record<number, string>>({})
  const [guardando, setGuardando] = useState<number | null>(null)

  useEffect(() => {
    if (!buscado) {
      setEncontrados([])
      return
    }
    let vigente = true
    setBuscando(true)
    const params = new URLSearchParams({ search: buscado, limit: "25", offset: "0" })
    apiRequest(`${CATALOG_ENDPOINTS.ANALYSIS}?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((datos) => {
        if (!vigente) return
        setEncontrados(Array.isArray(datos) ? datos : datos?.results ?? [])
        setEdicion({})
      })
      .finally(() => {
        if (vigente) setBuscando(false)
      })
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscado])

  // El nomenclador elegido cambia lo que hay que mostrar en cada fila, no lo que
  // hay que buscar: los resultados se quedan y se recalculan.
  const filas = useMemo(
    () =>
      encontrados.map((analisis) => ({
        analisis,
        rige: resolverUb(analisis.bio_unit_values, nbu.id, nomencladores),
        propio: ubPropio(analisis.bio_unit_values, nbu.id),
      })),
    [encontrados, nbu.id, nomencladores],
  )

  const guardar = async (analisis: Analysis, valor: string) => {
    const limpio = valor.trim()
    if (!limpio) return
    try {
      setGuardando(analisis.id)
      const respuesta = await apiRequest(CATALOG_ENDPOINTS.NBU_UPDATE_UB_VALUE(nbu.id), {
        method: "POST",
        body: { analysis_id: analisis.id, value: limpio },
      })
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}))
        throw new Error(formatApiError(datos, "No se pudo guardar el UB."))
      }
      success("UB guardado", {
        description: `${analisis.name}: ${limpio} UB en ${nbu.name}.`,
        duration: TOAST_DURATION,
      })
      aplicarEnLaFila(analisis.id, limpio)
      onCambio()
    } catch (err) {
      error("Error al guardar UB", { description: getErrorMessage(err) })
    } finally {
      setGuardando(null)
    }
  }

  const quitar = async (analisis: Analysis) => {
    try {
      setGuardando(analisis.id)
      const respuesta = await apiRequest(
        CATALOG_ENDPOINTS.NBU_DELETE_UB_VALUE(nbu.id, analisis.code),
        { method: "DELETE" },
      )
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}))
        throw new Error(formatApiError(datos, "No se pudo quitar el UB."))
      }
      success("UB quitado", {
        description: "El análisis vuelve al valor heredado.",
        duration: TOAST_DURATION,
      })
      aplicarEnLaFila(analisis.id, null)
      onCambio()
    } catch (err) {
      error("Error al quitar UB", { description: getErrorMessage(err) })
    } finally {
      setGuardando(null)
    }
  }

  // El resultado guardado se refleja sin volver a buscar: quien acaba de cargar
  // un UB quiere ver que quedó, no que la lista se le vacíe y tenga que buscar
  // de nuevo para confirmarlo.
  const aplicarEnLaFila = (analysisId: number, valor: string | null) => {
    setEncontrados((previos) =>
      previos.map((a) => {
        if (a.id !== analysisId) return a
        const otros = (a.bio_unit_values ?? []).filter((v) => v.nbu_id !== nbu.id)
        return {
          ...a,
          bio_unit_values:
            valor === null
              ? otros
              : [...otros, { nbu_id: nbu.id, nbu_name: nbu.name, year: nbu.year ?? 0, value: valor }],
        }
      }),
    )
    setEdicion((previa) => {
      const copia = { ...previa }
      delete copia[analysisId]
      return copia
    })
  }

  return (
    <div className="min-w-0 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder="Buscar análisis por nombre o código para ponerle UB..."
          className="bg-white pl-9 pr-9"
        />
        {texto && (
          <button
            type="button"
            onClick={() => setTexto("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Limpiar la búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {buscando && (
        <p className="flex items-center gap-2 py-2 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Buscando...
        </p>
      )}

      {!buscando && buscado && filas.length === 0 && (
        <p className="py-3 text-center text-xs text-gray-500">
          Ningún análisis coincide con "{buscado}".
        </p>
      )}

      {filas.length > 0 && (
        <div className="max-h-[300px] space-y-1.5 overflow-y-auto">
          {filas.map(({ analisis, rige, propio }) => {
            const editando = edicion[analisis.id] ?? propio
            const sinCambios = editando.trim() === propio
            const enCurso = guardando === analisis.id
            return (
              <div
                key={analisis.id}
                className="flex min-w-0 flex-col gap-2 rounded-md border border-gray-200 bg-white p-2 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] text-gray-500">{analisis.code}</span>
                    {rige.esPropio ? (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-800">
                        UB propio
                      </Badge>
                    ) : rige.valor ? (
                      <Badge variant="outline" className="text-[10px] text-gray-600">
                        hereda {rige.valor} de {rige.heredadoDe}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-800">
                        sin UB
                      </Badge>
                    )}
                  </div>
                  <p className="break-words text-sm text-gray-900">{analisis.name}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Input
                    value={editando}
                    onChange={(evento) =>
                      setEdicion((previa) => ({ ...previa, [analisis.id]: evento.target.value }))
                    }
                    placeholder={rige.valor ? `${rige.valor} (heredado)` : "UB"}
                    className="h-8 w-20 tabular-nums"
                    disabled={enCurso}
                  />
                  <Button
                    size="sm"
                    className="h-8 bg-[#204983] hover:bg-[#1a3d6f]"
                    disabled={enCurso || sinCambios || !editando.trim()}
                    onClick={() => guardar(analisis, editando)}
                  >
                    {enCurso ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}
                  </Button>
                  {propio && !nbu.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-red-700 hover:bg-red-50"
                      disabled={enCurso}
                      onClick={() => quitar(analisis)}
                    >
                      Quitar
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
