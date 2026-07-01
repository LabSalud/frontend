"use client"

import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { DataTable, type Column, type SortState } from "@/components/common/data-table"
import { InitialsAvatar } from "@/components/common/initials-avatar"
import { StatusPill } from "@/components/common/status-pill"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getProtocolStatusStyleByName } from "@/lib/status-styles"
import type { ProtocolListItem } from "@/types"

interface ResultsQueueTableProps {
  protocols: ProtocolListItem[]
  onRowClick: (id: number) => void
  sort: SortState
  onSortChange: (sort: SortState) => void
  isLoading?: boolean
}

function fullName(p: ProtocolListItem) {
  if (p.patient?.is_anonymous) return "Paciente anónimo"
  return `${p.patient?.first_name ?? ""} ${p.patient?.last_name ?? ""}`.trim() || "—"
}

function ProgressBar({ loaded, total, validated }: { loaded: number; total: number; validated: number }) {
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  return (
    <div className="min-w-[130px]">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-gray-600">{loaded}/{total} cargados</span>
        <span className="text-emerald-600">{validated} validados</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="absolute inset-y-0 left-0 bg-blue-400" style={{ width: `${pct(loaded)}%` }} />
        <div className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${pct(validated)}%` }} />
      </div>
    </div>
  )
}

const patientSkeleton = (
  <div className="flex items-center gap-2.5">
    <Skeleton className="h-8 w-8 rounded-full" />
    <Skeleton className="h-4 w-32 rounded" />
  </div>
)

export function ResultsQueueTable({ protocols, onRowClick, sort, onSortChange, isLoading }: ResultsQueueTableProps) {
  const columns: Column<ProtocolListItem>[] = [
    {
      id: "id",
      header: "Protocolo",
      sortable: true,
      sortField: "id",
      className: "pl-4",
      skeleton: <Skeleton className="h-4 w-12 rounded" />,
      cell: (p) => <span className="font-mono text-sm font-semibold text-[#204983]">#{p.id}</span>,
    },
    {
      id: "patient",
      header: "Paciente",
      skeleton: patientSkeleton,
      cell: (p) => (
        <div className="flex min-w-0 max-w-[220px] items-center gap-2.5">
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
              <span className="truncate font-semibold text-gray-800">{fullName(p)}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "insurance",
      header: "Obra social",
      responsive: "hidden lg:table-cell",
      cell: (p) => <span className="text-sm text-gray-600">{p.insurance?.name || "Particular"}</span>,
    },
    {
      id: "progress",
      header: "Progreso",
      skeleton: <Skeleton className="h-6 w-32 rounded" />,
      cell: (p) => (
        <ProgressBar
          loaded={p.loaded_results_count ?? 0}
          total={p.total_analyses_count ?? 0}
          validated={p.validated_results_count ?? 0}
        />
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
      id: "chevron",
      header: "",
      align: "right",
      className: "pr-4 w-10",
      cell: () => <ChevronRight className="h-4 w-4 text-gray-300" />,
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
      emptyMessage="No hay protocolos con resultados pendientes"
      rowClassName={(p) => cn("border-l-4", getProtocolStatusStyleByName(p.status?.name).border)}
    />
  )
}
