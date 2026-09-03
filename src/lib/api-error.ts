const MESSAGE_KEYS = ["detail", "message", "error", "non_field_errors", "nonFieldErrors", "errors"]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const tryParseJson = (value: string): unknown => {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const humanizeField = (field: string): string =>
  field
    .replace(/\./g, " > ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const flattenMessages = (value: unknown, parentKey?: string): string[] => {
  if (value === null || value === undefined || value === "") return []

  if (typeof value === "string") {
    const parsed = tryParseJson(value)
    if (parsed !== value) return flattenMessages(parsed, parentKey)
    return [value]
  }

  if (typeof value === "number" || typeof value === "boolean") return [String(value)]

  if (value instanceof Error) return flattenMessages(value.message, parentKey)

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenMessages(item, parentKey))
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, fieldValue]) => {
      if (MESSAGE_KEYS.includes(key)) return flattenMessages(fieldValue)
      const fieldPath = parentKey ? `${parentKey}.${key}` : key
      const messages = flattenMessages(fieldValue, fieldPath)
      return messages.map((message) => `${humanizeField(fieldPath)}: ${message}`)
    })
  }

  return []
}

export const formatApiError = (errorData: unknown, fallback = "Ha ocurrido un error inesperado"): string => {
  const messages = flattenMessages(errorData)
  return messages.length > 0 ? Array.from(new Set(messages)).join("\n") : fallback
}

/**
 * TRES COSAS DISTINTAS QUE LA PANTALLA LLAMA "ERROR"
 * ==================================================
 * 1. **El negocio dijo que no.** El protocolo ya está facturado, el DNI ya
 *    existe, falta la preautorización. El mensaje lo escribió el backend
 *    pensando en quien lo va a leer, así que ese mensaje es el que va, tal cual.
 * 2. **No se pudo hablar con el servidor.** Se cayó la red, el server no
 *    responde. No hay nada mal en lo que la persona cargó, y lo que tiene que
 *    saber es que puede volver a intentar.
 * 3. **Se rompió la aplicación.** Un bug nuestro: un `undefined` donde iba un
 *    objeto, un JSON que no era JSON. El navegador tira un `TypeError` y su
 *    texto —"undefined is not an object (evaluating 'x.y')"— terminaba impreso
 *    en el toast, en inglés y sin nada que la persona pueda hacer al respecto.
 *
 * Los tres salían mezclados: `getErrorMessage` devolvía el `.message` de
 * cualquier excepción, así que un corte de red se leía igual que una regla del
 * laboratorio, y un bug nuestro se leía como si el usuario hubiera cargado algo
 * mal. Peor todavía: media docena de pantallas ponían "Error de conexión con el
 * servidor" a mano en el `catch`, o sea que le echaban la culpa a la red
 * pasara lo que pasara.
 *
 * Acá se separan. Lo que gana el llamador es que puede seguir escribiendo
 * `getErrorMessage(error, "No se pudo guardar")` sin pensar: si fue un corte de
 * red o un bug nuestro, el texto lo pone esta capa.
 */

/**
 * Cómo dice cada navegador que no pudo salir a la red. `fetch` rechaza con un
 * `TypeError` y el texto cambia entre Chrome, Firefox y Safari.
 */
const MENSAJES_DE_RED = [
  "failed to fetch",
  "networkerror",
  "network request failed",
  "load failed",
  "the internet connection appears to be offline",
]

/** El servidor no contestó: se cayó la red o está caído él. */
export const esFalloDeConexion = (error: unknown): boolean =>
  error instanceof TypeError &&
  MENSAJES_DE_RED.some((texto) => error.message.toLowerCase().includes(texto))

/** La operación se canceló (se desmontó la pantalla, se abortó el pedido). */
export const esCancelacion = (error: unknown): boolean =>
  Boolean(error) && typeof error === "object" && (error as { name?: string }).name === "AbortError"

/**
 * Un bug de la aplicación. Estos tipos de error los tira el motor de
 * JavaScript, nunca el backend ni una regla del laboratorio: si llegó uno acá,
 * el problema es del código y no de lo que la persona cargó.
 */
const ERRORES_DEL_PROGRAMA = [TypeError, ReferenceError, RangeError, SyntaxError, EvalError, URIError]

export const esErrorDeLaAplicacion = (error: unknown): boolean =>
  !esFalloDeConexion(error) && ERRORES_DEL_PROGRAMA.some((tipo) => error instanceof tipo)

export const MENSAJE_SIN_CONEXION =
  "No se pudo conectar con el servidor. Revisá la conexión y volvé a intentar."

export const MENSAJE_DE_LA_APLICACION =
  "Se rompió algo de la aplicación, no lo que cargaste. Volvé a intentar; si sigue pasando, avisale a sistemas."

