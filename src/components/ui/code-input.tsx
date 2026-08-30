"use client"

import { useCallback, useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"

interface CodeInputProps {
  value: string
  onChange: (value: string) => void
  /** Se dispara una sola vez por código completo: la idea es no obligar a apretar un botón. */
  onComplete?: (value: string) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
  invalid?: boolean
  "aria-label"?: string
}

const onlyDigits = (value: string) => value.replace(/\D/g, "")

/**
 * Input de código numérico en casillas separadas.
 *
 * Detalles que importan para el uso real (alguien con el celular en una mano):
 * teclado numérico en móvil, `autocomplete="one-time-code"` para que iOS ofrezca
 * el código, pegado del código completo en cualquier casilla, y autoenvío al
 * completarse.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = false,
  invalid = false,
  "aria-label": ariaLabel = "Código de verificación",
}: CodeInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  // Evita que el autoenvío se dispare dos veces por el mismo código (por
  // ejemplo si el padre re-renderiza mientras la request está en vuelo).
  const completedRef = useRef<string | null>(null)

  const digits = onlyDigits(value).slice(0, length)

  useEffect(() => {
    if (digits.length < length) {
      completedRef.current = null
      return
    }
    if (completedRef.current === digits) return
    completedRef.current = digits
    onComplete?.(digits)
  }, [digits, length, onComplete])

  const focusIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(length - 1, index))
      const input = inputsRef.current[clamped]
      input?.focus()
      input?.select()
    },
    [length],
  )

  const writeFrom = useCallback(
    (index: number, incoming: string) => {
      const clean = onlyDigits(incoming)
      if (!clean) return

      const chars = digits.padEnd(length, " ").split("")
      let cursor = index
      for (const char of clean) {
        if (cursor >= length) break
        chars[cursor] = char
        cursor += 1
      }

      const next = chars.join("").replace(/ /g, "").slice(0, length)
      onChange(next)
      focusIndex(cursor)
    },
    [digits, focusIndex, length, onChange],
  )

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault()
      const chars = digits.split("")
      if (chars[index]) {
        chars[index] = ""
        onChange(chars.join(""))
        return
      }
      if (index > 0) {
        chars[index - 1] = ""
        onChange(chars.join("").slice(0, index - 1))
        focusIndex(index - 1)
      }
      return
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault()
      focusIndex(index - 1)
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      focusIndex(index + 1)
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    // Siempre desde la primera casilla: quien pega el código completo espera que
    // entre entero, no que arranque donde tenía el cursor.
    const pasted = onlyDigits(event.clipboardData.getData("text"))
    if (!pasted) return
    const next = pasted.slice(0, length)
    onChange(next)
    focusIndex(next.length)
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" role="group" aria-label={ariaLabel}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            inputsRef.current[index] = element
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={digits[index] ?? ""}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-label={`${ariaLabel}, dígito ${index + 1} de ${length}`}
          onChange={(event) => writeFrom(index, event.target.value)}
          onKeyDown={handleKeyDown(index)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          className={cn(
            "h-12 w-10 sm:h-14 sm:w-12 rounded-lg border bg-gray-100 text-center text-xl sm:text-2xl font-semibold text-gray-800",
            "focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            invalid ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-[#204983]",
          )}
        />
      ))}
    </div>
  )
}

export default CodeInput
