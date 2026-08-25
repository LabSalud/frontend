/**
 * Renovación del access token, con single-flight.
 *
 * EL PROBLEMA
 * ===========
 * Cuando el access token vence, cualquier request que salga contesta 401 y
 * dispara una renovación. Si en ese momento había tres requests en vuelo —una
 * pantalla que carga varias cosas a la vez es lo normal— salen tres
 * renovaciones, y las tres mandan EL MISMO refresh token.
 *
 * Hoy eso funciona de casualidad. El backend tiene `ROTATE_REFRESH_TOKENS`
 * activo, así que cada llamada devuelve un refresh nuevo, y las tres se pisan
 * sin consecuencias porque el token viejo sigue siendo válido.
 *
 * Deja de funcionar en cuanto se active la blacklist del lado del servidor
 * (`BLACKLIST_AFTER_ROTATION`, que hoy es configuración muerta porque falta la
 * app en INSTALLED_APPS): la primera renovación invalida el token viejo, y la
 * segunda llega con un token ya quemado. Resultado, la persona queda afuera en
 * mitad del trabajo, sin haber hecho nada raro. Por eso este archivo va ANTES
 * que el cambio del backend y no después.
 *
 * LA SOLUCIÓN
 * ===========
 * Una sola renovación a la vez. La primera llamada arranca el pedido y guarda
 * la promesa; las que llegan mientras tanto reciben esa misma promesa en vez
 * de mandar otro pedido. Cuando termina, se limpia y la próxima vuelve a
 * arrancar de cero.
 *
 * La promesa vive en el módulo y no en un hook a propósito: había dos
 * implementaciones de esto —`auth-context.tsx` y `use-api.tsx`— cada una con su
 * copia. Dos hooks distintos nunca habrían compartido el vuelo, que es
 * justamente lo que hay que evitar.
 */

import { AUTH_ENDPOINTS } from "@/config/api"
import { getRefreshToken, setAccessToken, setRefreshToken } from "@/lib/auth-storage"

interface TokenRefreshResponse {
  access: string
  refresh?: string
}

/** La renovación en curso, si hay alguna. */
let vueloEnCurso: Promise<boolean> | null = null

async function pedirTokenNuevo(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false

  const respuesta = await fetch(AUTH_ENDPOINTS.TOKEN_REFRESH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
    mode: "cors",
  })

  if (!respuesta.ok) return false

  const datos: TokenRefreshResponse = await respuesta.json()
  setAccessToken(datos.access)
  // Con la rotación activa el backend manda un refresh nuevo en cada
  // renovación. Guardarlo es lo que evita seguir usando el anterior, que en
  // cuanto exista la blacklist va a estar quemado.
  if (datos.refresh) setRefreshToken(datos.refresh)
  return true
}

/**
 * Renueva el access token. Si ya hay una renovación en curso, espera a esa.
 *
 * Devuelve `true` si al terminar hay un access token nuevo guardado. Qué hacer
 * con el `false` lo decide quien llama: `auth-context` cierra la sesión con un
 * aviso, `use-api` deja que la request original falle.
 */
export function refrescarSesion(): Promise<boolean> {
  if (vueloEnCurso) return vueloEnCurso

  vueloEnCurso = pedirTokenNuevo()
    .catch(() => false)
    .finally(() => {
      vueloEnCurso = null
    })

  return vueloEnCurso
}

/** Solo para los tests: olvida el vuelo en curso. */
export function _resetearVueloParaTests(): void {
  vueloEnCurso = null
}
