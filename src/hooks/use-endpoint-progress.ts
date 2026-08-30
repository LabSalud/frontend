import { useCallback, useEffect, useRef, useState } from "react"

export function useEndpointProgress() {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const frameRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)

  const stopFrame = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    stopFrame()
    startedAtRef.current = performance.now()
    setIsRunning(true)
    setProgress(6)

    const tick = (now: number) => {
      const elapsed = now - startedAtRef.current
      const next = Math.min(92, 6 + 86 * (1 - Math.exp(-elapsed / 1800)))
      setProgress(next)
      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [stopFrame])

  const finish = useCallback(() => {
    stopFrame()
    setProgress(100)
    window.setTimeout(() => {
      setIsRunning(false)
      setProgress(0)
    }, 350)
  }, [stopFrame])

  const reset = useCallback(() => {
    stopFrame()
    setIsRunning(false)
    setProgress(0)
  }, [stopFrame])

  useEffect(() => reset, [reset])

  return { isRunning, progress, start, finish, reset }
}
