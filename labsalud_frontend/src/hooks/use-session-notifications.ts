"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const NOTIFICATIONS_ENABLED_KEY = "labsalud_session_notifications_enabled"

type SessionNotificationPermission = NotificationPermission | "unsupported"

const getPermission = (): SessionNotificationPermission => {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return Notification.permission
}

const getNotificationsEnabled = () => {
  if (typeof window === "undefined") return false
  return localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === "true"
}

export function useSessionNotifications() {
  const [permission, setPermission] = useState<SessionNotificationPermission>(() => getPermission())
  const [enabled, setEnabled] = useState(() => getNotificationsEnabled())
  const activeNotificationRef = useRef<Notification | null>(null)

  useEffect(() => {
    setPermission(getPermission())
    setEnabled(getNotificationsEnabled())
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported")
      setEnabled(false)
      return "unsupported" as const
    }

    const result = await Notification.requestPermission()
    setPermission(result)

    const shouldEnable = result === "granted"
    setEnabled(shouldEnable)
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, shouldEnable ? "true" : "false")

    return result
  }, [])

  const disableNotifications = useCallback(() => {
    setEnabled(false)
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false")
  }, [])

  const closeActiveNotification = useCallback(() => {
    activeNotificationRef.current?.close()
    activeNotificationRef.current = null
  }, [])

  const notifyIdleWarning = useCallback((secondsLeft: number) => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    if (!getNotificationsEnabled() || Notification.permission !== "granted") return

    closeActiveNotification()

    const notification = new Notification("Sesión por expirar", {
      body: `Tu sesión de LabSalud expirará en ${secondsLeft} segundos. Volvé a la web y presioná Continuar sesión.`,
      icon: "/logo_icono.svg",
      tag: "labsalud-idle-warning",
      requireInteraction: true,
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    activeNotificationRef.current = notification
  }, [closeActiveNotification])

  return {
    permission,
    enabled,
    isSupported: permission !== "unsupported",
    requestPermission,
    disableNotifications,
    notifyIdleWarning,
    closeActiveNotification,
  }
}
