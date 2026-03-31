"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { User, Lock, AlertCircle } from "lucide-react"
import useAuth from "@/contexts/auth-context"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPageLoaded, setIsPageLoaded] = useState(false)
  const { login, isLoading, user } = useAuth()
  const navigate = useNavigate()

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    const lastUsername = localStorage.getItem("last_username")
    if (lastUsername && !username) {
      setUsername(lastUsername)
    }
  }, [])

  useEffect(() => {
    const entranceTimeout = setTimeout(() => {
      setIsPageLoaded(true)
    }, 0)

    return () => clearTimeout(entranceTimeout)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setError("") // Limpiar errores previos
    setIsSubmitting(true)

    if (!username.trim() || !password.trim()) {
      setError("Por favor, completa todos los campos")
      setIsSubmitting(false)
      return
    }

    const success = await login(username, password)

    if (success) {
      // La redirección se manejará en el useEffect cuando user cambie
    } else {
      setError("Usuario o contraseña incorrectos. Por favor, verifica tus credenciales e intenta nuevamente.")
    }

    setIsSubmitting(false)
  }

  // Mostrar loading solo durante la verificación inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#adadad] flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-[#204983] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700">Verificando sesión...</span>
          </div>
        </div>
      </div>
    )
  }

  // Si ya hay usuario, no mostrar nada (el useEffect se encargará de redirigir)
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#adadad] relative overflow-hidden">
      {/* Background Logo */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <img
          src="/logo.svg"
          alt="Background Logo"
          className="w-[100vw] h-[100vh] max-w-[1300px] max-h-[1200px] object-contain opacity-65 blur-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = "/placeholder.svg?height=800&width=800&text=LOGO&bg=f3f4f6&color=9ca3af"
            target.style.opacity = "0.9"
          }}
        />
      </div>

      {/* Notch Container */}
      <div className="relative z-10 w-full flex justify-center">
        {/* Notch */}
        <div
          className={`
            bg-white rounded-b-3xl shadow-2xl w-full max-w-md
            origin-top transform-gpu will-change-transform
            transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)]
            ${isPageLoaded ? "translate-y-0 opacity-100 scale-y-100" : "-translate-y-[110vh] opacity-0 scale-y-75"}
          `}
        >
          {/* Login Form */}
          <div className="px-8 py-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Bienvenido</h1>
              <p className="text-gray-600 text-sm">Inicia sesión en tu cuenta</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 text-sm font-medium">Error de autenticación</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (error) setError("") // Limpiar error al escribir
                  }}
                  placeholder="Usuario"
                  className={`
                    w-full pl-10 pr-4 py-3 bg-gray-100 border rounded-lg text-gray-800 placeholder-gray-500 
                    focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200
                    ${error ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-[#204983]"}
                  `}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Password Field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-600" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError("") // Limpiar error al escribir
                  }}
                  placeholder="Contraseña"
                  className={`
                    w-full pl-10 pr-4 py-3 bg-gray-100 border rounded-lg text-gray-800 placeholder-gray-500 
                    focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200
                    ${error ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-[#204983]"}
                  `}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Login Button */}
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
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <span>Iniciar Sesión</span>
                )}
              </button>
            </form>

            {/* Additional Options */}
            <div className="mt-6 text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
