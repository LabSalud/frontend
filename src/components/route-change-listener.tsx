import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

export function RouteChangeListener() {
  const location = useLocation()
  const { refreshUser, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      refreshUser()
    }
  }, [location.pathname, isAuthenticated, refreshUser])

  return null
}
