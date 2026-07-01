"use client"

import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import {
  CreditCard,
  AlertTriangle,
  ClipboardList,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  FileText,
  Loader2,
  RotateCcw,
} from "lucide-react"
import { DataTable, type Column, type SortState } from "@/components/common/data-table"
import { InitialsAvatar } from "@/components/common/initials-avatar"
import { StatusPill } from "@/components/common/status-pill"
import { AuditAvatars } from "@/components/common/audit-avatars"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getProtocolStatusStyleByName } from "@/lib/status-styles"
import { cn } from "@/lib/utils"
import type { ProtocolListItem } from "@/types"

interface ProtocolsTableProps {
  protocols: ProtocolListItem[]
  selectedIds: Set<number>
  onToggleSelect: (id: number) => void
  onRowClick: (id: number) => void
  sort: SortState
  onSortChange: (sort: SortState) => void
  isLoading?: boolean
  onQuickPayment: (p: ProtocolListItem) => void
  onReport: (p: ProtocolListItem) => void
  onUncancel: (p: ProtocolListItem) => void
  canUncancel: boolean
  busyId?: number | null
}

function formatDni(dni?: string | null) {
  const digits = (dni || "").replace(/\D/g, "")
  if (digits.length >= 7 && digits.length <= 8) return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return dni || "—"
}

function fullName(p: ProtocolListItem) {
  if (p.patient?.is_anonymous) return "Paciente anónimo"
  return `${p.patient?.first_name ?? ""} ${p.patient?.last_name ?? ""}`.trim() || "—"
}

function PaymentCell({ p }: { p: ProtocolListItem }) {
  const amount = Number.parseFloat(p.balance || "0")
  if (amount > 0)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600">
        <CreditCard className="h-3.5 w-3.5 opacity-70" />
        Debe ${Math.abs(amount).toLocaleString("es-AR")}
      </span>
    )
  if (amount < 0)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
        <CreditCard className="h-3.5 w-3.5 opacity-70" />A favor ${Math.abs(amount).toLocaleString("es-AR")}
      </span>
    )
  return <span className="text-sm font-medium text-emerald-600">Pagado</span>
}

function Flag({ tone, icon: Icon, children, title }: { tone: "red" | "amber"; icon: typeof AlertTriangle; children: ReactNode; title?: string }) {
  const tones = { red: "bg-red-50 text-red-700", amber: "bg-amber-50 text-amber-700" } as const
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", tones[tone])}>
      <Icon className="h-3 w-3" />
      {children}
    </span>
  )
}

// Bloqueos del flujo: lo que impide avanzar el protocolo, de un vistazo.
function BlockersCell({ p }: { p: ProtocolListItem }) {
  const flags: ReactNode[] = []
  if (p.missing_info && p.missing_info.length > 0)
    flags.push(<Flag key="mi" tone="red" icon={AlertTriangle} title={p.missing_info.join("\n")}>Falta info</Flag>)
  if (p.trajo_orden === "no_trajo")
    flags.push(<Flag key="ord" tone="amber" icon={ClipboardList} title="No trajo la orden">Sin orden</Flag>)
  else if (p.trajo_orden === "incompleta")
    flags.push(<Flag key="ord" tone="amber" icon={ClipboardList} title="Orden incompleta">Orden incompl.</Flag>)
  if (p.preauth_status === "no_trajo")
    flags.push(<Flag key="pa" tone="amber" icon={ShieldAlert} title="Sin preautorización">Sin preauth</Flag>)
  else if (p.preauth_status === "incompleta")
    flags.push(<Flag key="pa" tone="amber" icon={ShieldAlert} title="Preautorización incompleta">Preauth incompl.</Flag>)
  if (flags.length === 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Al día
      </span>
    )
  return <div className="flex flex-wrap gap-1">{flags}</div>
}

