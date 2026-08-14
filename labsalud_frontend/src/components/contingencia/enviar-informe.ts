import { CONTINGENCY_ENDPOINTS } from "@/config/api"

import { confirmarEnvioEnCola } from "./confirmar-envio"

/**
 * Pide un informe y, si el servidor está caído, pregunta antes de encolarlo.
 *
 * POR QUÉ ESTÁ ACÁ Y NO EN CADA BOTÓN
 * ===================================
 * Hay cuatro caminos distintos que terminan pegándole a `/report/`: la acción
 * rápida, la tarjeta del protocolo, el lote y el informe unificado. La primera
 * versión de esto enganchó UNO, y el resto siguió mandando a la cola sin
 * preguntar — que es exactamente el problema que venía a resolver.
 *
 * Puesto acá, un botón nuevo lo hereda sin que nadie se acuerde.
 *
 * QUÉ DEVUELVE
 * ============
 * `cancelado: true` significa que la persona dijo que no y ya se descartó la
 * anotación: quien llama tiene que cortar sin mostrar error ni éxito. No pasó
 * nada, y eso no es una falla.
 */

type Peticion = (url: string, opciones?: Record<string, unknown>) => Promise<Response>

export type ResultadoDeEnvio = {
  res: Response
  cancelado: boolean
  quedoEnCola: boolean
}

export async function pedirInforme(
  apiRequest: Peticion,
  url: string,
  body: Record<string, unknown>,
): Promise<ResultadoDeEnvio> {
  const res = await apiRequest(url, { method: "POST", body })

  // 202 es "lo anoté, todavía no salió". Cualquier otro código sigue su camino
  // de siempre: 200 se manejó, 4xx es un error de verdad.
  //
  // OJO con leer el cuerpo: un 200 de este endpoint puede ser un PDF, y
  // consumirlo acá dejaría a quien llama sin nada que abrir.
  if (res.status !== 202) {
    return { res, cancelado: false, quedoEnCola: false }
  }

  const datos = await res.clone().json().catch(() => ({} as Record<string, unknown>))
  if (!datos.en_cola) {
    return { res, cancelado: false, quedoEnCola: false }
  }

  const seManda = await confirmarEnvioEnCola({
    detail: (datos.detail as string) || "El servidor no responde.",
    operacionId: (datos.operacion_id as number) ?? null,
  })

  if (!seManda) {
    // Cancelar no deja nada esperando. Una cola llena de cosas que nadie quiso
    // mandar es una cola que nadie mira.
    if (datos.operacion_id) {
      await apiRequest(
        CONTINGENCY_ENDPOINTS.OPERACION(datos.operacion_id as number, "descartar"),
        { method: "POST" },
      ).catch(() => {})
    }
    return { res, cancelado: true, quedoEnCola: false }
  }

  return { res, cancelado: false, quedoEnCola: true }
}
