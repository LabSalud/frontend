"use client"

import { useState, useCallback, useEffect, useRef } from "react"

interface IdleTimeoutProps {
  onIdle: () => void
  idleTime: number
  warningTime: number
  enabled?: boolean
}

export function useIdleTimeout({ onIdle, idleTime, warningTime, enabled = true }: IdleTimeoutProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(Math.ceil(warningTime / 1000))

  // Referencias para el temporizador y estado
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isWarningActiveRef = useRef(false)
  const lastActivityRef = useRef<number>(Date.now())
  const warningStartTimeRef = useRef<number>(0)
  const onIdleRef = useRef(onIdle)

  // LA VENTANA CAMBIA SOLA A LO LARGO DEL DÍA
  //
  // Con tramos horarios, `idleTime` cambia sin que nadie haga nada: a las 13:30
  // la sesión pasa de cinco minutos a una hora. Si esos valores estuvieran en
  // las dependencias de los callbacks, cada cambio de tramo recrearía el efecto
  // de los listeners, que llama a `resetIdleTimer()` y REINICIA el contador —o
  // sea, cruzar el horario le regalaría una ventana entera a alguien que hace
  // media hora que no toca nada.
  //
  // Con los valores en refs, las funciones son estables y el cambio de tramo lo
  // atiende un efecto propio, que recalcula desde la última actividad REAL.
  const idleTimeRef = useRef(idleTime)
  const warningTimeRef = useRef(warningTime)
  idleTimeRef.current = idleTime
  warningTimeRef.current = warningTime

  useEffect(() => {
    onIdleRef.current = onIdle
  }, [onIdle])

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current)
      warningTimerRef.current = null
    }
  }, [])

  const updateTimeLeft = useCallback(() => {
    if (!isWarningActiveRef.current || !warningStartTimeRef.current) return

    const elapsed = Date.now() - warningStartTimeRef.current
    const remaining = Math.max(0, Math.ceil((warningTimeRef.current - elapsed) / 1000))

    setTimeLeft(remaining)

    if (remaining <= 0) {
      isWarningActiveRef.current = false
      setShowWarning(false)
      clearAllTimers()
      onIdleRef.current()
    }
  }, [clearAllTimers])

  /**
   * Arranca la cuenta regresiva del aviso.
   *
   * `yaTranscurrido` es cuánto del aviso ya pasó: sirve cuando la ventana se
   * achicó a mitad de camino y el aviso tiene que salir por lo que queda, no
   * por el tiempo entero.
   */
  const startWarning = useCallback((yaTranscurrido = 0) => {
    isWarningActiveRef.current = true
    warningStartTimeRef.current = Date.now() - yaTranscurrido
    setShowWarning(true)

    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current)
      warningTimerRef.current = null
    }

    const initialSeconds = Math.ceil(
      Math.max(0, warningTimeRef.current - yaTranscurrido) / 1000,
    )
    setTimeLeft(initialSeconds)

    warningTimerRef.current = setInterval(() => {
      if (!isWarningActiveRef.current || !warningStartTimeRef.current) return

      const elapsed = Date.now() - warningStartTimeRef.current
      const remaining = Math.max(0, Math.ceil((warningTimeRef.current - elapsed) / 1000))

      setTimeLeft(remaining)

      if (remaining <= 0) {
        isWarningActiveRef.current = false
        setShowWarning(false)
        if (warningTimerRef.current) {
          clearInterval(warningTimerRef.current)
          warningTimerRef.current = null
        }
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current)
          idleTimerRef.current = null
        }
        onIdleRef.current()
      }
    }, 100)
  }, [])

  /**
   * Programa el aviso y el cierre contando desde `desde`.
   *
   * Separado de `resetIdleTimer` porque hay dos situaciones distintas: cuando
   * la persona hace algo, se cuenta desde ese momento; cuando cambia el tramo
   * horario, se cuenta desde su ÚLTIMA actividad, que puede ser de hace rato.
   * En ese segundo caso la ventana nueva puede estar vencida antes de empezar,
   * y entonces la sesión se cierra ahí mismo.
   */
  const programar = useCallback((desde: number) => {
    clearAllTimers()

    const transcurrido = Date.now() - desde
    const idle = idleTimeRef.current
    const aviso = warningTimeRef.current

    if (transcurrido >= idle) {
      onIdleRef.current()
      return
    }

    if (transcurrido >= idle - aviso) {
      // Ya estamos dentro del tramo de aviso: sale por lo que queda.
      startWarning(transcurrido - (idle - aviso))
      return
    }

    // Piso de 1s: con ventanas cortas (el default bajó a 5 minutos y el mínimo
    // configurable es 1) un warningTime mal calculado daría negativo y el aviso
    // saldría de entrada, apenas el usuario inicia sesión.
    const timeUntilWarning = Math.max(1000, idle - aviso - transcurrido)

    idleTimerRef.current = setTimeout(() => {
      startWarning()
    }, timeUntilWarning)
  }, [clearAllTimers, startWarning])

  const resetIdleTimer = useCallback(() => {
    if (isWarningActiveRef.current) {
      return
    }

    lastActivityRef.current = Date.now()
    programar(lastActivityRef.current)
  }, [programar])

  const handleActivity = useCallback(() => {
    if (!isWarningActiveRef.current) {
      resetIdleTimer()
    }
  }, [resetIdleTimer])

  const extendSession = useCallback(() => {
    isWarningActiveRef.current = false
    warningStartTimeRef.current = 0
    setShowWarning(false)
    clearAllTimers()
    resetIdleTimer()
  }, [clearAllTimers, resetIdleTimer])

  const resetIdleTimeout = useCallback(() => {
    isWarningActiveRef.current = false
    warningStartTimeRef.current = 0
    setShowWarning(false)
    setTimeLeft(Math.ceil(warningTimeRef.current / 1000))
    clearAllTimers()
    resetIdleTimer()
  }, [clearAllTimers, resetIdleTimer])

  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isWarningActiveRef.current) {
        updateTimeLeft()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [enabled, updateTimeLeft])

  /**
   * CRUZAR UN TRAMO HORARIO NO REGALA UNA VENTANA NUEVA.
   *
   * A las 13:30 la sesión puede pasar de una hora a cinco minutos. Lo que
   * corresponde es recalcular desde la última actividad REAL: si hace diez
   * minutos que nadie toca nada y la ventana nueva es de cinco, la sesión se
   * cierra ahí mismo. Reiniciar el contador sería premiar el cambio de hora.
   */
  const ventanaAnterior = useRef(idleTime)
  useEffect(() => {
    if (!enabled) {
      ventanaAnterior.current = idleTime
      return
    }
    if (ventanaAnterior.current === idleTime) return
    ventanaAnterior.current = idleTime

    if (isWarningActiveRef.current) {
      // Con el aviso en pantalla no se cambia nada abajo de los pies: la
      // cuenta regresiva que la persona está mirando termina como empezó.
      return
    }
    programar(lastActivityRef.current)
  }, [idleTime, enabled, programar])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const events = ["mousemove", "mousedown", "keypress", "scroll", "click"]

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    resetIdleTimer()

    return () => {
      clearAllTimers()
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [enabled, handleActivity, resetIdleTimer, clearAllTimers])

  return { showWarning, timeLeft, extendSession, resetIdleTimeout }
}

export default useIdleTimeout
