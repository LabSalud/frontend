import {
  DollarSign,
  FlaskConical,
  CheckCircle,
  Activity,
  Shield,
  Stethoscope,
  User,
  Cog,
  Plus,
  Pencil,
  FileText,
  ArrowRight,
  Clock,
} from "lucide-react"
import { formatUtcDateTime } from "@/lib/format-utils"
import { cn } from "@/lib/utils"
import type { ProtocolAuditEvent } from "@/types"

// Icono + color del evento según su categoría / tipo de acción.
function eventVisual(e: ProtocolAuditEvent): { Icon: typeof Clock; color: string } {
  const cat = (e.category || "").toLowerCase()
  if (cat === "payment") return { Icon: DollarSign, color: "text-amber-600 bg-amber-100" }
  if (cat === "result") return { Icon: FlaskConical, color: "text-emerald-600 bg-emerald-100" }
  if (cat === "validation") return { Icon: CheckCircle, color: "text-violet-600 bg-violet-100" }
  if (cat === "state") return { Icon: Activity, color: "text-rose-600 bg-rose-100" }
  if (cat === "insurance") return { Icon: Shield, color: "text-teal-600 bg-teal-100" }
  if (cat === "doctor") return { Icon: Stethoscope, color: "text-cyan-600 bg-cyan-100" }
  if (cat === "patient") return { Icon: User, color: "text-orange-600 bg-orange-100" }
  if (cat === "system") return { Icon: Cog, color: "text-slate-500 bg-slate-100" }
  const at = (e.action_type || "").toLowerCase()
  if (at === "create") return { Icon: Plus, color: "text-emerald-600 bg-emerald-100" }
  if (at === "update") return { Icon: Pencil, color: "text-amber-600 bg-amber-100" }
  return { Icon: FileText, color: "text-sky-600 bg-sky-100" }
}

function eventTitle(e: ProtocolAuditEvent): string {
  if (e.message) return e.message
  const parts = [e.category_label, e.action].filter(Boolean)
  return parts.join(" · ") || "Cambio registrado"
}

interface AuditTimelineMiniProps {
  events: ProtocolAuditEvent[]
  limit?: number
  emptyMessage?: string
}

/** Timeline compacto de los últimos eventos legibles (audit-timeline). */
export function AuditTimelineMini({ events, limit = 5, emptyMessage = "Sin eventos" }: AuditTimelineMiniProps) {
  if (!events || events.length === 0) {
    return <p className="py-2 text-sm text-gray-400">{emptyMessage}</p>
  }
  return (
    <ol className="space-y-3">
      {events.slice(0, limit).map((e, i) => {
        const { Icon, color } = eventVisual(e)
        return (
          <li key={e.id ?? i} className="flex gap-2.5">
            <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", color)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 pb-1">
              <p className="text-sm font-medium leading-snug text-gray-800">{eventTitle(e)}</p>
              {e.state_from && e.state_to && (
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  {e.state_from} <ArrowRight className="h-3 w-3" /> {e.state_to}
                </p>
              )}
              <p className="text-xs text-gray-400">
                {e.user?.username ?? "sistema"} · {formatUtcDateTime(e.date)}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
