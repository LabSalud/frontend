"use client"

import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ChevronRight, AlertCircle, FileText, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InitialsAvatar } from "@/components/common/initials-avatar"
import { StatusPill } from "@/components/common/status-pill"
import { useProtocolResults } from "@/hooks/use-protocol-results"
import { useQueueNav } from "@/hooks/use-next-in-queue"
import { NextInQueuePill } from "@/components/common/next-in-queue-pill"
import { ProtocolResultsLoader } from "./components/protocol-results-loader"

export default function ProtocolResultsPage() {
  const { protocolId } = useParams<{ protocolId: string }>()
  const navigate = useNavigate()
  const controller = useProtocolResults(Number(protocolId))
  const header = controller.protocol
  const { prevId, nextId } = useQueueNav(Number(protocolId), "labsalud_results_status")

  const Breadcrumb = (
    <nav className="mb-4 flex items-center gap-1.5 text-sm">
      <Link to="/resultados" className="flex items-center gap-1 text-gray-500 transition-colors hover:text-[#204983]">
        <ArrowLeft className="h-4 w-4" />
        Resultados
      </Link>
      <ChevronRight className="h-4 w-4 text-gray-400" />
      <span className="font-medium text-gray-700">#{protocolId}</span>
    </nav>
  )

  if (controller.loading && !header) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#204983] border-t-transparent" />
      </div>
    )
  }

  if (controller.error && !header) {
    return (
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4">
        {Breadcrumb}
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p>No se pudo cargar el protocolo #{protocolId}.</p>
          <Button size="sm" className="ml-auto bg-[#204983]" onClick={() => controller.refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const name = header?.patient?.is_anonymous
    ? "Paciente anónimo"
    : `${header?.patient?.first_name ?? ""} ${header?.patient?.last_name ?? ""}`.trim()

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 pb-28 sm:px-4">
      {Breadcrumb}

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <InitialsAvatar name={name || "?"} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-500">Protocolo #{header?.id ?? protocolId}</span>
                <StatusPill statusName={header?.status?.name} />
              </div>
              <h1 className="text-xl font-bold text-gray-800">{name}</h1>
              {!header?.patient?.is_anonymous && <p className="text-sm text-gray-500">DNI {header?.patient?.dni}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate(`/protocolos/${header?.id ?? protocolId}`)}>
              <FileText className="mr-1.5 h-4 w-4" />
              Ver protocolo
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/validacion/${header?.id ?? protocolId}`)}>
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Validar
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <ProtocolResultsLoader controller={controller} />
      </section>

      <NextInQueuePill prevId={prevId} nextId={nextId} basePath="/resultados" />
    </div>
  )
}
