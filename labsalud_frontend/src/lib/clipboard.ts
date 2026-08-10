/**
 * Copiar al portapapeles con fallback.
 *
 * `navigator.clipboard` sólo existe en contextos seguros y la app se sirve por
 * http en la red del laboratorio, así que sin el fallback el botón "Copiar" no
 * haría nada justo donde más importa (los códigos de recuperación se muestran
 * una sola vez).
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // sigue con el fallback
  }

  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand("copy")
    document.body.removeChild(textarea)
    return copied
  } catch {
    return false
  }
}

/** Descarga un texto como archivo, sin pasar por el servidor. */
export const downloadTextFile = (filename: string, content: string): void => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
