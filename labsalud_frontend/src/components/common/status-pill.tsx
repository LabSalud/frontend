import { cn } from "@/lib/utils"
import { getProtocolStatusStyleByName } from "@/lib/status-styles"

interface StatusPillProps {
  statusName?: string | null
  className?: string
}

/** Pill de estado de protocolo: punto de color + etiqueta, estilo mockup. */
export function StatusPill({ statusName, className }: StatusPillProps) {
  const style = getProtocolStatusStyleByName(statusName)
  const dotClass = style.solid.split(" ")[0] // "bg-color-500"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        style.badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
      {statusName || "—"}
    </span>
  )
}
