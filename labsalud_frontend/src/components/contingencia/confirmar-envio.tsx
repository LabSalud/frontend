import { useEffect, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/**
 * El cartel que aparece cuando un envío no puede salir porque el servidor está
 * caído.
 *
 * POR QUÉ SE PREGUNTA ACÁ Y NO DESPUÉS
 * ====================================
 * Antes el envío se encolaba solo y se avisaba con un mensaje verde. La
 * decisión —mandarlo o no— quedaba para otro momento y probablemente otra
 * persona.
 *
 * Eso está al revés. Quien aprieta enviar SABE si quiere que se mande: tiene al
 * paciente delante y sabe por qué lo está mandando. Quien mira una cola tres
 * horas después no se acuerda de ese protocolo ni de por qué estaba ahí, así
 * que la cola se vuelve una lista de cosas que nadie se anima a descartar.
 *
 * CANCELAR NO ENCOLA NADA
 * =======================
 * Es lo que significa un cartel de confirmación. Si después lo quiere, aprieta
 * enviar de nuevo — que cuesta menos que revisar una cola.
 */

export type EnvioEnCola = {
  detail: string
  operacionId: number | null
}

type Resolver = (confirmado: boolean) => void

let pedir: ((datos: EnvioEnCola) => Promise<boolean>) | null = null

/**
 * Muestra el cartel y espera la respuesta.
 *
 * Si no hay ninguna pantalla montada que lo pueda mostrar, devuelve `true`: el
 * envío queda en cola. Es la opción segura — perder un envío en silencio es
 * peor que uno de más esperando una decisión.
 */
export async function confirmarEnvioEnCola(datos: EnvioEnCola): Promise<boolean> {
  if (!pedir) return true
  return pedir(datos)
}

export default function ConfirmarEnvio() {
  const [datos, setDatos] = useState<EnvioEnCola | null>(null)
  const [resolver, setResolver] = useState<{ fn: Resolver } | null>(null)

  useEffect(() => {
    pedir = (nuevos) =>
      new Promise<boolean>((resolve) => {
        setDatos(nuevos)
        setResolver({ fn: resolve })
      })
    return () => {
      pedir = null
    }
  }, [])

  const responder = (confirmado: boolean) => {
    resolver?.fn(confirmado)
    setResolver(null)
    setDatos(null)
  }

  return (
    <AlertDialog
      open={Boolean(datos)}
      onOpenChange={(abierto) => {
        // Cerrar con Escape o clic afuera es no decidir, y no decidir no puede
        // mandarle un mensaje a un paciente.
        if (!abierto) responder(false)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>El envío no puede salir ahora</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>{datos?.detail}</p>
              <p className="text-slate-600">
                El informe ya se puede imprimir y entregar en el mostrador. Esto es
                solo el envío por WhatsApp o mail.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => responder(false)}>
            No mandarlo
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => responder(true)}>
            Mandarlo al volver la conexión
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
