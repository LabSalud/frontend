export const SESSION_EXPIRED_EVENT = "labsalud:session-expired"

export type SessionExpiredReason = "idle" | "refresh_failed"

export interface SessionExpiredDetail {
  reason: SessionExpiredReason
  message?: string
}

export const dispatchSessionExpiredEvent = (detail: SessionExpiredDetail) => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<SessionExpiredDetail>(SESSION_EXPIRED_EVENT, { detail }))
}
