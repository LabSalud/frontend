"use client"

import type { ReactNode } from "react"
import { ChevronDown, ChevronUp, ChevronsUpDown, AlertCircle } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type SortDirection = "asc" | "desc"
export type SortState = { field: string; dir: SortDirection } | null

export interface Column<T> {
  /** Identificador estable de la columna. */
  id: string
  header: ReactNode
  /** Render de la celda para una fila. */
  cell: (row: T) => ReactNode
  /** Si la columna ordena. Requiere `sortField` (campo de ordering del backend). */
  sortable?: boolean
  sortField?: string
  align?: "left" | "right" | "center"
  className?: string
  headerClassName?: string
  /** Clases de visibilidad responsive (ej. "hidden md:table-cell") aplicadas
   * al header y a la celda, para ocultar la columna en pantallas chicas. */
  responsive?: string
  /** Skeleton de carga propio de la columna (matchea la forma del contenido). */
  skeleton?: ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string | number
  onRowClick?: (row: T) => void
  /** Estado de orden controlado. Las columnas con `sortField` lo togglean. */
  sort?: SortState
  onSortChange?: (sort: SortState) => void
  isLoading?: boolean
  skeletonRows?: number
  emptyMessage?: ReactNode
  /** Pie de tabla: sentinel de scroll infinito, "cargando más", etc. */
  footer?: ReactNode
  rowClassName?: (row: T) => string
}

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const

// Click en header ordenable: asc → desc → sin orden.
function nextSort(current: SortState, field: string): SortState {
  if (!current || current.field !== field) return { field, dir: "asc" }
  if (current.dir === "asc") return { field, dir: "desc" }
  return null
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  sort,
  onSortChange,
  isLoading,
  skeletonRows = 8,
  emptyMessage = "No hay datos para mostrar",
  footer,
  rowClassName,
}: DataTableProps<T>) {
  const renderSortIcon = (col: Column<T>) => {
    if (!col.sortable || !col.sortField) return null
    const active = sort?.field === col.sortField
    if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />
    return sort?.dir === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-[#204983]" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-[#204983]" />
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-gray-50/80">
          <TableRow className="border-gray-200 hover:bg-transparent">
            {columns.map((col) => {
              const canSort = col.sortable && col.sortField && onSortChange
              return (
                <TableHead
                  key={col.id}
                  className={cn(
                    "h-11 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500",
                    alignClass[col.align ?? "left"],
                    canSort && "cursor-pointer select-none hover:text-[#204983]",
                    col.responsive,
                    col.headerClassName,
                  )}
                  onClick={
                    canSort
                      ? () => onSortChange!(nextSort(sort ?? null, col.sortField!))
                      : undefined
                  }
                >
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      col.align === "right" && "flex-row-reverse",
                    )}
                  >
                    {col.header}
                    {renderSortIcon(col)}
                  </span>
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={`sk-${i}`} className="border-gray-100 hover:bg-transparent">
                {columns.map((col, ci) => (
                  <TableCell key={col.id} className={cn("px-3 py-3", alignClass[col.align ?? "left"], col.responsive, col.className)}>
                    {col.skeleton ?? (
                      <Skeleton
                        className={cn(
                          "h-4 rounded",
                          ci === 0 ? "w-10" : ci === 1 ? "w-32" : "w-16",
                          col.align === "right" && "ml-auto",
                          col.align === "center" && "mx-auto",
                        )}
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="py-14 text-center">
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <AlertCircle className="mb-2 h-8 w-8" />
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={getRowId(row)}
                className={cn(
                  "border-gray-100",
                  onRowClick && "cursor-pointer",
                  rowClassName?.(row),
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    className={cn("px-3 py-3", alignClass[col.align ?? "left"], col.responsive, col.className)}
                  >
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {footer}
    </div>
  )
}
