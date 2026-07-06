"use client"

import { useState } from "react"
import { AlertTriangle, CalendarRange, Clock } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFacturacionMock } from "./use-facturacion-mock"
import { ProtocolBillingRow } from "./components/protocol-billing-row"
import { OssSummaryRow } from "./components/oss-summary-row"
import { EditableCloseDate } from "./components/editable-close-date"
import { ClosePresentationDialog } from "./components/close-presentation-dialog"
import { PresentationHistoryCard } from "./components/presentation-history-card"
import { PresentationEarningsChart } from "./components/presentation-earnings-chart"
import { ReminderSettingsPanel } from "./components/reminder-settings-panel"
import type { BillingEntityId } from "./mock-data"

const tabClass =
  "flex-shrink-0 rounded-full border border-transparent bg-transparent px-4 py-1.5 text-sm font-medium text-gray-600 shadow-none transition-colors hover:bg-gray-100 data-[state=active]:border-[#204983] data-[state=active]:bg-[#204983] data-[state=active]:text-white data-[state=active]:shadow-sm"

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

export default function FacturacionPage() {
  const m = useFacturacionMock()
  const [entityId, setEntityId] = useState<BillingEntityId>(m.entities[0].id)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)

  const entity = m.entities.find((e) => e.id === entityId)!
  const openPresentation = m.openPresentationFor(entityId)
  const pending = m.pendingProtocolsFor(entityId)
  const history = m.historyFor(entityId)
  const allPresentations = m.presentationsFor(entityId)

  const remaining = daysUntil(openPresentation?.closeDate ?? null)
  // No se auto-cierra al llegar la fecha: solo avisa (una vez por día, vía WhatsApp)
  // que ya está vencida y hay que cerrarla a mano.
  const isOverdue = remaining != null && remaining < 0
  const withinReminderWindow = remaining != null && remaining <= m.reminderDaysBefore && remaining >= 0

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4">
      <div className="rounded-2xl bg-white/95 p-4 shadow-md backdrop-blur-sm md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 md:text-2xl">Facturación</h1>
            <p className="text-sm text-gray-500">Ayuda memoria para presentar y cobrar a las obras sociales.</p>
          </div>
          {/* Selector de entidad: cada una tiene su propio ciclo de presentación */}
          <div className="flex gap-1 rounded-full bg-gray-100 p-1">
            {m.entities.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEntityId(e.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  entityId === e.id ? "bg-[#204983] text-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                {e.name}
              </button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="actual" className="w-full">
          <TabsList className="mb-5 flex h-auto w-full flex-wrap justify-start gap-2 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger value="actual" className={tabClass}>
              Presentación actual
            </TabsTrigger>
            <TabsTrigger value="historial" className={tabClass}>
              Historial
            </TabsTrigger>
            <TabsTrigger value="graficos" className={tabClass}>
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="recordatorios" className={tabClass}>
              Recordatorios
            </TabsTrigger>
          </TabsList>

          {/* ===== Presentación actual ===== */}
          <TabsContent value="actual" className="space-y-4">
            {openPresentation && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div>
                  <p className="font-semibold text-gray-800">{openPresentation.label}</p>
                  <div className="text-xs text-gray-500">
                    {openPresentation.periodStart} →{" "}
                    <EditableCloseDate
                      closeDate={openPresentation.closeDate}
                      onSave={(date) => m.setTargetCloseDate(openPresentation.id, date)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOverdue ? (
                    <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-red-700">
                      <AlertTriangle className="h-3 w-3" />
                      Vencida hace {Math.abs(remaining!)} día{Math.abs(remaining!) === 1 ? "" : "s"}
                    </Badge>
                  ) : (
                    remaining != null && (
                      <Badge
                        variant="outline"
                        className={
                          withinReminderWindow
                            ? "gap-1 border-amber-200 bg-amber-50 text-amber-700"
                            : "gap-1 border-gray-200 bg-gray-50 text-gray-600"
                        }
                      >
                        <Clock className="h-3 w-3" />
                        Faltan {remaining} días
                      </Badge>
                    )
                  )}
                  <Button size="sm" className="bg-[#204983] hover:bg-[#1a3d6f]" onClick={() => setCloseDialogOpen(true)}>
                    <CalendarRange className="mr-1.5 h-4 w-4" />
                    Cerrar presentación
                  </Button>
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-700">
                Protocolos pendientes de facturar ({pending.length})
              </h2>
              {pending.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
                  No hay protocolos pendientes para {entity.name}.
                </p>
              ) : (
                <div className="space-y-2">
                  {pending.map((p) => (
                    <ProtocolBillingRow
                      key={p.protocolId}
                      protocol={p}
                      onMarkBilled={m.markProtocolBilled}
                      isMarking={m.markingProtocolId === p.protocolId}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Facturados en esta presentación</h2>
              <p className="mb-2 text-xs text-gray-400">
                El valor UB y lo cobrado de cada OOSS se cargan una vez que la presentación esté cerrada, desde Historial.
              </p>
              {!openPresentation || openPresentation.ossBreakdown.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
                  Todavía no se facturó ningún protocolo en esta presentación.
                </p>
              ) : (
                <div className="space-y-2">
                  {openPresentation.ossBreakdown.map((entry) => (
                    <OssSummaryRow key={entry.ossId} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== Historial ===== */}
          <TabsContent value="historial" className="space-y-2">
            {history.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                {entity.name} todavía no tiene presentaciones cerradas.
              </p>
            ) : (
              history.map((p) => (
                <PresentationHistoryCard
                  key={p.id}
                  presentation={p}
                  entity={entity}
                  onSaveUbValue={m.saveUbValue}
                  onSaveCollected={m.saveCollected}
                  onSaveCollectedTotal={m.saveCollectedTotal}
                />
              ))
            )}
          </TabsContent>

          {/* ===== Gráficos ===== */}
          <TabsContent value="graficos">
            <PresentationEarningsChart entity={entity} presentations={allPresentations} />
          </TabsContent>

          {/* ===== Recordatorios (config global, no por entidad) ===== */}
          <TabsContent value="recordatorios">
            <ReminderSettingsPanel
              phones={m.reminderPhones}
              daysBefore={m.reminderDaysBefore}
              onAddPhone={m.addReminderPhone}
              onTogglePhone={m.togglePhone}
              onRemovePhone={m.removePhone}
              onChangeDaysBefore={m.changeDaysBefore}
            />
          </TabsContent>
        </Tabs>
      </div>

      {openPresentation && (
        <ClosePresentationDialog
          open={closeDialogOpen}
          onOpenChange={setCloseDialogOpen}
          entity={entity}
          onConfirm={(nextDate) => m.closePresentation(entityId, nextDate)}
        />
      )}
    </div>
  )
}
