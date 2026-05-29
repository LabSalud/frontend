"use client"
import { useState, useEffect } from "react"
import type { User, HistoryEntry, Group } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import type { ApiRequestOptions } from "@/hooks/use-api"
import { USER_ENDPOINTS } from "@/config/api"
import { Clock, Mail, UserIcon, Shield, History } from "lucide-react"
import { formatApiError } from "@/lib/api-error"
import { formatUtcDateTime } from "@/lib/format-utils"
import { UserHistoryDialog } from "./user-history-dialog"

const extractErrorMessage = (errorData: unknown): string => formatApiError(errorData, "Error desconocido")

interface ViewUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number | null
  apiRequest: (url: string, options?: ApiRequestOptions) => Promise<Response>
}

interface UserDetailData extends User {
  history: HistoryEntry[]
  total_changes: number
  temporary_permissions: number
  groups: Group[]
}

export function ViewUserDialog({ open, onOpenChange, userId, apiRequest }: ViewUserDialogProps) {
  const { error: showError } = useToast()
  const [userData, setUserData] = useState<UserDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    if (open && userId) {
      fetchUserDetail()
    } else if (!open) {
      setUserData(null)
    }
  }, [open, userId])

  const fetchUserDetail = async () => {
    if (!userId) return

    setIsLoading(true)
    try {
      const response = await apiRequest(USER_ENDPOINTS.USER_DETAIL(userId), {
        method: "GET",
      })

      if (response.ok) {
        const data = await response.json()
        setUserData(data)
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Error desconocido" }))
        showError("Error al cargar usuario", {
          description: extractErrorMessage(errorData),
        })
      }
    } catch (err) {
      console.error("Error al obtener detalles del usuario:", err)
      showError("Error", {
        description: "Ha ocurrido un error de red o inesperado.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (firstName: string, lastName: string, username: string) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }
    return username.substring(0, 2).toUpperCase()
  }

  const formatDate = (dateString: string) => formatUtcDateTime(dateString)

  if (!userId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Detalles del Usuario</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500 text-sm sm:text-base">Cargando información del usuario...</div>
        ) : userData ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={userData.photo || "/placeholder.svg"} alt={userData.username} />
                <AvatarFallback className="bg-[#204983] text-white text-lg">
                  {getInitials(userData.first_name, userData.last_name, userData.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {`${userData.first_name} ${userData.last_name}`.trim() || userData.username}
                </h3>
                <p className="text-sm text-gray-500">@{userData.username}</p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                  {userData.is_superuser && (
                    <Badge variant="destructive" className="text-xs">
                      Superusuario
                    </Badge>
                  )}
                  {userData.is_active ? (
                    <Badge variant="default" className="text-xs bg-green-500">
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs bg-gray-500">
                      Inactivo
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Información de contacto */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center text-sm sm:text-base">
                <Mail className="h-4 w-4 mr-2" />
                Información de Contacto
              </h4>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center text-sm">
                  <span className="text-gray-600 sm:w-24">Email:</span>
                  <span className="text-gray-900 break-all">{userData.email}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center text-sm sm:text-base">
                <Clock className="h-4 w-4 mr-2" />
                Seguridad de sesión
              </h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex flex-col sm:flex-row sm:items-center text-sm">
                  <span className="text-gray-600 sm:w-40">Inactividad:</span>
                  <span className="text-gray-900">{userData.inactivity_logout_minutes ?? 30} minutos</span>
                </div>
              </div>
            </div>

            {/* Roles */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center text-sm sm:text-base">
                <UserIcon className="h-4 w-4 mr-2" />
                Roles Asignados
              </h4>
              <div className="flex flex-wrap gap-2">
                {userData.groups && userData.groups.length > 0 ? (
                  userData.groups.map((role: Group) => (
                    <Badge key={role.id} variant="outline" className="text-xs sm:text-sm">
                      {role.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Sin roles asignados</p>
                )}
              </div>
            </div>

            {/* Permisos */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center text-sm sm:text-base">
                <Shield className="h-4 w-4 mr-2" />
                Permisos
              </h4>
              <div className="space-y-2">
                {userData.permissions && userData.permissions.length > 0 ? (
                  userData.permissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="bg-gray-50 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{permission.name}</p>
                        <p className="text-xs text-gray-500">{permission.codename}</p>
                      </div>
                      {permission.temporary && permission.expires_at && (
                        <Badge variant="secondary" className="text-xs w-fit">
                          <Clock className="h-3 w-3 mr-1" />
                          Expira: {formatDate(permission.expires_at)}
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Sin permisos asignados</p>
                )}
                {userData.temporary_permissions > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Total de permisos temporales activos: {userData.temporary_permissions}
                  </p>
                )}
              </div>
            </div>

            {/* Historial de cambios → dialog dedicado con filtros por categoría */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="h-4 w-4 mr-2 text-[#204983]" />
              Ver Historial de Cambios
              {userData.total_changes || userData.history?.length ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({userData.total_changes || userData.history?.length || 0})
                </span>
              ) : null}
            </Button>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 text-sm sm:text-base">
            No se pudo cargar la información del usuario.
          </div>
        )}

        <div className="flex justify-end mt-4">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto bg-transparent">
              Cerrar
            </Button>
          </DialogClose>
        </div>
      </DialogContent>

      <UserHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        userId={userId}
        userName={
          userData
            ? `${userData.first_name} ${userData.last_name}`.trim() || userData.username
            : ""
        }
      />
    </Dialog>
  )
}
