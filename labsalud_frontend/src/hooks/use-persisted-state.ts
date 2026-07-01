"use client"

import { useEffect, useState } from "react"

/**
 * useState que persiste en localStorage bajo `key`. Sirve para recordar los
 * filtros que el usuario dejó seleccionados (protocolos, resultados, validación)
 * entre sesiones.
 */
export function usePersistedState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw != null ? (JSON.parse(raw) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      /* localStorage lleno o no disponible: degradar silenciosamente */
    }
  }, [key, state])

  return [state, setState] as const
}