// Botón de acción: solo el icono; al hover, un tooltip explica qué hace.
// `strike` dibuja una línea diagonal sobre el icono (acción no disponible).
function ActionButton({
  icon: Icon,
  label,
  onClick,
  className,
  disabled,
  strike,
}: {
  icon: typeof Printer
  label: string
  onClick: () => void
  className?: string
  disabled?: boolean
  strike?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            if (!disabled) onClick()
          }}
          className={cn(
            "relative rounded-md p-1.5",
            disabled ? "cursor-not-allowed text-gray-300" : cn("text-gray-400 hover:bg-gray-100", className),
          )}
        >
          <Icon className="h-4 w-4" />
          {strike && (
            <span className="pointer-events-none absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gray-400" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

const patientSkeleton = (
  <div className="flex items-center gap-2.5">
    <Skeleton className="h-8 w-8 rounded-full" />
    <div className="space-y-1.5">
      <Skeleton className="h-3.5 w-28 rounded" />
      <Skeleton className="h-3 w-20 rounded" />
    </div>
  </div>
)
const auditSkeleton = (
  <div className="flex gap-1">
    <Skeleton className="h-6 w-6 rounded-full" />
    <Skeleton className="h-6 w-6 rounded-full" />
  </div>
)

export function ProtocolsTable({
  protocols,
  selectedIds,
  onToggleSelect,
  onRowClick,
  sort,
  onSortChange,
  isLoading,
  onQuickPayment,
  onReport,
  onUncancel,
  canUncancel,
  busyId,
}: ProtocolsTableProps) {
  const columns: Column<ProtocolListItem>[] = [
    {
      id: "select",
      header: "",
      className: "w-10 pl-4",
      responsive: "hidden md:table-cell",
      cell: (p) => (
        <input
          type="checkbox"
          checked={selectedIds.has(p.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect(p.id)}
          className="h-4 w-4 accent-[#204983]"
          aria-label={`Seleccionar protocolo ${p.id}`}
        />
      ),
    },
    {
      id: "id",
      header: "Protocolo",
      sortable: true,
      sortField: "id",
      cell: (p) => <span className="font-mono text-sm font-semibold text-[#204983]">#{p.id}</span>,
    },
    {
      id: "patient",
      header: "Paciente",
      sortable: true,
      sortField: "patient__last_name",
      skeleton: patientSkeleton,
      // El max-width va en un div interno (no en el td): en table auto-layout el
      // max-width del td se ignora. Así el nombre trunca y nunca empuja scroll.
      cell: (p) => (
        <div className="flex min-w-0 max-w-[150px] items-center gap-2.5 sm:max-w-[200px] xl:max-w-[260px]">
          <InitialsAvatar name={fullName(p)} size="sm" />
          <div className="min-w-0">
            {p.patient?.id && !p.patient?.is_anonymous ? (
              <Link
                to={`/pacientes/${p.patient.id}`}
                onClick={(e) => e.stopPropagation()}
                className="block truncate font-semibold text-gray-800 hover:text-[#204983] hover:underline"
              >
                {fullName(p)}
              </Link>
            ) : (
              <div className="truncate font-semibold text-gray-800">{fullName(p)}</div>
            )}
            {!p.patient?.is_anonymous && (
              <div className="truncate text-xs text-gray-500">
                DNI {formatDni(p.patient?.dni)}
                {typeof p.patient?.age === "number" && ` · ${p.patient.age} años`}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "insurance",
      header: "Obra social",
      responsive: "hidden xl:table-cell",
      skeleton: <Skeleton className="h-4 w-24 rounded" />,
      cell: (p) =>
        p.insurance?.name ? (
          <div className="max-w-[200px]">
            <div className="truncate font-medium text-gray-700">{p.insurance.name}</div>
            {p.affiliate_number && <div className="truncate font-mono text-xs text-gray-500">{p.affiliate_number}</div>}
          </div>
        ) : (
          <span className="text-gray-400">Particular</span>
        ),
    },
    {
      id: "status",
      header: "Estado",
      sortable: true,
      sortField: "status__name",
      responsive: "hidden md:table-cell",
      skeleton: <Skeleton className="h-5 w-24 rounded-full" />,
      cell: (p) => <StatusPill statusName={p.status?.name} />,
    },
    {
      id: "blockers",
      header: "Pendientes",
      responsive: "hidden lg:table-cell",
      skeleton: <Skeleton className="h-5 w-20 rounded" />,
      cell: (p) => <BlockersCell p={p} />,
    },
    {
      id: "balance",
      header: "Pago",
      responsive: "hidden md:table-cell",
      skeleton: <Skeleton className="h-4 w-24 rounded" />,
      cell: (p) => <PaymentCell p={p} />,
    },
    {
      id: "audit",
      header: "Auditoría",
      responsive: "hidden lg:table-cell",
      skeleton: auditSkeleton,
      cell: (p) =>
        p.creation?.user || p.last_change?.user ? (
          <AuditAvatars creation={p.creation} lastChange={p.last_change} size="sm" />
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      className: "pr-3",
      responsive: "hidden sm:table-cell",
      cell: (p) => {
        const isCancelled = p.status?.id === 4
        return (
          <TooltipProvider delayDuration={150}>
            <div className="flex items-center justify-end gap-0.5">
              {busyId === p.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : isCancelled ? (
                // Protocolo cancelado: solo "Reactivar", y solo con permiso.
                canUncancel ? (
                  <ActionButton icon={RotateCcw} label="Reactivar protocolo" onClick={() => onUncancel(p)} className="hover:text-[#204983]" />
                ) : (
                  <span className="px-1.5 text-xs text-gray-400">Cancelado</span>
                )
              ) : (
                <>
                  <ActionButton icon={DollarSign} label="Registrar pago" onClick={() => onQuickPayment(p)} className="hover:text-[#204983]" />
                  <ActionButton icon={FileText} label="Reporte (imprimir / enviar)" onClick={() => onReport(p)} className="hover:text-[#204983]" />
                </>
              )}
            </div>
          </TooltipProvider>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={protocols}
      getRowId={(p) => p.id}
      onRowClick={(p) => onRowClick(p.id)}
      sort={sort}
      onSortChange={onSortChange}
      isLoading={isLoading}
      emptyMessage="No se encontraron protocolos"
      rowClassName={(p) =>
        cn("border-l-4", getProtocolStatusStyleByName(p.status?.name).border, selectedIds.has(p.id) && "bg-blue-50/50")
      }
    />
  )
}
