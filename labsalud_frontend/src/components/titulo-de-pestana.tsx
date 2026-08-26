"use client"

import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { tituloDeRuta } from "@/lib/titulo-de-pestana"

/**
 * Pone el título que le corresponde a la ruta cada vez que se navega.
 *
 * Va montado arriba de `<Routes>`, así que su efecto corre ANTES que el de la
 * pantalla: las de detalle lo pisan después con el nombre del paciente
 * (`useTituloDePestana`). El orden importa y es el que da React — efectos en
 * orden de árbol, y este componente es hermano anterior a las rutas.
 */
export function TituloDePestana() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = tituloDeRuta(pathname)
  }, [pathname])

  return null
}
