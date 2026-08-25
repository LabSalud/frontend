/**
 * Cierre de sesión del lado del SERVIDOR.
 *
 * Hasta ahora "salir" era `clearSession()`: borrar dos cookies del navegador.
 * El refresh token seguía siendo válido sus 8 horas completas, así que quien lo
 * hubiera capturado —una PC compartida del mostrador, el historial del
 * navegador— podía seguir emitiendo access tokens después de que la persona
 * apretó salir.
 *
 * El caso que más importa es el cierre por inactividad, porque ahí el token
 * está VIVO: la persona se fue del mostrador y la sesión se cerró sola. Sin
 * esta llamada, cerrarla no invalidaba nada.
 */

import { AUTH_ENDPOINTS } from "@/config/api"
import { getRefreshToken } from "@/lib/auth-storage"

/**
 * Le pide al backend que invalide el refresh token actual.
 *
 * NO se espera el resultado y NO falla nunca: cerrar sesión en la pantalla no
 * puede quedar colgado de que la red conteste. Si el pedido no llega, lo que se
 * pierde es la invalidación del lado del servidor, no el cierre local.
 *
 * El token se lee de forma síncrona, apenas se entra: quien llama a esto
 * enseguida borra las cookies, así que leerlo después de un `await` sería
 * leerlo cuando ya no está.
 */
export function cerrarSesionEnElServidor(): Promise<void> {
  const refresh = getRefreshToken()
  if (!refresh) return Promise.resolve()

  return fetch(AUTH_ENDPOINTS.LOGOUT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
    mode: "cors",
    // La pestaña puede cerrarse justo después de apretar salir. `keepalive`
    // deja que el pedido sobreviva a la navegación.
    keepalive: true,
  })
    .then(() => undefined)
    .catch(() => undefined)
}