export const MENSAJE_CANCELADO = "La operación se canceló antes de terminar."

/**
 * El texto que le va a aparecer a la persona cuando algo falló en un `catch`.
 *
 * El `fallback` sólo se usa para el caso 1 —un error con mensaje vacío—; los
 * otros dos tienen su propio texto y le ganan a lo que pase el llamador, que
 * es justamente lo que evita las pantallas que decían "revisá tu conexión"
 * cuando lo que había fallado era otra cosa.
 */
export const getErrorMessage = (error: unknown, fallback = "Ha ocurrido un error inesperado"): string => {
  if (esCancelacion(error)) return MENSAJE_CANCELADO
  if (esFalloDeConexion(error)) return MENSAJE_SIN_CONEXION
  if (esErrorDeLaAplicacion(error)) {
    // A la consola sí va entero: es lo que necesita quien lo tenga que arreglar.
    console.error("Error de la aplicación:", error)
    return MENSAJE_DE_LA_APLICACION
  }
  if (error instanceof Error) return formatApiError(error.message, error.message || fallback)
  return formatApiError(error, fallback)
}

/**
 * Un cuerpo que NO es un mensaje para nadie: la página de error de Django, el
 * 502 de nginx, un HTML cualquiera.
 *
 * Sin este filtro, `formatApiError` toma el texto crudo como si fuera el
 * mensaje del error y la pantalla muestra el HTML entero. Además de ilegible
 * es peligroso: la página de debug de Django trae rutas del servidor, la
 * configuración y el traceback, y eso terminaba impreso en la cara del
 * usuario.
 */
const esCuerpoIlegible = (texto: string): boolean => {
  const limpio = texto.trim()
  if (!limpio) return true
  if (limpio.startsWith("<")) return true
  // Un mensaje de error es una frase. Media pantalla de texto es otra cosa.
  return limpio.length > 300
}

export const readApiError = async (response: Response, fallback?: string): Promise<string> => {
  const text = await response.text().catch(() => "")
  const parsed = text ? tryParseJson(text) : null

  // `tryParseJson` devuelve el texto tal cual cuando no es JSON.
  if (typeof parsed === "string" && esCuerpoIlegible(parsed)) {
    return fallback
      ? `${fallback} (el servidor respondió ${response.status})`
      : `Error ${response.status}`
  }

  return formatApiError(parsed, fallback || `Error ${response.status}`)
}

/**
 * Manejo unificado de respuestas HTTP no-OK con mensaje legible para el usuario.
 *
 * - 401: el `use-api` ya intenta refresh; si llega acá es porque ya cerró sesión.
 * - 403: permiso insuficiente — mensaje específico orientado al usuario.
 * - 404: recurso inexistente.
 * - 409: conflicto (por ejemplo, eliminar algo referenciado).
 * - 5xx: error del servidor.
 *
 * Devuelve `{ kind, message, detail }` para que el llamador elija UI (toast vs dialog).
 */
export type ApiErrorKind =
  | "validation"
  | "permission"
  | "not_found"
  | "conflict"
  | "server"
  | "network"
  | "unknown"

export interface ApiErrorInfo {
  kind: ApiErrorKind
  status: number
  message: string
  detail?: string
}

export const classifyApiError = async (response: Response): Promise<ApiErrorInfo> => {
  const genericMessage = `Error ${response.status}`
  const message = await readApiError(response, genericMessage).catch(() => genericMessage)
  const status = response.status
  // El backend manda mensajes de permiso ya escritos para el usuario final
  // ("No tenés permiso para imprimir…"). Si vino uno, mandamos ESE y no el
  // texto enlatado: el enlatado solo cubre el caso de un 403 sin cuerpo.
  const hasBackendMessage = message !== genericMessage

  let kind: ApiErrorKind = "unknown"
  let detail: string | undefined

  if (status === 403) {
    kind = "permission"
    detail = hasBackendMessage
      ? message
      : "Tu usuario no tiene los permisos necesarios para esta acción. Pedile a un administrador que te asigne el permiso correspondiente o un permiso temporal."
  } else if (status === 401) {
    kind = "permission"
    detail = "Tu sesión expiró o el token es inválido. Volvé a iniciar sesión."
  } else if (status === 404) {
    kind = "not_found"
    detail = "El recurso solicitado no existe o fue eliminado."
  } else if (status === 409) {
    kind = "conflict"
    detail = "La operación entra en conflicto con el estado actual del sistema."
  } else if (status >= 500) {
    kind = "server"
    detail = "Ocurrió un error en el servidor. Si persiste, contactá a sistemas."
  } else if (status >= 400) {
    kind = "validation"
  }

  return { kind, status, message, detail }
}
