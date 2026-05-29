"use client"

import type React from "react"

import { useState, useEffect } from "react"
import useAuth from "@/contexts/auth-context"
import { useApi } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { User, Mail, Lock, Camera, AlertCircle, CheckCircle, Eye, EyeOff, Clock, Shield } from "lucide-react"
import { toast } from "sonner"
import { USER_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import type { ActiveTempPermission } from "@/types"
import { formatApiError } from "@/lib/api-error"
import { getStoredUser, setStoredUser } from "@/lib/auth-storage"

interface ProfileData {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  photo?: string
  inactivity_logout_minutes?: number | null
  active_temp_permissions: ActiveTempPermission[]
}

interface ProfileFormData {
  email: string
  password: string
  inactivity_logout_minutes: string
  photo?: File
}

interface ValidationErrors {
  email?: string
  password?: string
  inactivity_logout_minutes?: string
  photo?: string
}

const extractErrorMessage = (error: unknown): string => formatApiError(error, "Error desconocido")

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { apiRequest } = useApi()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [formData, setFormData] = useState<ProfileFormData>({
    email: "",
    password: "",
    inactivity_logout_minutes: "30",
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiRequest(USER_ENDPOINTS.ME, {
          method: "GET",
        })

        if (response.ok) {
          const data: ProfileData = await response.json()
          setProfileData(data)
          setFormData((prev) => ({
            ...prev,
            email: data.email || "",
            inactivity_logout_minutes: String(data.inactivity_logout_minutes ?? 30),
          }))
        } else {
          const errorData = await response.json().catch(() => ({}))
          toast.error(extractErrorMessage(errorData), {
            duration: TOAST_DURATION,
          })
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast.error("Error de conexión al cargar el perfil", {
          duration: TOAST_DURATION,
        })
      } finally {
        setIsLoadingProfile(false)
      }
    }

    if (user) {
      fetchProfile()
    }
  }, [user, apiRequest])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido"
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Ingresá un email válido"
    }

    const inactivityMinutes = Number(formData.inactivity_logout_minutes)
    if (!Number.isInteger(inactivityMinutes) || inactivityMinutes < 1) {
      newErrors.inactivity_logout_minutes = "Ingresá un valor de al menos 1 minuto"
    }

    // Validar foto
    if (formData.photo) {
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (formData.photo.size > maxSize) {
        newErrors.photo = "La imagen debe ser menor a 5MB"
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/gif"]
      if (!allowedTypes.includes(formData.photo.type)) {
        newErrors.photo = "Solo se permiten archivos JPG, PNG o GIF"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, photo: file }))

      // Crear preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Limpiar error de foto
      if (errors.photo) {
        setErrors((prev) => ({ ...prev, photo: undefined }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const formDataToSend = new FormData()

      // Solo enviar campos que han cambiado
      if (formData.email !== profileData?.email) {
        formDataToSend.append("email", formData.email)
      }

      if (formData.password.trim()) {
        formDataToSend.append("password", formData.password)
      }

      if (Number(formData.inactivity_logout_minutes) !== Number(profileData?.inactivity_logout_minutes ?? 30)) {
        formDataToSend.append("inactivity_logout_minutes", formData.inactivity_logout_minutes)
      }

      if (formData.photo) {
        formDataToSend.append("photo", formData.photo)
      }

      // Solo hacer la petición si hay algo que actualizar
      if (
        formDataToSend.has("email") ||
        formDataToSend.has("password") ||
        formDataToSend.has("inactivity_logout_minutes") ||
        formDataToSend.has("photo")
      ) {
        const response = await apiRequest(USER_ENDPOINTS.ME, {
          method: "PATCH",
          body: formDataToSend,
        })

        if (response.ok) {
          const updatedProfile: ProfileData = await response.json()
          setProfileData((prev) => ({ ...prev, ...updatedProfile }))

          // Actualizar el usuario almacenado con los campos que pueden haber cambiado
          const currentUser = getStoredUser<{
            email?: string
            photo?: string | null
            inactivity_logout_minutes?: number | null
            [key: string]: unknown
          }>()
          if (currentUser) {
            setStoredUser({
              ...currentUser,
              email: updatedProfile.email || currentUser.email,
              photo: updatedProfile.photo !== undefined ? updatedProfile.photo : currentUser.photo,
              inactivity_logout_minutes:
                updatedProfile.inactivity_logout_minutes ?? currentUser.inactivity_logout_minutes,
            })
            await refreshUser()
          }

          toast.success("Perfil actualizado correctamente", {
            duration: TOAST_DURATION,
          })

          // Limpiar campos de contraseña y foto
          setFormData((prev) => ({
            ...prev,
            password: "",
            inactivity_logout_minutes: String(updatedProfile.inactivity_logout_minutes ?? formData.inactivity_logout_minutes),
            photo: undefined,
          }))
          setPhotoPreview(null)
        } else {
          const errorData = await response.json().catch(() => ({}))
          toast.error(extractErrorMessage(errorData), {
            duration: TOAST_DURATION,
          })
        }
      } else {
        toast.info("No hay cambios para guardar", {
          duration: TOAST_DURATION,
        })
      }
    } catch (error) {
      console.error("Error al actualizar perfil:", error)
      toast.error("Error de conexión. Intenta nuevamente.", {
        duration: TOAST_DURATION,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!user || isLoadingProfile) {
    return (
      <div className="w-full max-w-4xl mx-auto py-4 px-2 sm:px-4 space-y-4 sm:space-y-6">
        {/* Header skeleton */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6">
          <Skeleton className="h-8 w-64 rounded mb-2" />
          <Skeleton className="h-4 w-96 rounded" />
        </div>

        {/* Form card skeleton */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <Skeleton className="h-6 w-48 rounded" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
            {/* Avatar skeleton */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
            </div>

            {/* Form fields skeleton */}
            <div className="grid grid-cols-1 gap-4">
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
            </div>

            {/* Submit button skeleton */}
            <Skeleton className="h-10 w-full rounded" />
          </CardContent>
        </Card>

        {/* Permissions card skeleton */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <Skeleton className="h-6 w-48 rounded" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-2 sm:px-4 space-y-4 sm:space-y-6">
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Mi Perfil</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Gestioná tu información personal y configuración de cuenta
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Información Personal */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Información Personal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative">
                {photoPreview ? (
                  <img
                    src={photoPreview || "/placeholder.svg"}
                    alt="Preview"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-gray-300"
                  />
                ) : profileData?.photo ? (
                  <img
                    src={profileData.photo || "/placeholder.svg"}
                    alt={`${profileData.username} avatar`}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-gray-300"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#204983] flex items-center justify-center">
                    <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-[#204983] text-white p-1.5 sm:p-2 rounded-full cursor-pointer hover:bg-[#1a3d6f] transition-colors">
                  <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm font-medium text-gray-700">Foto de Perfil</p>
                <p className="text-xs text-gray-500">JPG, PNG o GIF. Máximo 5MB.</p>
                {errors.photo && (
                  <div className="flex items-center justify-center sm:justify-start space-x-1 mt-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600">{errors.photo}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="username" className="text-sm">
                  Nombre de Usuario
                </Label>
                <Input id="username" value={profileData?.username || ""} disabled className="bg-gray-50" />
                <p className="text-xs text-gray-500 mt-1">No se puede modificar</p>
              </div>
              <div>
                <Label htmlFor="full_name" className="text-sm">
                  Nombre Completo
                </Label>
                <Input
                  id="full_name"
                  value={`${profileData?.first_name || ""} ${profileData?.last_name || ""}`.trim()}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">No se puede modificar</p>
              </div>
            </div>

            {/* Email editable */}
            <div>
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`pl-10 ${errors.email ? "border-red-300 focus:ring-red-500" : ""}`}
                  placeholder="tu@email.com"
                />
              </div>
              {errors.email ? (
                <div className="flex items-center space-x-1 mt-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">{errors.email}</span>
                </div>
              ) : formData.email && validateEmail(formData.email) ? (
                <div className="flex items-center space-x-1 mt-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Email válido</span>
                </div>
              ) : null}
            </div>

            <div>
              <Label htmlFor="password" className="text-sm">
                Nueva Contraseña (opcional)
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Dejar vacío para no cambiar"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Dejá el campo vacío si no querés cambiar tu contraseña</p>
            </div>

            <div>
              <Label htmlFor="inactivity_logout_minutes" className="text-sm">
                Tiempo de inactividad
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  id="inactivity_logout_minutes"
                  type="number"
                  min={1}
                  step={1}
                  value={formData.inactivity_logout_minutes}
                  onChange={(e) => handleInputChange("inactivity_logout_minutes", e.target.value)}
                  className={`pl-10 ${errors.inactivity_logout_minutes ? "border-red-300 focus:ring-red-500" : ""}`}
                />
              </div>
              {errors.inactivity_logout_minutes ? (
                <div className="flex items-center space-x-1 mt-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">{errors.inactivity_logout_minutes}</span>
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Minutos sin actividad antes de cerrar sesión.</p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full bg-[#204983] hover:bg-[#1a3d6f] mt-4">
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Permisos Temporales */}
        {profileData && profileData.active_temp_permissions.length > 0 && (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Permisos Temporales Activos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="space-y-3">
                {profileData.active_temp_permissions.map((perm: ActiveTempPermission, index: number) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm sm:text-base">{perm.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">{perm.reason}</p>
                      </div>
                      <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-500">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Expira: {formatDate(perm.expires_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  )
}
