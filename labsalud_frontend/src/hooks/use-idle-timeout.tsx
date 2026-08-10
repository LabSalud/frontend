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
    const remaining = Math.max(0, Math.ceil((warningTime - elapsed) / 1000))

    setTimeLeft(remaining)

    if (remaining <= 0) {
      isWarningActiveRef.current = false
      setShowWarning(false)
      clearAllTimers()
      onIdleRef.current()
    }
  }, [warningTime, clearAllTimers])

  const startWarning = useCallback(() => {
    isWarningActiveRef.current = true
    warningStartTimeRef.current = Date.now()
    setShowWarning(true)

    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current)
      warningTimerRef.current = null
    }

    const initialSeconds = Math.ceil(warningTime / 1000)
    setTimeLeft(initialSeconds)

    warningTimerRef.current = setInterval(() => {
      if (!isWarningActiveRef.current || !warningStartTimeRef.current) return

      const elapsed = Date.now() - warningStartTimeRef.current
      const remaining = Math.max(0, Math.ceil((warningTime - elapsed) / 1000))

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
  }, [warningTime])

  const resetIdleTimer = useCallback(() => {
    if (isWarningActiveRef.current) {
      return
    }

    clearAllTimers()
    lastActivityRef.current = Date.now()

    // Piso de 1s: con ventanas cortas (el default bajó a 5 minutos y el mínimo
    // configurable es 1) un warningTime mal calculado daría negativo y el aviso
    // saldría de entrada, apenas el usuario inicia sesión.
    const timeUntilWarning = Math.max(1000, idleTime - warningTime)

    idleTimerRef.current = setTimeout(() => {
      startWarning()
    }, timeUntilWarning)
  }, [idleTime, warningTime, clearAllTimers, startWarning])

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
    setTimeLeft(Math.ceil(warningTime / 1000))
    clearAllTimers()
    resetIdleTimer()
  }, [clearAllTimers, resetIdleTimer, warningTime])

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
