"use client"

import { FileDown, Mail, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Cuando el informe se genera por una vía que no es la que eligió el paciente.
 *
 * POR QUÉ HAY QUE PREGUNTAR
 * =========================
 * Bajar o imprimir el informe marcaba los análisis como enviados y podía
 * completar el protocolo. Eso está bien cuando el paciente retira el papel: se
 * generó, se lo llevó, listo.
 *
 * Pero cuando el método que eligió es WhatsApp o mail, generar el PDF puede
 * querer decir dos cosas opuestas:
 *
 *   - El envío no está andando y se lo mando por otro lado a mano. El paciente
 *     lo va a tener: hay que marcarlo.
 *   - Lo estoy mirando, o lo guardo para después. El paciente no lo tiene: si
 *     se marca, el protocolo se cae de la cola de pendientes de envío y nadie
 *     se lo manda nunca.
 *
 * El servidor no puede distinguirlas. El único que sabe cuál de las dos es, es
 * quien apretó el botón — así que se le pregunta a él.
 *
 * SE PREGUNTA SOLO CUANDO IMPORTA
 * ===============================
 * Si el paciente retira por mostrador, generar el informe ES entregarlo y no
 * hay nada que preguntar. Un cartel que aparece siempre se aprieta sin leer, y
 * ahí deja de servir para el caso en que sí importaba.
 */

export type QueSeGenero = "impresion" | "descarga"

interface MarcarEnviadoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Cómo lo recibe el paciente según el protocolo: "WhatsApp", "Email"… */
  metodoDelPaciente: string
  /** Si se apretó Imprimir o Descargar. Cambia solo el verbo del texto. */
  queSeGenero: QueSeGenero
  /** `true` = el paciente lo va a recibir; `false` = queda pendiente de envío. */
  onElegir: (marcarComoEnviado: boolean) => void
}

export function MarcarEnviadoDialog({
  open,
  onOpenChange,
  metodoDelPaciente,
  queSeGenero,
  onElegir,
}: MarcarEnviadoDialogProps) {
  const metodo = (metodoDelPaciente || "").toLowerCase()
  const Icono = metodo.includes("mail") ? Mail : MessageCircle
  const verbo = queSeGenero === "impresion" ? "imprimir" : "descargar"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-[#204983]" />
            ¿El paciente lo va a recibir?
          </DialogTitle>
          <DialogDescription className="text-left">
            Este protocolo se entrega por{" "}
            <span className="inline-flex items-center gap-1 font-medium text-gray-700">
              <Icono className="h-3.5 w-3.5" />
              {metodoDelPaciente}
            </span>
            , y lo que estás por hacer es {verbo} el informe.
          </DialogDescription>
        </DialogHeader>

        {/* LAS DOS OPCIONES DICEN QUÉ PASA DESPUÉS, NO "SÍ" Y "NO".
            La pregunta se contesta mirando la consecuencia: uno saca el
            protocolo de la cola de pendientes y el otro lo deja. Con "Sí/No" hay
            que acordarse de cuál era cuál. */}
        <div className="space-y-2 text-sm">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
            <p className="font-medium text-emerald-900">Se lo mando por otra vía</p>
            <p className="mt-0.5 text-xs text-emerald-800">
              Los análisis quedan marcados como entregados y el protocolo sale de
              la cola de pendientes de envío.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <p className="font-medium text-amber-900">Todavía no se lo entrego</p>
            <p className="mt-0.5 text-xs text-amber-800">
              El PDF se genera igual, pero el protocolo sigue pendiente de envío
              hasta que salga de verdad.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            className="w-full border-amber-300 text-amber-800 hover:bg-amber-50 sm:w-auto"
            onClick={() => onElegir(false)}
          >
            Todavía no
          </Button>
          <Button
            className="w-full bg-[#204983] hover:bg-[#1a3d6f] sm:w-auto"
            onClick={() => onElegir(true)}
          >
            Se lo mando
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
