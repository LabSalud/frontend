import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder del detalle de paciente, calcado del layout de `PatientDetailPage`
 * (cabecera, protocolos en la columna principal, contacto/historial en la lateral). */
export function PatientDetailSkeleton() {
  return (
    <>
      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <Skeleton className="mb-3 h-3.5 w-20 rounded" />
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <Skeleton className="mb-3 h-3.5 w-24 rounded" />
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
