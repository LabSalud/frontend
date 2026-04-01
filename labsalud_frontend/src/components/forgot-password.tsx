"use client"

import type React from "react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"
import { AUTH_ENDPOINTS, getAuthHeaders } from "../config/api"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setError("")
    setIsSubmitting(true)

    if (!email.trim()) {
      setError("Por favor, ingresa tu email")
      setIsSubmitting(false)
      return
    }

    if (!validateEmail(email)) {
      setError("Por favor, ingresa un email válido")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch(AUTH_ENDPOINTS.PASSWORD_RESET, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setIsSuccess(true)
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Error al procesar la solicitud" }))
        if (response.status === 404) {
          setError("No se encontró una cuenta con este email")
        } else {
          setError(errorData.detail || errorData.message || "Error al procesar la solicitud. Intenta nuevamente.")
        }
      }
    } catch (err) {
      console.error("[v0] Password reset error:", err)
      setError("Error de conexión. Por favor, verifica tu conexión e intenta nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="relative w-full flex justify-center">
          <div className="bg-white rounded-b-3xl shadow-2xl w-full max-w-md transition-all duration-700 ease-out">
            <div className="px-8 py-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Email Enviado</h1>
                <p className="text-gray-600 text-sm">Revisa tu bandeja de entrada</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm">
                  Se ha enviado una contraseña temporal a <strong>{email}</strong>
                </p>
                <p className="text-green-700 text-sm mt-2">
                  Usa esta contraseña temporal para iniciar sesión y luego cámbiala desde tu perfil.
                </p>
              </div>

              <div className="space-y-4">
                <Link
                  to="/login"
                  className="
                    w-full py-3 px-4 bg-[#204983] hover:bg-[#1a3d6f]
                    text-white font-medium rounded-lg 
                    transition-colors duration-200 
                    focus:outline-none focus:ring-2 focus:ring-[#204983] focus:ring-offset-2
                    flex items-center justify-center space-x-2
                  "
                >
                  <span>Ir a Iniciar Sesión</span>
                </Link>

                <p className="text-xs text-gray-500 text-center">
                  Si no recibes el email en unos minutos, revisa tu carpeta de spam.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative w-full flex justify-center">
        <div className="bg-white rounded-b-3xl shadow-2xl w-full max-w-md transition-all duration-700 ease-out">
          <div className="px-8 py-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Recuperar Contraseña</h1>
              <p className="text-gray-600 text-sm">Ingresa tu email y te enviaremos una contraseña temporal</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 text-sm font-medium">Error</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
                  className={`
                    w-full pl-10 pr-4 py-3 bg-gray-100 border rounded-lg text-gray-800 placeholder-gray-500 
                    focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200
                    ${error ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-[#204983]"}
                  `}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  w-full py-3 px-4 bg-[#204983] hover:bg-[#1a3d6f]
                  text-white font-medium rounded-lg 
                  transition-colors duration-200 
                  focus:outline-none focus:ring-2 focus:ring-[#204983] focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center space-x-2
                "
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <span>Enviar Contraseña Temporal</span>
                )}
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200 flex items-center justify-center space-x-1"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver al inicio de sesión</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
