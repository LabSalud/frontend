import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder de la cabecera compacta (avatar + protocolo/estado + nombre)
 * usada en las páginas de detalle de resultados y validación mientras cargan. */
export function ProtocolMiniHeaderSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-6 w-44 rounded" />
        <Skeleton className="h-4 w-28 rounded" />
      </div>
    </div>
  )
}
