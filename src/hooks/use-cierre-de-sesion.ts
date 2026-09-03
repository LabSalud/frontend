import { useEffect, useState } from "react"

import { EVENTO_DE_CIERRE } from "@/lib/forma-de-la-navbar"

/**
 * `true` desde que alguien apretó "Cerrar Sesión" hasta que la sesión se cierra
 * de verdad, que es el rato que dura la animación de salida.
 *
 * Lo escuchan la navbar —que se va para arriba— y el layout —que manda el
 * contenido para los costados—. Van por un evento de ventana y no por el
 * contexto de autenticación a propósito: es una coreografía de la pantalla, no
 * un estado de la sesión, y meterla en el contexto haría re-renderizar la app
 * entera para animar dos cosas.
 */
export function useCierreDeSesion(): boolean {
  const [cerrando, setCerrando] = useState(false)

  useEffect(() => {
    const empezar = () => setCerrando(true)
    window.addEventListener(EVENTO_DE_CIERRE, empezar)
    return () => window.removeEventListener(EVENTO_DE_CIERRE, empezar)
  }, [])

  return cerrando
}
