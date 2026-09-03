/**
 * La forma de la barra blanca de la navbar, compartida entre la app y el login.
 *
 * PARA QUÉ
 * ========
 * El ingreso y el cierre de sesión son la misma animación al derecho y al
 * revés: al entrar, el panel del login se encoge hasta la barra de la navbar;
 * al salir, la barra se estira hasta el panel del login. Para que el
 * aterrizaje caiga justo, el que anima tiene que saber a qué forma va, y las
 * dos pantallas nunca están montadas al mismo tiempo.
 *
 * POR QUÉ MEDIDA Y NO ESCRITA
 * ===========================
 * La primera versión copiaba las medidas de `navbar.tsx` en constantes. En
 * escritorio pegaba, pero en el teléfono no: la barra de mobile va full-bleed,
 * tiene otro alto y otro radio, y el panel aterrizaba en una forma que no era
 * la de ninguna barra. Ahora la navbar publica su tamaño real —el que tiene en
 * esa pantalla, con esa tipografía y ese avatar— y el login lee eso.
 *
 * Las constantes siguen existiendo como estimación, para la única vez en que
 * nadie midió nada todavía: el primer ingreso después de abrir el navegador.
 * Ahí el aterrizaje puede quedar unos píxeles corrido; del segundo en adelante
 * es exacto.
 *
 * DÓNDE VIVE
 * ==========
 * En `sessionStorage`, porque entrar y salir son recargas de pantalla dentro
 * de la misma pestaña. No es un dato: es una medida de la pantalla, y no tiene
 * ningún sentido que sobreviva a la pestaña ni que viaje a ningún lado.
 */

export type FormaDeLaNavbar = {
  /** Ancho de la barra blanca, sin los márgenes que la despegan del borde. */
  ancho: number
  alto: number
  /** El radio de las esquinas de abajo, que es donde la barra se redondea. */
  radio: number
}

const CLAVE_DE_LA_FORMA = "labsalud:forma-de-la-navbar"
const CLAVE_DE_LA_ENTRADA = "labsalud:entrada-desde-la-navbar"

/** El breakpoint `lg` de Tailwind, donde la navbar cambia de forma. */
const ANCHO_DE_ESCRITORIO = 1024

/** El ancho máximo del panel del login: `max-w-md` = 28rem. */
export const ANCHO_DEL_PANEL_DE_INGRESO = 448
/** Su radio de abajo: `rounded-b-3xl` = 1.5rem. */
export const RADIO_DEL_PANEL_DE_INGRESO = 24

/** Cuánto tarda el menú de usuario en cerrarse. Es su propia transición. */
export const MS_DEL_MENU = 200
/** Cuánto tarda la barra en volverse panel de login. */
export const MS_DE_LA_SALIDA = 600

/**
 * El ancho de la ventana sin la barra de scroll. `innerWidth` la incluye, así
 * que el panel terminaba unos píxeles más ancho que la navbar en escritorio.
 */
export function anchoDeLaVentana(): number {
  return document.documentElement.clientWidth || window.innerWidth
}

/**
 * Lo que mediría la barra si nadie la midió todavía. Sale de `navbar.tsx`:
 * en escritorio deja 32px a cada lado —16 del `lg:px-4` de su wrapper más 16
 * del `mx-4` de la barra—, mide 68 de alto (36 del logo `h-9` más 16+16 del
 * `py-4`) y redondea 25px; en mobile va de borde a borde, mide 56 (32 del
 * avatar más 12+12 del `py-3`) y redondea 8px (`rounded-b-lg`).
 */
export function formaEstimadaDeLaNavbar(): FormaDeLaNavbar {
  const ventana = anchoDeLaVentana()
  return ventana >= ANCHO_DE_ESCRITORIO
    ? { ancho: ventana - 64, alto: 68, radio: 25 }
    : { ancho: ventana, alto: 56, radio: 8 }
}

