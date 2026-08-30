"use client"

import { useMemo } from "react"
import { encode } from "uqr"
import { cn } from "@/lib/utils"

interface QrCodeProps {
  value: string
  /** Módulos de silencio alrededor del código; abajo de 4 algunos lectores fallan. */
  margin?: number
  className?: string
  title?: string
}

/**
 * QR renderado en el navegador, sin servicios externos.
 *
 * Esto es a propósito: el `otpauth_uri` lleva adentro el secreto TOTP, así que
 * mandárselo a una API de terceros para que dibuje la imagen sería regalarle el
 * segundo factor a un tercero. `uqr` sólo calcula la matriz de módulos y el SVG
 * lo armamos acá.
 */
export function QrCode({ value, margin = 4, className, title = "Código QR" }: QrCodeProps) {
  const { size, path } = useMemo(() => {
    const result = encode(value, { ecc: "M" })
    const segments: string[] = []

    // Un único <path> con un rect por módulo: mucho más liviano en el DOM que
    // ~1.200 elementos <rect> sueltos.
    for (let y = 0; y < result.size; y += 1) {
      for (let x = 0; x < result.size; x += 1) {
        if (result.data[y][x]) {
          segments.push(`M${x + margin} ${y + margin}h1v1h-1z`)
        }
      }
    }

    return { size: result.size + margin * 2, path: segments.join("") }
  }, [value, margin])

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn("h-48 w-48 rounded-lg border border-gray-200 bg-white p-1", className)}
      shapeRendering="crispEdges"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#204983" />
    </svg>
  )
}

export default QrCode
