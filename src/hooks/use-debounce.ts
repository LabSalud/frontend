"use client"

import { useState, useEffect } from "react"

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Limpiar el timeout si el valor cambia (o el delay)
    // o si el componente se desmonta.
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay]) // Solo se re-ejecuta si el valor o el delay cambian

  return debouncedValue
}
