// Códigos de "acto bioquímico": ítems de facturación del nomenclador que no
// tienen un resultado real para cargar/validar (aunque el catálogo les arme
// 1 determinación "de relleno"). Nadie carga un valor para ellos, así que no
// deben tratarse como análisis "pendientes de cargar" en la UI.
//   660001 — ACTO BIOQUÍMICO
//   661001 — ACTO BIOQUÍMICO DE INTERNACIÓN (ABI)
//   662001 — ACTO BIOQUÍMICO COMPLEMENTARIO (ABC)
export const ACTO_BIOQUIMICO_CODES = new Set([660001, 661001, 662001])

export function isActoBioquimico(code: number): boolean {
  return ACTO_BIOQUIMICO_CODES.has(code)
}
