"use client"

import { useCallback } from "react"
import { useLoading } from "@/hooks/use-loading"
import { API_CONFIG, AUTH_ENDPOINTS } from "@/config/api"
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "@/lib/auth-storage"
import { dispatchSessionExpiredEvent } from "@/lib/session-events"

// JSDoc documentation for ApiRequestOptions and useApi hook
/**
 * Options for API requests, including HTTP method, request body, headers, and timeout.
 */
export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  // Request body payload
  body?: unknown
  headers?: Record<string, string>
  timeout?: number
  /** Optional key to trigger loading indicator via useLoading */
  loadingKey?: string
  /** Skip automatic token refresh on 401 (for refresh token requests) */
  skipTokenRefresh?: boolean
}

/**
 * Custom hook to perform API requests with automatic token handling, refresh,
 * error logging, and timeout support. Returns an apiRequest function.
 */
export const useApi = () => {
  const { setLoading } = useLoading()

  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refreshTokenValue = getRefreshToken()
    if (!refreshTokenValue) return false

    try {
      const response = await fetch(AUTH_ENDPOINTS.TOKEN_REFRESH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh: refreshTokenValue }),
        mode: "cors",
      })

      if (!response.ok) return false

      const data = await response.json()
      setAccessToken(data.access)
      if (data.refresh) {
        setRefreshToken(data.refresh)
      }
      return true
    } catch (error) {
      console.error("[v0] Token refresh error:", error)
      return false
    }
  }, [])

  const apiRequest = useCallback(
    async (url: string, options: ApiRequestOptions = {}) => {
      const { loadingKey, skipTokenRefresh = false, ...apiOptions } = options
      if (loadingKey) setLoading(loadingKey, true)

      const { method = "GET", body, headers = {}, timeout = API_CONFIG.TIMEOUT } = apiOptions

      const makeRequest = async (): Promise<Response> => {
        const requestHeaders: Record<string, string> = {
          ...headers,
        }

        const isFormData = body instanceof FormData
        if (!isFormData && body) {
          requestHeaders["Content-Type"] = "application/json"
        }

        const token = getAccessToken()
        if (token) {
          requestHeaders.Authorization = `Bearer ${token}`
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        let finalUrl: string
        if (url.startsWith("http://") || url.startsWith("https://")) {
          finalUrl = url
        } else {
          const baseUrl = API_CONFIG.BASE_URL
          const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
          const cleanUrl = url.startsWith("/") ? url.slice(1) : url
          finalUrl = `${cleanBaseUrl}${cleanUrl}`
        }

        try {
          let requestBody: string | FormData | undefined
          if (isFormData) {
            requestBody = body
          } else if (body) {
            requestBody = JSON.stringify(body)
          } else {
            requestBody = undefined
          }

          const response = await fetch(finalUrl, {
            method,
            headers: requestHeaders,
            body: requestBody,
            signal: controller.signal,
            mode: "cors",
          })

          clearTimeout(timeoutId)

          return response
        } catch (error) {
          clearTimeout(timeoutId)
          if (error instanceof Error && error.name === "AbortError") {
            console.error(`[v0] Request timed out for ${finalUrl} after ${timeout}ms`)
            throw new Error(`Tiempo de espera agotado después de ${timeout}ms`)
          }
          console.error(`[v0] Network or unexpected error for ${finalUrl}:`, error)
          throw error
        }
      }

      try {
        let response = await makeRequest()

        if (response.status === 401 && !skipTokenRefresh) {
          console.warn("[v0] 401 Unauthorized. Attempting token refresh...")

          const refreshSuccess = await refreshToken()

          if (refreshSuccess) {
            console.log("[v0] Token refreshed successfully. Retrying request...")
            response = await makeRequest()
          } else {
            console.error("[v0] Token refresh failed. Session expired.")
            clearSession()
            dispatchSessionExpiredEvent({
              reason: "refresh_failed",
              message: "Tu sesión expiró. Volvé a iniciar sesión para continuar.",
            })
            throw new Error("Sesión expirada")
          }
        }

        return response
      } catch (error) {
        console.error(`[v0] Final error:`, error)
        throw error
      } finally {
        if (loadingKey) setLoading(loadingKey, false)
      }
    },
    [setLoading, refreshToken],
  )

  return { apiRequest }
}
