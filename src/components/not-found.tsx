"use client"

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Home, ArrowLeft, FlaskConical } from "lucide-react"

export default function NotFound() {
  const [isPageLoaded, setIsPageLoaded] = useState(false)

  useEffect(() => {
    const entranceTimeout = setTimeout(() => {
      setIsPageLoaded(true)
    }, 70)

    return () => clearTimeout(entranceTimeout)
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10 w-full flex justify-center px-4">
        <div
          className={`
            bg-white rounded-b-3xl shadow-2xl w-full max-w-lg
            origin-top transform-gpu will-change-transform
            transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)]
            ${isPageLoaded ? "translate-y-0 opacity-100 scale-y-100" : "-translate-y-[110vh] opacity-0 scale-y-75"}
          `}
        >
          <div className="px-8 py-12">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 bg-[#204983]/10 rounded-full flex items-center justify-center">
                  <FlaskConical className="w-12 h-12 text-[#204983]" />
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-bold text-sm">!</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            <div className="text-center mb-8">
              <h1 className="text-7xl font-bold text-[#204983] mb-2">404</h1>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Página no encontrada</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Lo sentimos, la página que buscas no existe o ha sido movida.
                <br />
                Verifica la URL o regresa al inicio.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link
                to="/"
                className="
                  w-full py-3 px-4 bg-[#204983] hover:bg-[#1a3d6f]
                  text-white font-medium rounded-lg 
                  transition-colors duration-200 
                  focus:outline-none focus:ring-2 focus:ring-[#204983] focus:ring-offset-2
                  flex items-center justify-center gap-2
                "
              >
                <Home className="w-5 h-5" />
                <span>Ir al Inicio</span>
              </Link>

              <button
                onClick={() => window.history.back()}
                className="
                  w-full py-3 px-4 bg-gray-100 hover:bg-gray-200
                  text-gray-700 font-medium rounded-lg 
                  transition-colors duration-200 
                  focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
                  flex items-center justify-center gap-2
                "
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Volver Atrás</span>
              </button>
            </div>

            {/* Footer text */}
            <p className="text-xs text-gray-400 text-center mt-8">
              Si crees que esto es un error, contacta al administrador del sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
