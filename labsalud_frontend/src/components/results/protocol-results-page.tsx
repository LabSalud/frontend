"use client"

import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ChevronRight, AlertCircle, FileText, CheckCircle, TestTube } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InitialsAvatar } from "@/components/common/initials-avatar"
import { StatusPill } from "@/components/common/status-pill"
import { useApiQuery } from "@/hooks/use-api-query"
import { PROTOCOL_ENDPOINTS } from "@/config/api"
import { ProtocolResultsLoader } from "./components/protocol-results-loader"
import type { Protocol } from "@/types"

export default function ProtocolResultsPage() {
  const { protocolId } = useParams<{ protocolId: string }>()
  const navigate = useNavigate()

  const query = useApiQuery<Protocol>({
    queryKey: ["protocols", "detail", protocolId],
    url: PROTOCOL_ENDPOINTS.PROTOCOL_DETAIL(Number(protocolId)),
    enabled: Boolean(protocolId),
  })
  const protocol = query.data

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

  if (query.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#204983] border-t-transparent" />
      </div>
    )
  }

  if (query.error || !protocol) {
    return (
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4">
        {Breadcrumb}
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p>No se pudo cargar el protocolo #{protocolId}.</p>
          <Button size="sm" className="ml-auto bg-[#204983]" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const name = protocol.patient?.is_anonymous
    ? "Paciente anónimo"
    : `${protocol.patient?.first_name ?? ""} ${protocol.patient?.last_name ?? ""}`.trim()

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4">
      {Breadcrumb}

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <InitialsAvatar name={name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-500">Protocolo #{protocol.id}</span>
                <StatusPill statusName={protocol.status?.name} />
              </div>
              <h1 className="text-xl font-bold text-gray-800">{name}</h1>
              {!protocol.patient?.is_anonymous && <p className="text-sm text-gray-500">DNI {protocol.patient?.dni}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate(`/protocolos/${protocol.id}`)}>
              <FileText className="mr-1.5 h-4 w-4" />
              Ver protocolo
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/validacion")}>
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Validar
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800">
          <TestTube className="h-5 w-5 text-[#204983]" />
          Carga de resultados
        </h2>
        {protocol.patient?.id && <ProtocolResultsLoader protocolId={protocol.id} patientId={protocol.patient.id} />}
      </section>
    </div>
  )
}
