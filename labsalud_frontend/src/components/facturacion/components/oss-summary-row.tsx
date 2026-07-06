import type { OssBreakdown } from "../mock-data"

interface OssSummaryRowProps {
  entry: OssBreakdown
}

/**
 * Resumen simple de una OOSS dentro de la presentación ABIERTA: solo
 * protocolos y UB acumulados. El precio (valor UB / cobrado) recién se carga
 * una vez que la presentación está cerrada — ver oss-breakdown-card.tsx en Historial.
 */
export function OssSummaryRow({ entry }: OssSummaryRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <p className="font-medium text-gray-800">{entry.ossName}</p>
      <p className="text-xs text-gray-500">
        {entry.protocolsCount} protocolo{entry.protocolsCount === 1 ? "" : "s"} · UB total: {entry.totalUb}
      </p>
    </div>
  )
}
