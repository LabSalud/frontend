"use client"

import { useCallback } from "react"
import { useMemo } from "react"
import { toast } from "sonner"

type ToastOptions = {
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
}

export function useToast() {
  const success = useCallback((title: string, options?: ToastOptions) => {
    toast.success(title, options)
  }, [])
  const error = useCallback((title: string, options?: ToastOptions) => {
    toast.error(title, options)
  }, [])
  const warning = useCallback((title: string, options?: ToastOptions) => {
    toast.warning(title, options)
  }, [])
  const info = useCallback((title: string, options?: ToastOptions) => {
    toast.info(title, options)
  }, [])
  const loading = useCallback((title: string, options?: ToastOptions) => {
    return toast.loading(title, options)
  }, [])
  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId)
    } else {
      toast.dismiss()
    }
  }, [])

  const showToast = useMemo(
    () => ({
      success,
      error,
      warning,
      info,
      loading,
      dismiss,
    }),
    [success, error, warning, info, loading, dismiss],
  )

  return showToast
}
