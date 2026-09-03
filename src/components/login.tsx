"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation, Link, type Location } from "react-router-dom"
import { User, Lock, AlertCircle, Check, X } from "lucide-react"
import useAuth from "@/contexts/auth-context"
import {
  MS_DE_LA_ENTRADA,
  formaDeLaNavbar,
  hayEntradaDesdeLaNavbar,
  olvidarEntradaDesdeLaNavbar,
  type FormaDeLaNavbar,
} from "@/lib/forma-de-la-navbar"
import { TwoFactorChallenge, type TwoFactorSubmitResult } from "@/components/two-factor-challenge"
import {
  TwoFactorEnrollment,
  type TwoFactorEnrollmentConfirmResult,
  type TwoFactorEnrollmentStartResult,
} from "@/components/two-factor-enrollment"

/**
 * La pantalla de inicio de sesión.
 *
 * QUÉ PASA AL APRETAR "INICIAR SESIÓN"
 * ====================================
 * La pantalla se queda donde está. Antes el formulario se desmontaba y en su
 * lugar aparecía un cartel de "Verificando sesión...", así que el usuario
 * perdía de vista lo que había escrito justo cuando podía llegar el error de
 * que estaba mal escrito.
 *
 * Ahora el resultado se cuenta en el mismo botón: verde con un tilde si las
 * credenciales estaban bien, rojo con el motivo si no. Recién cuando está bien
 * se va la pantalla, y se va morfando: los campos se desvanecen y el panel
 * blanco se encoge hasta la forma que va a tener la navbar de la app, así lo
 * último que se ve del login es lo primero que se ve adentro.
 *
 * Y AL REVÉS AL SALIR
 * ===================
 * Cerrando sesión pasa lo mismo dado vuelta: la navbar se angosta hasta el
 * ancho de este panel y, cuando el login aparece, el panel sigue desde ese
 * alto y se estira hasta el suyo, en vez de caer otra vez desde arriba.
 *
 * La forma a la que se va —y desde la que se vuelve— no está escrita acá: la
 * mide la navbar y la publica. Ver `lib/forma-de-la-navbar.ts`.
 */

/**
 * En qué está el formulario. `correcto` e `incorrecto` son el resultado
 * contado en el botón; `saliendo` es la animación que lo vuelve navbar.
 */
type FaseDelIngreso = "escribiendo" | "enviando" | "correcto" | "incorrecto" | "saliendo"

/** Cuánto se queda el botón en verde antes de que empiece a irse la pantalla. */
const MS_EN_VERDE = 500
/** Lo que tarda el panel en tomar la forma de la navbar. Igual que su transición. */
const MS_DE_SALIDA = 700

/**
 * Paso pendiente del segundo factor: el código (ya enrolada) o el alta completa
 * (obligada y sin enrolar). Los dos casos llegan con un `ephemeral_token`.
 *
 * El `ephemeral_token` vive acá, en el estado del componente, y nada más: no va
 * a localStorage ni a sessionStorage. Es media credencial (con él más el código
 * se sacan los tokens reales), así que persistirlo lo dejaría al alcance de
 * cualquier XSS y sobreviviría a la pantalla que lo necesita.
 */
