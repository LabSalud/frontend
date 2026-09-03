"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * El cambio de panel adentro de un mismo contenedor: lo que estaba se va para
 * la izquierda y lo nuevo entra desde la derecha.
 *
 * SE VA DESLIZÁNDOSE, NO DESVANECIÉNDOSE
 * ======================================
 * El panel que sale recorre todo el ancho hasta salirse del contenedor, sin
 * cambiar de opacidad: lo que lo saca de la pantalla es el movimiento. Con un
 * fundido encima, a mitad de camino hay dos paneles medio transparentes
 * superpuestos y se lee como un parpadeo en vez de como algo que se corre.
 *
 * POR QUÉ NO ALCANZA CON ANIMAR LO QUE ENTRA
 * ==========================================
 * Cambiar de panel es cambiar de hijo, y React desmonta el viejo en el acto:
 * para cuando el nuevo empieza a entrar, el anterior ya no existe y lo que se
 * ve es una mitad de la animación. Acá el saliente se retiene un momento más,
 * dibujado encima, para que las dos mitades del movimiento pasen a la vez.
 *
 * LOS DOS VIVEN EN LA MISMA CELDA
 * ===============================
 * Van en una grilla de una sola celda —los dos en `1/1`— y no con
 * `position: absolute`. Con absoluto el contenedor se quedaría sin alto
 * mientras dura el cruce y el panel pegaría un salto; con la grilla, el alto
 * es el del más alto de los dos y la transición del contenedor lo acompaña.
 */

/** Lo que tarda el cruce. La misma en los dos lados: es un solo movimiento. */
export const MS_DE_LA_TRANSICION = 320

export function TransicionLateral({
  /** Cambiar esto es lo que dispara el cruce. */
  claveDelPanel,
  children,
}: {
  claveDelPanel: string
  children: ReactNode
}) {
  const [saliente, setSaliente] = useState<{ clave: string; contenido: ReactNode } | null>(null)
  const anterior = useRef<{ clave: string; contenido: ReactNode }>({
    clave: claveDelPanel,
    contenido: children,
  })

  useEffect(() => {
    if (anterior.current.clave === claveDelPanel) {
      anterior.current = { clave: claveDelPanel, contenido: children }
      return
    }
    setSaliente(anterior.current)
    anterior.current = { clave: claveDelPanel, contenido: children }
    const id = window.setTimeout(() => setSaliente(null), MS_DE_LA_TRANSICION)
    return () => window.clearTimeout(id)
    // `children` cambia en cada render (el panel se redibuja mientras alguien
    // escribe): el cruce lo dispara la clave y nada más.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveDelPanel])

  return (
    <div className="grid overflow-hidden">
      {saliente && (
        <div
          key={saliente.clave}
          aria-hidden="true"
          className="col-start-1 row-start-1 motion-safe:animate-out
            motion-safe:slide-out-to-left-[110%] motion-safe:duration-300
            motion-safe:ease-in-out motion-safe:fill-mode-forwards pointer-events-none"
        >
          {saliente.contenido}
        </div>
      )}
      <div
        key={claveDelPanel}
        className="col-start-1 row-start-1 motion-safe:animate-in
          motion-safe:slide-in-from-right-[110%] motion-safe:duration-300
          motion-safe:ease-in-out"
      >
        {children}
      </div>
    </div>
  )
}
