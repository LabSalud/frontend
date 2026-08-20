/**
 * El protocolo anterior y el siguiente, POR NÚMERO DE PROTOCOLO.
 *
 * POR QUÉ NO ES LA FILA DE ARRIBA Y LA DE ABAJO
 * =============================================
 * Las listas de protocolos, resultados y validación vienen del más nuevo al más
 * viejo: la fila de abajo es un número MENOR. Tomando la posición en la lista,
 * "Siguiente" llevaba a un protocolo anterior y "Anterior" a uno posterior, y en
 * el protocolo más nuevo —donde no hay ninguno que siga— la píldora ofrecía
 * "Siguiente".
 *
 * Los dos vecinos siguen saliendo de la lista que se estaba mirando, con sus
 * filtros y su orden; lo único que cambia es cuál de los dos es cuál. En el
 * último protocolo queda solo "Anterior" y en el primero solo "Siguiente", que
 * es lo que dice el número.
 *
 * Si la lista viene de menor a mayor, la posición y el número coinciden y no
 * hay nada que dar vuelta.
 */
export function vecinosPorNumeroDeProtocolo(
  ids: number[],
  currentId: number,
): { prevId: number | null; nextId: number | null } {
  const idx = ids.indexOf(currentId)
  if (idx < 0) return { prevId: null, nextId: null }

  const arriba = idx > 0 ? ids[idx - 1] : null
  const abajo = idx < ids.length - 1 ? ids[idx + 1] : null

  // La dirección sale de la lista entera y no de comparar los dos vecinos:
  // en las puntas uno de los dos es `null` y no habría con qué comparar.
  const descendente = ids.length > 1 && ids[0] > ids[ids.length - 1]

  return descendente ? { prevId: abajo, nextId: arriba } : { prevId: arriba, nextId: abajo }
}
