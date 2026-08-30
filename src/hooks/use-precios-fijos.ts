"use client"

import { useCallback, useEffect, useState } from "react"
import { useApi } from "@/hooks/use-api"
import { CATALOG_ENDPOINTS } from "@/config/api"
import type { PricingConfig } from "@/types"

/**
 * Si el laboratorio habilitó cobrar análisis a precio fijo.
 *
 * POR QUÉ UN HOOK Y NO UN PROP
 * ============================
 * Lo preguntan lugares que no se ven entre sí: la lista de análisis, el alta,
 * la edición. Pasarlo como prop obligaba a que cada pantalla que abre un
 * diálogo de análisis supiera de un interruptor que vive en otra pestaña de la
 * configuración.
 *
 * `PricingConfig` es un singleton chico y no cambia durante una sesión de
 * trabajo, así que la respuesta se guarda a nivel de módulo: el primer
 * componente que pregunta dispara la consulta y el resto la comparte. Se
 * invalida sola al recargar la página, que es cuando el interruptor podría
 * haber cambiado.
 */
let cache: Promise<boolean> | null = null

/** Que la config de montos fijos avise cuando alguien toca el interruptor. */
export function olvidarPreciosFijos() {
  cache = null
}

export function usePreciosFijos() {
  const { apiRequest } = useApi()
  const [habilitados, setHabilitados] = useState(false)
  const [cargando, setCargando] = useState(true)

  const consultar = useCallback(async () => {
    if (cache === null) {
      cache = (async () => {
        try {
          const response = await apiRequest(CATALOG_ENDPOINTS.PRICING_CONFIG)
          if (!response.ok) return false
          const data: PricingConfig = await response.json()
          return Boolean(data.precios_fijos_habilitados)
        } catch {
          // Si no se puede leer, se asume apagado: mostrar un campo de precio
          // que después no cotiza nada es peor que no mostrarlo.
          return false
        }
      })()
    }
    return cache
  }, [apiRequest])

  useEffect(() => {
    let vigente = true
    consultar().then((valor) => {
      if (!vigente) return
      setHabilitados(valor)
      setCargando(false)
    })
    return () => {
      vigente = false
    }
  }, [consultar])

  return { habilitados, cargando }
}
