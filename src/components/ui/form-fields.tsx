"use client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  type?: "text" | "email" | "password" | "tel" | "date"
  placeholder?: string
  required?: boolean
  disabled?: boolean
  maxLength?: number
  error?: string | null
  success?: string | null
  className?: string
  inputClassName?: string
  description?: string
}

export function FormField({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
  maxLength,
  error,
  success,
  className,
  inputClassName,
  description,
}: FormFieldProps) {
  const hasError = Boolean(error)
  const hasSuccess = Boolean(success) && !hasError

  const getInputClassName = () => {
    const baseClasses = "pr-10"
    const statusClasses = hasError
      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
      : hasSuccess
        ? "border-green-500 focus:border-green-500 focus:ring-green-500"
        : ""

    return cn(baseClasses, statusClasses, inputClassName)
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
        {label}
      </Label>

      <div className="relative">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={getInputClassName()}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${id}-error` : success ? `${id}-success` : description ? `${id}-description` : undefined
          }
        />

        {/* Icono de estado */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {hasError && <AlertCircle className="h-4 w-4 text-red-500" />}
          {hasSuccess && <CheckCircle className="h-4 w-4 text-green-500" />}
        </div>
      </div>

      {/* Descripción */}
      {description && !error && !success && (
        <p id={`${id}-description`} className="text-xs text-gray-500">
          {description}
        </p>
      )}

      {/* Mensaje de error */}
      {error && (
        <div id={`${id}-error`} className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}

      {/* Mensaje de éxito */}
      {success && !error && (
        <div id={`${id}-success`} className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="h-3 w-3" />
          <span>{success}</span>
        </div>
      )}
    </div>
  )
}
