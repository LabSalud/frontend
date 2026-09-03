"use client"

import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { AlertCircle, CheckCircle } from "lucide-react"

import { PanelDeContrasenaNueva } from "@/components/common/panel-de-contrasena-nueva"
import { TransicionLateral } from "@/components/common/transicion-lateral"
import { AUTH_ENDPOINTS, getAuthHeaders } from "@/config/api"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

/**
 * Donde cae el link del mail: elegir la contraseña sin estar adentro.
 *
 * Es la misma caja blanca del login —el mismo panel, la misma caída desde
 * arriba, los mismos paneles cruzándose de costado— porque es el mismo momento
 * para quien lo usa: está afuera del sistema y quiere entrar.
 *
 * El token no se valida al abrir la pantalla: se manda junto con la contraseña
 * y el servidor contesta. Preguntar antes "¿este token sirve?" sería un
 * endpoint más que dice si una cuenta existe, y no ahorra nada: igual hay que
 * escribir la contraseña.
 */
export default function RestablecerContrasena() {
  const { uid = "", token = "" } = useParams()
  const navigate = useNavigate()
  const [listo, setListo] = useState(false)
  const [entro, setEntro] = useState(false)

  // La misma caída desde arriba del login, y por el mismo motivo: dos frames
  // para que el navegador tenga desde dónde animar.
  useEffect(() => {
    let interno = 0
    const externo = requestAnimationFrame(() => {
      interno = requestAnimationFrame(() => setEntro(true))
    })
    return () => {
      cancelAnimationFrame(externo)
      cancelAnimationFrame(interno)
    }
  }, [])

  const guardar = async (contrasena: string): Promise<string | null> => {
    try {
      const respuesta = await fetch(AUTH_ENDPOINTS.PASSWORD_RESET_CONFIRM, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ uid, token, password: contrasena }),
      })
      if (respuesta.ok) {
        setListo(true)
        return null
      }
      const datos = await respuesta.json().catch(() => ({}))
      return formatApiError(datos, "No se pudo cambiar la contraseña.")
    } catch (fallo) {
      return getErrorMessage(fallo, "No se pudo completar la operación.")
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 flex w-full justify-center">
        <div
          className={`
            w-full max-w-md overflow-hidden rounded-b-3xl bg-white shadow-2xl
            origin-top transform-gpu transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)]
            ${entro ? "translate-y-0 scale-y-100 opacity-100" : "-translate-y-[110vh] scale-y-75 opacity-0"}
          `}
        >
          <TransicionLateral claveDelPanel={listo ? "listo" : "elegir"}>
            {listo ? (
              <div className="px-8 py-8">
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h1 className="mb-2 text-2xl font-bold text-gray-800">Contraseña cambiada</h1>
                  <p className="text-sm text-gray-600">Ya podés entrar con la nueva</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/login", { replace: true })}
                  className="w-full rounded-lg bg-[#204983] px-4 py-3 font-medium text-white transition-colors duration-200 hover:bg-[#1a3d6f] focus:outline-none focus:ring-2 focus:ring-[#204983] focus:ring-offset-2"
                >
                  Ir a iniciar sesión
                </button>
              </div>
            ) : !uid || !token ? (
              <div className="px-8 py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-gray-800">Ese link está incompleto</h1>
                <p className="mb-6 text-sm text-gray-600">
                  Copialo entero del correo, o pedí uno nuevo desde "¿Olvidaste tu contraseña?".
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/login", { replace: true })}
                  className="w-full rounded-lg bg-[#204983] px-4 py-3 font-medium text-white transition-colors duration-200 hover:bg-[#1a3d6f]"
                >
                  Ir a iniciar sesión
                </button>
              </div>
            ) : (
              <PanelDeContrasenaNueva
                titulo="Elegí tu contraseña"
                bajada="Es la que vas a usar para entrar de ahora en más."
                textoDelBoton="Guardar contraseña"
                onGuardar={guardar}
                onCancelar={() => navigate("/login", { replace: true })}
                textoDeCancelar="Volver al inicio de sesión"
              />
            )}
          </TransicionLateral>
        </div>
      </div>
    </div>
  )
}
