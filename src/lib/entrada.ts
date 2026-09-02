/**
 * LA ENTRADA DE LAS PANTALLAS.
 * ============================
 * Las clases con las que aparece todo lo que aparece: las tarjetas del inicio,
 * los listados, el detalle de un protocolo, la píldora de saltar entre
 * protocolos. Estaban sólo en el inicio y salieron acá para que el resto de la
 * app entre igual: una sola forma de aparecer, no una por pantalla.
 *
 * Son las utilidades de `tw-animate-css`, no keyframes propios. La diferencia
 * que importa es el ritmo: 500ms con `fade-in` y un desplazamiento de 12px
 * (`slide-in-from-*-3`) se lee como algo que se acomoda; más rápido y más
 * corto se lee como un parpadeo, que es justo lo que no se quería.
 *
 * `motion-safe` en todas: quien pidió menos movimiento en el sistema
 * operativo las ve puestas, no entrando.
 *
 * ARRIBA O ABAJO, SEGÚN DE DÓNDE VENGA
 * ------------------------------------
 * `ENTRADA_ARRIBA` para lo que está fijo en lo alto de la pantalla —la barra
 * de filtros, un aviso—; `ENTRADA_ABAJO` para el contenido, que es lo que
 * sube a ocupar su lugar. Que cada cosa entre desde donde está evita que la
 * pantalla se vea toda moviéndose para el mismo lado.
 */
export const ENTRADA = "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
export const ENTRADA_ARRIBA = `${ENTRADA} motion-safe:slide-in-from-top-3`
export const ENTRADA_ABAJO = `${ENTRADA} motion-safe:slide-in-from-bottom-3`

/**
 * El fundido de la pantalla entera, en el layout.
 *
 * VA SIN DESPLAZAMIENTO A PROPÓSITO
 * ---------------------------------
 * Adentro de la pantalla ya entran los bloques con `ENTRADA_ABAJO`; si además
 * se moviera el contenedor, los dos movimientos se suman y el contenido llega
 * de más abajo de lo que se ve. Y un `transform` en el contenedor de la página
 * le cambia el marco de referencia a todo lo que adentro sea `position: fixed`
 * —una barra flotante queda pegada al borde del contenido en vez del de la
 * ventana— mientras dura la animación. Sin desplazamiento, ninguno de los dos
 * problemas existe.
 *
 * Más corto que los bloques (300ms): es el telón, no lo que se mira.
 */
export const ENTRADA_DE_PANTALLA = "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
