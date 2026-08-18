"use client"

import { useState } from "react"
import { KeyRound, Loader2, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { USER_ENDPOINTS } from "@/config/api"
import useAuth from "@/contexts/auth-context"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

/**
 * El cartel de bienvenida cuando la contraseña la puso otra persona.
 *
 * Aparece después de un alta, de un reset por mail o del botón de gestión de
 * usuarios. No se puede cerrar, y no es un capricho de la pantalla: mientras
 * la marca esté puesta, el servidor contesta 403 a todo lo que no sea el
 * propio perfil. Dejar navegar sería mostrar una pantalla de errores.
 *
 * Va acá y no en el login porque el login puede pasar por el segundo factor:
 * poniéndolo en el layout, se muestra igual por los dos caminos y también
 * cuando a alguien lo marcan con la sesión ya abierta.
 */

const LARGO_MINIMO = 8

export function CambioDeContrasenaObligatorio() {
  const { user, contrasenaCambiada, logout } = useAuth()
  const { apiRequest } = useApi()
  const toastActions = useToast()

  const [contrasena, setContrasena] = useState("")
  const [repetida, setRepetida] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  if (!user?.must_change_password) return null

  const corta = contrasena.length > 0 && contrasena.length < LARGO_MINIMO
  const noCoinciden = repetida.length > 0 && contrasena !== repetida
  const puedeGuardar =
    contrasena.length >= LARGO_MINIMO && contrasena === repetida && !guardando

  const guardar = async () => {
    if (!puedeGuardar) return
    setGuardando(true)
    setError("")
    try {
      const respuesta = await apiRequest(USER_ENDPOINTS.ME, {
        method: "PATCH",
        body: { password: contrasena },
      })

      if (respuesta.ok) {
        contrasenaCambiada()
        setContrasena("")
        setRepetida("")
        toastActions.success("Listo", {
          description: "Tu contraseña quedó cambiada.",
        })
        return
      }

      const datos = await respuesta.json().catch(() => ({}))
      setError(formatApiError(datos, "No se pudo cambiar la contraseña."))
    } catch (e) {
      setError(getErrorMessage(e, "Ocurrió un error de red o servidor."))
    } finally {
      setGuardando(false)
    }
  }

  return (
    // Sin `onOpenChange`: el Escape y el clic afuera no lo cierran, porque no
    // hay nada detrás que se pueda usar.
    <Dialog open>
      <DialogContent
        className="w-[95vw] max-w-md [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="space-y-1 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#204983]/10">
            <ShieldAlert className="h-5 w-5 text-[#204983]" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Bienvenido/a, {user.first_name || user.username}
          </h2>
          <p className="text-sm text-gray-500">
            Tu contraseña actual la definió otra persona. Elegí una nueva para
            empezar a usar el sistema.
          </p>
        </div>

        <div className="space-y-4 py-2">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

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
              disabled={guardando}
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
              onKeyDown={(e) => {
                if (e.key === "Enter") guardar()
              }}
              disabled={guardando}
            />
            {noCoinciden && <p className="text-xs text-red-500">Las dos no coinciden.</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={guardar}
            disabled={!puedeGuardar}
            className="w-full bg-[#204983] hover:bg-[#1a3d6f]"
          >
            {guardando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            Cambiar contraseña
          </Button>
          {/* La salida honesta: no se puede seguir sin cambiarla, pero sí
              cerrar sesión y volver más tarde. */}
          <Button
            variant="ghost"
            onClick={() => logout()}
            disabled={guardando}
            className="w-full text-gray-500"
          >
            Cerrar sesión
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
