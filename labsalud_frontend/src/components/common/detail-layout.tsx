"use client"

import type { ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Breadcrumb {
  label: string
  /** Si falta, es el elemento actual (no clickeable). */
  to?: string
}

interface DetailLayoutProps {
  breadcrumbs?: Breadcrumb[]
  /** A dónde vuelve la flecha "atrás". Default: history.back(). */
  backTo?: string
  title: ReactNode
  subtitle?: ReactNode
  /** Slot a la derecha del título (badge de estado, etc.). */
  status?: ReactNode
  /** Barra de acciones (botones) bajo el header. */
  actions?: ReactNode
  children: ReactNode
}

/**
 * Scaffold de una página de detalle: breadcrumb + header (con back, título,
 * estado y acciones) + cuerpo de secciones. Reutilizado por las páginas
 * `/protocolos/:id`, `/pacientes/:id`, etc.
 */
export function DetailLayout({
  breadcrumbs,
  backTo,
  title,
  subtitle,
  status,
  actions,
  children,
}: DetailLayoutProps) {
  const navigate = useNavigate()

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-gray-500">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
              {crumb.to ? (
                <Link to={crumb.to} className="transition-colors hover:text-[#204983]">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-gray-700">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="mb-4 rounded-lg bg-white/95 p-4 shadow-md backdrop-blur-sm md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
              className="mt-0.5 rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#204983]"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-gray-800 md:text-2xl">{title}</h1>
                {status}
              </div>
              {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>

          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>

      <div className="space-y-4">{children}</div>
    </div>
  )
}

interface DetailSectionProps {
  title?: ReactNode
  actions?: ReactNode
  className?: string
  children: ReactNode
}

/** Tarjeta de sección dentro de una página de detalle. */
export function DetailSection({ title, actions, className, children }: DetailSectionProps) {
  return (
    <section
      className={cn(
        "rounded-lg bg-white/95 p-4 shadow-md backdrop-blur-sm md:p-6",
        className,
      )}
    >
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-gray-800">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}
