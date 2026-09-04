"use client"

import type React from "react"
import { useState } from "react"
import { AlertCircle, ArrowLeft, CheckCircle, Mail } from "lucide-react"

import { AUTH_ENDPOINTS, getAuthHeaders } from "@/config/api"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

/**
 * "¿Olvidaste tu contraseña?", adentro del panel del login.
 *
 * Era una pantalla aparte (`/forgot-password`) y ahora es un panel más del
 * mismo contenedor blanco: se entra y se vuelve con el movimiento lateral, sin
 * que la pantalla se recargue. Ver `TransicionLateral`.
 *
 * LO QUE LLEGA POR MAIL ES UN LINK
 * ================================
 * Antes el backend mandaba una contraseña temporal y esta pantalla lo decía.
 * Ahora manda un link firmado que vale una hora y se usa una sola vez; la
 * contraseña la elige la persona en `/restablecer/...`. El texto de acá tiene
 * que decir eso y no lo otro: es lo primero que alguien va a leer cuando el
 * mail no llegue y venga a preguntar qué esperaba.
 */
export function PanelDeRecuperacion({ onVolver }: { onVolver: () => void }) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const esUnMail = (valor: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim()) return setError("Escribí tu correo.")
    if (!esUnMail(email)) return setError("Ese correo no parece válido.")

    setEnviando(true)
    try {
      const respuesta = await fetch(AUTH_ENDPOINTS.PASSWORD_RESET, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ email }),
      })

      if (respuesta.ok) {
        setEnviado(true)
      } else {
        const datos = await respuesta.json().catch(() => ({}))
        // El backend contesta lo mismo exista o no la cuenta, a propósito: no
        // se puede averiguar quién tiene cuenta probando direcciones. Acá NO se
        // vuelve a distinguir el 404.
        setError(formatApiError(datos, "No se pudo procesar el pedido. Volvé a intentar."))
      }
    } catch (fallo) {
      setError(getErrorMessage(fallo, "No se pudo completar la operación."))
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="px-8 py-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-800">Fijate en tu correo</h1>
          <p className="text-sm text-gray-600">Si esa cuenta existe, el link ya salió</p>
        </div>

        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">
            Le mandamos a <strong>{email}</strong> un link para elegir una contraseña nueva.
          </p>
          <p className="mt-2 text-sm text-green-700">
            Vale una hora y se usa una sola vez. Si no llega en unos minutos, mirá el correo no
            deseado.
          </p>
        </div>

        <button
          type="button"
          onClick={onVolver}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#204983] px-4 py-3 font-medium text-white transition-colors duration-200 hover:bg-[#1a3d6f] focus:outline-none focus:ring-2 focus:ring-[#204983] focus:ring-offset-2"
        >
          Volver al inicio de sesión
        </button>
      </div>
    )
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-800">Recuperar contraseña</h1>
        <p className="text-sm text-gray-600">
          Escribí tu correo y te mandamos un link para elegir una nueva
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start space-x-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-800">No se pudo enviar</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={enviar} className="space-y-6">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Mail className="h-5 w-5 text-gray-600" />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError("")
            }}
            placeholder="vos@email.com"
            autoFocus
            className={`w-full rounded-lg border bg-gray-100 py-3 pl-10 pr-4 text-gray-800 placeholder-gray-500 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 ${
              error ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-[#204983]"
            }`}
            required
            disabled={enviando}
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#204983] px-4 py-3 font-medium text-white transition-colors duration-200 hover:bg-[#1a3d6f] focus:outline-none focus:ring-2 focus:ring-[#204983] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Enviando...</span>
            </>
          ) : (
            <span>Mandarme el link</span>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onVolver}
          className="flex w-full items-center justify-center gap-1 text-sm text-gray-600 transition-colors duration-200 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al inicio de sesión</span>
        </button>
      </div>
    </div>
  )
}
