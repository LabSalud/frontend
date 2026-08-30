"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/** `mm:ss` para mostrar lo que le queda a un pase de vida corta. */
export const formatCountdown = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export interface ExpiryCountdown {
  secondsLeft: number
  expired: boolean
  /** El backend avisó que el pase ya no vale: cortamos el contador a mano. */
  markExpired: () => void
}

/**
 * Cuenta regresiva de un `ephemeral_token`. La usan las dos pantallas del login
 * que dependen de un pase de vida corta: la del código (5 min) y la del
 * enrolamiento obligatorio (15 min).
 */
export function useExpiryCountdown(expiresIn: number): ExpiryCountdown {
  const initialSeconds = Math.max(0, Math.round(expiresIn))
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
  const [expired, setExpired] = useState(initialSeconds === 0)

  // Deadline absoluto en vez de ir restando: si la pestaña queda en segundo
  // plano el navegador estira los intervals y el contador quedaría mintiendo.
  const deadlineRef = useRef(Date.now() + Math.max(0, expiresIn) * 1000)

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) setExpired(true)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  const markExpired = useCallback(() => {
    setExpired(true)
    setSecondsLeft(0)
  }, [])

  return { secondsLeft, expired, markExpired }
}

export default useExpiryCountdown
