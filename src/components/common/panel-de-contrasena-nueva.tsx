"use client"

import { useState } from "react"
import { Check, Loader2, ShieldAlert } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Elegir una contraseña nueva, con la forma de los demás paneles del login.
 *
 * Lo usan tres pantallas distintas y por eso no sabe a dónde manda ni qué pasa
 * después: recibe `onGuardar` y avisa. Las tres son la misma pregunta —"elegí
 * una contraseña"— y tenerla escrita tres veces terminaba, como siempre, en
 * tres reglas de largo mínimo distintas.
 *
 * 1. El cambio obligatorio al entrar, cuando la contraseña la puso otra
 *    persona.
 * 2. El mismo cambio pero con la sesión ya abierta, si a alguien lo marcan
 *    mientras trabaja.
 * 3. El link de recuperación que llega por mail.
 *
 * SOBRE EL LARGO MÍNIMO
 * =====================
 * Cuatro caracteres. No es para exigir una contraseña fuerte: es para atajar el
 * error de tipeo —el Enter de más, las dos letras—. En un laboratorio de cinco
 * personas, rebotar la que la bioquímica se acuerda la empuja a anotarla en un
 * papel al lado del monitor, que es peor que cualquier regla. El backend pide
 * lo mismo.
 */
export const LARGO_MINIMO = 4

export function PanelDeContrasenaNueva({
  titulo,
  bajada,
  textoDelBoton = "Guardar y entrar",
  onGuardar,
  onCancelar,
  textoDeCancelar,
}: {
  titulo: string
  bajada: string
  textoDelBoton?: string
  /** Devuelve el mensaje de error, o null si salió bien. */
  onGuardar: (contrasena: string) => Promise<string | null>
  onCancelar?: () => void
  textoDeCancelar?: string
}) {
  const [contrasena, setContrasena] = useState("")
  const [repetida, setRepetida] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [listo, setListo] = useState(false)
  const [error, setError] = useState("")

  const corta = contrasena.length > 0 && contrasena.length < LARGO_MINIMO
  const noCoinciden = repetida.length > 0 && contrasena !== repetida
  const puedeGuardar =
    contrasena.length >= LARGO_MINIMO && contrasena === repetida && !guardando && !listo

  const guardar = async () => {
    if (!puedeGuardar) return
    setGuardando(true)
    setError("")
    const fallo = await onGuardar(contrasena)
    if (fallo) {
      setError(fallo)
      setGuardando(false)
      return
    }
    // Queda en verde: lo que sigue —irse a la app, volver al login— lo decide
    // quien lo usa, y mientras tanto no se toca nada más.
    setListo(true)
    setGuardando(false)
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#204983]/10">
          <ShieldAlert className="h-6 w-6 text-[#204983]" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-800">{titulo}</h1>
        <p className="text-sm text-gray-600">{bajada}</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void guardar()
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="contrasena-nueva" className="text-sm">
            Contraseña nueva
          </Label>
          <Input
            id="contrasena-nueva"
            type="password"
            autoFocus
            autoComplete="new-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            disabled={guardando || listo}
          />
          {corta && (
            <p className="text-xs text-red-500">
              Tiene que tener al menos {LARGO_MINIMO} caracteres.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contrasena-repetida" className="text-sm">
            Repetila
          </Label>
          <Input
            id="contrasena-repetida"
            type="password"
            autoComplete="new-password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            disabled={guardando || listo}
          />
          {noCoinciden && <p className="text-xs text-red-500">Las dos tienen que ser iguales.</p>}
        </div>

        {/* El botón cuenta el resultado, como el de "Iniciar Sesión". */}
        <button
          type="submit"
          disabled={!puedeGuardar}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-white transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed ${
            listo
              ? "bg-emerald-600 focus:ring-emerald-600"
              : "bg-[#204983] hover:bg-[#1a3d6f] focus:ring-[#204983] disabled:opacity-50"
          }`}
        >
          {listo ? (
            <>
              <Check className="h-4 w-4" />
              <span>Listo</span>
            </>
          ) : guardando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <span>{textoDelBoton}</span>
          )}
        </button>
      </form>

      {onCancelar && !listo && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onCancelar}
            className="text-sm text-gray-600 transition-colors duration-200 hover:text-gray-800"
          >
            {textoDeCancelar || "Cancelar"}
          </button>
        </div>
      )}
    </div>
  )
}
