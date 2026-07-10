/** Formatea una fecha ISO ("YYYY-MM-DD") como "DD/MM/AAAA". */
export function formatDateAR(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}
