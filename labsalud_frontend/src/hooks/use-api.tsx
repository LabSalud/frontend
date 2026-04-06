"use client"

import { useCallback } from "react"
import { useLoading } from "@/hooks/use-loading"
import { API_CONFIG, AUTH_ENDPOINTS } from "@/config/api"

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
    const refreshTokenValue = sessionStorage.getItem("refresh_token")
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
      sessionStorage.setItem("access_token", data.access)
      if (data.refresh) {
        sessionStorage.setItem("refresh_token", data.refresh)
      }
      return true
    } catch (error) {
      console.error("[v0] Token refresh error:", error)
      return false
    }
  }, [])

  const showSessionExpiredModal = useCallback(() => {
    const modal = document.createElement("div")
    modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-lg p-6 max-w-md mx-4">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Sesión Expirada</h3>
            <p class="text-sm text-gray-600">Su sesión ha expirado. Por favor, vuelva a iniciar sesión.</p>
          </div>
        </div>
        <div class="flex justify-end">
          <button id="relogin-btn" class="px-4 py-2 bg-[#204983] text-white rounded-md hover:bg-[#1a3d6f] transition-colors">
            Volver a Login
          </button>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    const reloginBtn = modal.querySelector("#relogin-btn")
    reloginBtn?.addEventListener("click", () => {
      sessionStorage.removeItem("access_token")
      sessionStorage.removeItem("refresh_token")
      sessionStorage.removeItem("user")
      window.location.reload()
    })
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

        const token = sessionStorage.getItem("access_token")
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

        console.log(`[v0] Making ${method} request to: ${finalUrl}`)

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
          console.log(`[v0] Response status: ${response.status} for ${finalUrl}`)

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
            showSessionExpiredModal()
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
    [setLoading, refreshToken, showSessionExpiredModal],
  )

  return { apiRequest }
}
