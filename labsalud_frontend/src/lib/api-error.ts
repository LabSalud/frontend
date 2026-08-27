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

export const getErrorMessage = (error: unknown, fallback = "Ha ocurrido un error inesperado"): string => {
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
