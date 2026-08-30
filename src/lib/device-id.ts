/**
 * Identificador persistente del navegador (`device_id`).
 *
 * Qué es y qué NO es: es una SEÑAL de "este equipo ya pasó por el segundo
 * factor", no un factor de autenticación. Vive en localStorage, así que
 * cualquiera con acceso a la máquina —o un XSS— lo puede leer y copiar. Quien
 * se lo robe todavía necesita usuario y contraseña para entrar; lo único que se
 * ahorra es el código TOTP mientras el backend mantenga abierta la ventana de
 * confianza. Tratalo como una cookie de conveniencia, no como una credencial.
 *
 * Por qué localStorage y no sessionStorage ni una cookie de sesión: tiene que
 * sobrevivir al cierre del navegador y —sobre todo— al logout. Si se borrara en
 * cada logout, cada login abriría un dispositivo nuevo, el segundo factor se
 * pediría siempre y la ventana de confianza no serviría para nada. Por eso
 * `clearSession()` no lo toca.
 */

const DEVICE_ID_KEY = "labsalud_device_id"

// Si localStorage no está disponible (modo privado con cuota 0, storage
// bloqueado por el navegador) igual necesitamos mandar *algo* para que el login
// no se caiga. Este id vive lo que dure la pestaña: el usuario va a tener que
// tipear el código cada vez, que es el modo degradado correcto.
let inMemoryDeviceId: string | null = null

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const generateUuid = (): string => {
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined

  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID()
  }

  // `crypto.randomUUID` sólo existe en contextos seguros: en la LAN del
  // laboratorio la app se sirve por http y no está, así que armamos el UUID v4
  // a mano con getRandomValues.
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(16)
    cryptoObj.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // versión 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC 4122
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  // Último recurso. No es criptográficamente fuerte, pero acá sólo hace falta
  // que no colisione con otro equipo del laboratorio.
  const random = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0")
  return `${random()}${random()}-${random()}-4${random().slice(1)}-a${random().slice(1)}-${random()}${random()}${random()}`
}

const readStoredDeviceId = (): string | null => {
  try {
    const stored = localStorage.getItem(DEVICE_ID_KEY)
    return stored && UUID_RE.test(stored) ? stored : null
  } catch {
    return null
  }
}

const persistDeviceId = (deviceId: string): boolean => {
  try {
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
    return true
  } catch {
    return false
  }
}

/**
 * Devuelve el id de este navegador, creándolo la primera vez. Se manda en el
 * login y en la verificación del segundo factor.
 */
export const getDeviceId = (): string => {
  const stored = readStoredDeviceId()
  if (stored) return stored

  if (inMemoryDeviceId) return inMemoryDeviceId

  const deviceId = generateUuid()
  if (!persistDeviceId(deviceId)) {
    inMemoryDeviceId = deviceId
  }
  return deviceId
}

/**
 * Sólo para "olvidar este equipo" desde la propia máquina. El logout NO lo
 * llama a propósito (ver el comentario de arriba); revocar la confianza del
 * lado del servidor se hace con el endpoint de revocar dispositivo.
 */
export const resetDeviceId = (): string => {
  try {
    localStorage.removeItem(DEVICE_ID_KEY)
  } catch {
    // ignore
  }
  inMemoryDeviceId = null
  return getDeviceId()
}