interface PendingTwoFactor {
  ephemeralToken: string
  expiresIn: number
  username: string
}

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [fase, setFase] = useState<FaseDelIngreso>("escribiendo")
  // Se viene de cerrar sesión: la barra de la navbar ya tomó la forma de este
  // panel y lo que falta es desplegarlo. No cae desde arriba, sigue desde ahí.
  const [desdeLaNavbar] = useState<FormaDeLaNavbar | null>(() =>
    hayEntradaDesdeLaNavbar() ? formaDeLaNavbar() : null,
  )
  // El alto al que se despliega, medido del contenido. null = todavía plegado.
  const [altoDesplegado, setAltoDesplegado] = useState<number | null>(null)
  // Terminó de desplegarse: se sueltan las medidas y el panel vuelve a crecer
  // solo, que es lo que necesita cuando aparece el cartel de error.
  const [yaEntro, setYaEntro] = useState(false)
  const [isPageLoaded, setIsPageLoaded] = useState(false)
  // La forma a la que se encoge el panel al salir. Se mide al empezar la
  // animación y no antes: entre que se abre la pantalla y alguien se loguea,
  // la ventana pudo cambiar de tamaño.
  const [formaFinal, setFormaFinal] = useState<FormaDeLaNavbar | null>(null)
  // El alto que tiene el panel justo antes de encogerse. Hay que fijarlo en
  // píxeles: de `height: auto` a `height: 68px` el navegador no interpola, y
  // el panel pegaría un salto en vez de achicarse.
  const [altoFijado, setAltoFijado] = useState<number | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [pendingTwoFactor, setPendingTwoFactor] = useState<PendingTwoFactor | null>(null)
  const [pendingEnrollment, setPendingEnrollment] = useState<PendingTwoFactor | null>(null)
  // Confirmar el enrolamiento abre la sesión Y devuelve los códigos de
  // recuperación, que se muestran una sola vez. Sin este freno la redirección
  // desmontaría la pantalla y se los llevaría puestos.
  const [holdingRecoveryCodes, setHoldingRecoveryCodes] = useState(false)
  const { login, verifyTwoFactor, startTwoFactorEnrollment, confirmTwoFactorEnrollment, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // ProtectedRoute guarda acá la ruta que el usuario quería visitar antes de
  // ser mandado a /login, para volver ahí una vez que inicia sesión.
  const from = (location.state as { from?: Location } | null)?.from
  // Freno para el efecto de abajo: la sesión queda abierta apenas contesta el
  // servidor, pero irse en ese momento se comería la animación de salida. Es
  // un ref y no estado porque se levanta ANTES de esperar al login: para
  // cuando `user` cambia, el efecto ya lo tiene que ver puesto.
  const reteniendoLaSalida = useRef(false)
  // Los dos tiempos de la salida, para poder cancelarlos si la pantalla se
  // desmonta antes (el usuario navegó a "¿Olvidaste tu contraseña?").
  const temporizadores = useRef<number[]>([])
  const saliendo = fase === "saliendo"
  // Desde que se apretó el botón hasta que la pantalla se va, no se toca nada
  // más: la sesión ya está en camino.
  const bloqueado = fase !== "escribiendo" && fase !== "incorrecto"

  /** Adonde iba el usuario antes de que lo mandaran a iniciar sesión. */
  const destino = from ? `${from.pathname}${from.search}${from.hash}` : "/"

  // Ya hay sesión: adentro. No corre mientras se muestra la animación de
  // salida ni mientras se muestran los códigos de recuperación.
  useEffect(() => {
    if (user && !holdingRecoveryCodes && !reteniendoLaSalida.current) {
      navigate(destino, { replace: true })
    }
  }, [user, navigate, destino, holdingRecoveryCodes])

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

  useEffect(() => {
    const pendientes = temporizadores
    return () => {
      pendientes.current.forEach((id) => clearTimeout(id))
    }
  }, [])

  // EL DESPLIEGUE, CUANDO SE LLEGA DESDE LA NAVBAR.
  //
  // El panel arranca con el alto de la barra y el contenido invisible; dos
  // frames después toma el alto de su contenido —medido, porque a `auto` no se
  // anima— y el formulario aparece. Al terminar se sueltan las medidas.
  useEffect(() => {
    if (!desdeLaNavbar) return
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setAltoDesplegado(panel.current?.scrollHeight ?? null)),
    )
    const listo = window.setTimeout(() => {
      setYaEntro(true)
      olvidarEntradaDesdeLaNavbar()
    }, MS_DE_LA_ENTRADA)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(listo)
    }
  }, [desdeLaNavbar])

  /**
   * La despedida: el botón se queda en verde un momento, después el panel se
   * encoge hasta la forma de la navbar y recién ahí se navega. La sesión ya
   * está abierta durante todo esto; lo único que se retiene es la pantalla.
   */
  const salirHaciaLaApp = () => {
    setFase("correcto")
    const enVerde = setTimeout(() => {
      // Dos pasos: primero el alto que ya tenía, escrito en píxeles, y recién
      // en el frame siguiente el de la navbar. Hecho de una, el navegador ve
      // un solo cambio (de `auto` a 68px) y no tiene desde dónde animar.
      setAltoFijado(panel.current?.offsetHeight ?? null)
      // Dos frames: uno para que el alto en píxeles llegue a la pantalla y el
      // otro para cambiarlo. Con uno solo el navegador junta los dos valores
      // en el mismo cálculo de estilos y no le queda desde dónde animar.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setFormaFinal(formaDeLaNavbar())
          setFase("saliendo")
        }),
      )
    }, MS_EN_VERDE)
    const irse = setTimeout(() => {
      reteniendoLaSalida.current = false
      navigate(destino, { replace: true })
    }, MS_EN_VERDE + MS_DE_SALIDA)
    temporizadores.current.push(enVerde as unknown as number, irse as unknown as number)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setError("")

    if (!username.trim() || !password.trim()) {
      setError("Por favor, completá todos los campos.")
      setFase("incorrecto")
      return
    }

    setFase("enviando")
    // Antes de esperar: si las credenciales están bien, la sesión se abre
    // durante este await y el efecto de arriba nos sacaría de la pantalla.
    reteniendoLaSalida.current = true

    const outcome = await login(username, password)

    if (outcome.status === "two_factor_required") {
      // Credenciales OK: falta el código. La contraseña ya no hace falta más.
      reteniendoLaSalida.current = false
      setPassword("")
      setFase("escribiendo")
      setPendingTwoFactor({
        ephemeralToken: outcome.ephemeralToken,
        expiresIn: outcome.expiresIn,
        username,
      })
    } else if (outcome.status === "two_factor_enrollment_required") {
      // Credenciales OK, pero está obligada al segundo factor y no lo tiene:
      // no entra hasta enrolarse, y el alta se hace acá mismo.
      reteniendoLaSalida.current = false
      setPassword("")
      setFase("escribiendo")
      setPendingEnrollment({
        ephemeralToken: outcome.ephemeralToken,
        expiresIn: outcome.expiresIn,
        username,
      })
    } else if (outcome.status === "error") {
      reteniendoLaSalida.current = false
      setError("Usuario o contraseña incorrectos. Revisá los datos e intentá de nuevo.")
      setFase("incorrecto")
    } else {
      salirHaciaLaApp()
    }
  }

  /** Volver a escribir borra el error: el botón deja de estar en rojo. */
  const alEscribir = (setter: (valor: string) => void) => (valor: string) => {
    setter(valor)
    if (error) setError("")
    if (fase === "incorrecto") setFase("escribiendo")
  }

  const handleTwoFactorSubmit = async (code: string, rememberDevice: boolean): Promise<TwoFactorSubmitResult> => {
    if (!pendingTwoFactor) return { ok: false, expired: true, message: "La verificación venció." }

    const outcome = await verifyTwoFactor({
      ephemeralToken: pendingTwoFactor.ephemeralToken,
      code,
      rememberDevice,
    })

    if (outcome.status === "success") return { ok: true }
    return { ok: false, message: outcome.message, expired: outcome.expired }
  }

  const handleEnrollmentStart = async (): Promise<TwoFactorEnrollmentStartResult> => {
    if (!pendingEnrollment) return { ok: false, expired: true }

    const outcome = await startTwoFactorEnrollment(pendingEnrollment.ephemeralToken)
    if (outcome.status === "success") return { ok: true, setup: outcome.setup }
    return { ok: false, message: outcome.message, expired: outcome.expired }
  }

  const handleEnrollmentConfirm = async (code: string): Promise<TwoFactorEnrollmentConfirmResult> => {
    if (!pendingEnrollment) return { ok: false, expired: true }

    // El freno se pone ANTES de confirmar: la confirmación deja la sesión
    // abierta y, si el efecto de arriba llegara primero, la pantalla de códigos
    // no se vería nunca.
    setHoldingRecoveryCodes(true)

    const outcome = await confirmTwoFactorEnrollment({
      ephemeralToken: pendingEnrollment.ephemeralToken,
      code,
    })

    if (outcome.status === "success") return { ok: true, recoveryCodes: outcome.recoveryCodes }

    setHoldingRecoveryCodes(false)
    return { ok: false, message: outcome.message, expired: outcome.expired }
  }

  const finishEnrollment = () => {
    // Soltar el freno deja que el efecto de arriba redirija a la app.
    setPendingEnrollment(null)
    setHoldingRecoveryCodes(false)
  }

  const cancelTwoFactor = () => {
    // Al soltar el estado se va también el ephemeral_token de memoria.
    setPendingTwoFactor(null)
    setPendingEnrollment(null)
    setError("")
  }

  // Con sesión abierta esta pantalla no dibuja nada: redirige el efecto de
  // arriba. Las dos excepciones son el enrolamiento recién confirmado —hay
  // sesión pero todavía faltan mostrar los códigos de recuperación— y la
  // animación de salida, que justamente es esta pantalla yéndose.
  if (user && !holdingRecoveryCodes && !reteniendoLaSalida.current) {
    return null
  }

  // El panel viniendo de la navbar: plegado al alto de la barra hasta que se
  // mide el contenido, y libre de medidas una vez desplegado.
  const desplegandose = Boolean(desdeLaNavbar) && !yaEntro
  // Cuando se llega desde la navbar no hay caída desde arriba: el panel ya
  // está en su lugar —era la barra— y lo único que hace es abrirse.
  const entradaHecha = isPageLoaded || Boolean(desdeLaNavbar)
  const estiloDelPanel = (() => {
    if (saliendo && formaFinal) {
      return {
        maxWidth: formaFinal.ancho,
        height: formaFinal.alto,
        borderBottomLeftRadius: formaFinal.radio,
        borderBottomRightRadius: formaFinal.radio,
      }
    }
    if (altoFijado !== null) return { height: altoFijado }
    if (desdeLaNavbar && !yaEntro) {
      const plegado = altoDesplegado === null
      return {
        transitionDuration: `${MS_DE_LA_ENTRADA}ms`,
        // Ya desplegado se suelta el ancho: lo vuelve a poner `max-w-md` y la
        // transición lo acompaña. El radio no se toca en ningún momento: la
        // barra terminó su parte con el radio de este panel, así que arrancar
        // con el suyo sería un salto justo en el empalme.
        maxWidth: plegado ? desdeLaNavbar.ancho : undefined,
        height: plegado ? desdeLaNavbar.alto : altoDesplegado,
      }
    }
    return undefined
  })()

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Notch Container */}
      <div className="relative z-10 w-full flex justify-center">
        {/* Notch */}
        {/* El panel blanco. Entra cayendo desde arriba y, cuando el ingreso
            sale bien, se encoge hasta la forma de la barra de la navbar: el
            ancho y el alto se animan en píxeles porque `max-w-md` -> `100%`
            no interpola, y el radio inferior pasa de 24px a los 25px que
            tiene la barra. */}
        <div
          ref={panel}
          style={estiloDelPanel}
          className={`
            bg-white rounded-b-3xl shadow-2xl w-full max-w-md overflow-hidden
            origin-top transform-gpu will-change-transform
            ${saliendo
              ? "transition-all duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]"
              : desplegandose
                ? "transition-all ease-[cubic-bezier(0.65,0,0.35,1)]"
                : "transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)]"}
            ${entradaHecha ? "translate-y-0 opacity-100 scale-y-100" : "-translate-y-[110vh] opacity-0 scale-y-75"}
          `}
        >
          {pendingTwoFactor ? (
            <TwoFactorChallenge
              // El key remonta la pantalla si el usuario cancela y arranca un
              // login nuevo: contador y campos vuelven a cero con el token nuevo.
              key={pendingTwoFactor.ephemeralToken}
              username={pendingTwoFactor.username}
              expiresIn={pendingTwoFactor.expiresIn}
              onSubmit={handleTwoFactorSubmit}
              onCancel={cancelTwoFactor}
            />
          ) : pendingEnrollment ? (
            <TwoFactorEnrollment
              key={pendingEnrollment.ephemeralToken}
              username={pendingEnrollment.username}
              expiresIn={pendingEnrollment.expiresIn}
              onStart={handleEnrollmentStart}
              onConfirm={handleEnrollmentConfirm}
              onDone={finishEnrollment}
              onCancel={cancelTwoFactor}
            />
          ) : (
            /* Login Form — se desvanece antes de que el panel termine de
               encogerse: si se fuera con él, el texto quedaría aplastado
               contra el borde mientras se achica. */
            <div
              className={`px-8 py-8 transition-all duration-300 ease-out ${
                saliendo || (desplegandose && altoDesplegado === null)
                  ? "-translate-y-3 opacity-0"
                  : "translate-y-0 opacity-100"
              }`}
            >
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
                    onChange={(e) => alEscribir(setUsername)(e.target.value)}
                    placeholder="Usuario"
                    className={`
                      w-full pl-10 pr-4 py-3 bg-gray-100 border rounded-lg text-gray-800 placeholder-gray-500 
                      focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200
                      ${error ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-[#204983]"}
                    `}
                    required
                    disabled={bloqueado}
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
                    onChange={(e) => alEscribir(setPassword)(e.target.value)}
                    placeholder="Contraseña"
                    className={`
                      w-full pl-10 pr-4 py-3 bg-gray-100 border rounded-lg text-gray-800 placeholder-gray-500 
                      focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200
                      ${error ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-[#204983]"}
                    `}
                    required
                    disabled={bloqueado}
                  />
                </div>

                {/* Login Button — el botón ES el resultado: azul mientras se
                    escribe, verde con un tilde cuando las credenciales están
                    bien, rojo cuando no. */}
                <button
                  type="submit"
                  disabled={bloqueado}
                  className={`
                    w-full py-3 px-4
                    text-white font-medium rounded-lg
                    transition-colors duration-300
                    focus:outline-none focus:ring-2 focus:ring-offset-2
                    disabled:cursor-not-allowed
                    flex items-center justify-center space-x-2
                    ${
                      fase === "correcto" || saliendo
                        ? "bg-emerald-600 focus:ring-emerald-600"
                        : fase === "incorrecto"
                          ? "bg-red-600 hover:bg-red-700 focus:ring-red-600"
                          : "bg-[#204983] hover:bg-[#1a3d6f] focus:ring-[#204983] disabled:opacity-50"
                    }
                  `}
                >
                  {fase === "enviando" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Comprobando...</span>
                    </>
                  ) : fase === "correcto" || saliendo ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Listo</span>
                    </>
                  ) : fase === "incorrecto" ? (
                    <>
                      <X className="h-4 w-4" />
                      <span>Reintentar</span>
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
          )}
        </div>
      </div>
    </div>
  )
}
