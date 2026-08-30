import { lazy, type ComponentType } from "react"

/**
 * `lazy()` que sobrevive a un despliegue.
 *
 * QUÉ PASABA
 * ==========
 * Cada ruta es un chunk aparte con el hash del contenido en el nombre
 * (`protocolos-page-M8po14FT.js`). Al desplegar, todos los nombres cambian y
 * los viejos dejan de existir.
 *
 * Quien tenía la pestaña abierta desde antes del despliegue sigue con el HTML
 * viejo en memoria, que apunta a los hashes viejos. Al tocar un botón que
 * navega a una pantalla que todavía no había cargado, el navegador pide un
 * archivo que ya no está, el `import()` falla, React tira el error y —sin
 * nadie que lo agarre— desmonta TODO el árbol: pantalla en blanco. Recargar la
 * trae el HTML nuevo y anda, que es justo lo que se venía haciendo a mano.
 *
 * QUÉ HACE
 * ========
 * Reintenta una vez por las dudas de que haya sido la red, y si vuelve a
 * fallar recarga la página sola. Es lo mismo que hacía la persona, pero sin
 * que tenga que darse cuenta de que hay algo roto.
 *
 * LA MARCA EVITA EL BUCLE
 * =======================
 * Si el archivo no está por un motivo que recargar no arregla —un despliegue a
 * medias, un CDN sirviendo un índice viejo— recargar de nuevo volvería a
 * fallar, y la pantalla quedaría parpadeando para siempre. Con la marca en
 * `sessionStorage` se recarga UNA vez por pantalla; la segunda deja pasar el
 * error para que lo muestre el `LimiteDeError` con un mensaje y un botón.
 */

const MARCA = "recarga-por-chunk:"

function yaSeRecargo(clave: string): boolean {
  try {
    return sessionStorage.getItem(MARCA + clave) === "1"
  } catch {
    // Modo incógnito con storage bloqueado: mejor no recargar que hacerlo en bucle.
    return true
  }
}

function anotarLaRecarga(clave: string) {
  try {
    sessionStorage.setItem(MARCA + clave, "1")
  } catch {
    // Si no se puede anotar, no se recarga: ver arriba.
  }
}

/** Se llama al entrar bien a una pantalla: la próxima vez puede volver a recargar. */
export function olvidarLasRecargas() {
  try {
    for (const clave of Object.keys(sessionStorage)) {
      if (clave.startsWith(MARCA)) sessionStorage.removeItem(clave)
    }
  } catch {
    // Sin storage no hay nada que limpiar.
  }
}

export function paginaLazy<T extends ComponentType<unknown>>(
  nombre: string,
  cargar: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await cargar()
    } catch (error) {
      // Un reintento: puede haber sido un corte de red de un segundo.
      try {
        return await cargar()
      } catch {
        if (!yaSeRecargo(nombre)) {
          anotarLaRecarga(nombre)
          window.location.reload()
          // La recarga no es inmediata; se devuelve algo vacío para que React
          // no muestre el error en el parpadeo que queda hasta que ocurre.
          return { default: (() => null) as unknown as T }
        }
        throw error
      }
    }
  })
}