/** La navbar publica su tamaño real cada vez que cambia. */
export function recordarFormaDeLaNavbar(forma: FormaDeLaNavbar): void {
  try {
    sessionStorage.setItem(CLAVE_DE_LA_FORMA, JSON.stringify(forma))
  } catch {
    // Modo privado o storage lleno: se sigue con la estimación.
  }
}

/** A qué forma tiene que aterrizar el panel del login. */
export function formaDeLaNavbar(): FormaDeLaNavbar {
  const estimada = formaEstimadaDeLaNavbar()
  try {
    const guardado = sessionStorage.getItem(CLAVE_DE_LA_FORMA)
    if (!guardado) return estimada
    const forma = JSON.parse(guardado) as Partial<FormaDeLaNavbar>
    // Una medida vieja de cuando la ventana era otra no sirve: si la pantalla
    // se achicó, el panel se iría más ancho que la barra. El alto y el radio sí
    // valen, que es justo lo que no se puede deducir del ancho de la ventana.
    const ancho = Math.min(forma.ancho ?? estimada.ancho, estimada.ancho)
    return {
      ancho: ancho > 0 ? ancho : estimada.ancho,
      alto: forma.alto && forma.alto > 0 ? forma.alto : estimada.alto,
      radio: typeof forma.radio === "number" ? forma.radio : estimada.radio,
    }
  } catch {
    return estimada
  }
}

/** La forma del panel del login, que es adonde va la barra al cerrar sesión. */
export function formaDelPanelDeIngreso(): { ancho: number; radio: number } {
  return {
    ancho: Math.min(ANCHO_DEL_PANEL_DE_INGRESO, anchoDeLaVentana()),
    radio: RADIO_DEL_PANEL_DE_INGRESO,
  }
}

/**
 * Avisa que la pantalla de login se abre porque la navbar se acaba de
 * convertir en ella, y no porque alguien llegó de afuera: el panel tiene que
 * seguir desde donde quedó la barra en vez de caer otra vez desde arriba.
 */
export function anunciarEntradaDesdeLaNavbar(): void {
  try {
    sessionStorage.setItem(CLAVE_DE_LA_ENTRADA, "1")
  } catch {
    // Sin aviso, el login entra con su animación de siempre.
  }
}

/**
 * Lo lee el login al montarse. No borra el aviso: lo borra
 * `olvidarEntradaDesdeLaNavbar` cuando la animación terminó. Si se borrara acá,
 * en desarrollo —donde StrictMode monta la pantalla dos veces— el segundo
 * montaje ya no lo encontraría y la animación se vería sólo la mitad de las
 * veces, que es peor que no verla nunca: parece intermitente.
 */
export function hayEntradaDesdeLaNavbar(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_DE_LA_ENTRADA) === "1"
  } catch {
    return false
  }
}

/** El login ya entró: el próximo que llegue lo hace de la forma normal. */
export function olvidarEntradaDesdeLaNavbar(): void {
  try {
    sessionStorage.removeItem(CLAVE_DE_LA_ENTRADA)
  } catch {
    // Nada que olvidar.
  }
}

/** Lo que tarda el panel en desplegarse desde la forma de la barra. */
export const MS_DE_LA_ENTRADA = 600

/** El aviso de que empezó un cierre de sesión con animación. */
export const EVENTO_DE_CIERRE = "labsalud:cerrando-sesion"

/**
 * Cierra la sesión, pero recién después de la animación: primero se cierra el
 * menú de usuario —para arriba, con su propia transición— y después la barra
 * se estira hasta ser el panel del login. La sesión sigue abierta mientras
 * tanto, que es lo que deja la navbar en pantalla para poder animarla.
 */
export function cerrarSesionConAnimacion(cerrar: () => void): void {
  anunciarEntradaDesdeLaNavbar()
  window.dispatchEvent(new Event(EVENTO_DE_CIERRE))
  window.setTimeout(cerrar, MS_DEL_MENU + MS_DE_LA_SALIDA)
}
