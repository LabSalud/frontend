"use client"

import { useEffect } from "react"
import { useLocation } from "react-router-dom"

/**
 * Le pone nombre a la pestaña del navegador mientras la pantalla está montada.
 *
 * Lo usan las pantallas de detalle para reemplazar el título provisorio que
 * puso `<TituloDePestana />` con algo que sirva: `Resultados - Juan Pérez`.
 *
 * `pathname` va en las dependencias a propósito. Sin él, saltar de un
 * protocolo a otro del mismo paciente con la flecha de "siguiente en la cola"
 * no cambiaría el título (es el mismo string), y la pestaña se quedaría con el
 * `Resultados - #124` provisorio que puso el listener al cambiar la ruta.
 */
export function useTituloDePestana(titulo: string | null | undefined): void {
  const { pathname } = useLocation()

  useEffect(() => {
    if (titulo) document.title = titulo
  }, [titulo, pathname])
}

export default useTituloDePestana
