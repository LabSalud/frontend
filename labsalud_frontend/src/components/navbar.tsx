"use client"

import type React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import { Link, useLocation } from "react-router-dom"
import { Menu, X } from "lucide-react"
import useAuth from "@/contexts/auth-context"
import { UserDropdown } from "./user-dropdown"
import { PERMISSIONS } from "@/config/permissions"

interface NavLinkProps {
  to: string
  children: React.ReactNode
  isActive?: boolean
  onClick?: () => void
}

const NavLink: React.FC<NavLinkProps> = ({ to, children, isActive, onClick }) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`
        relative px-3 py-2 text-sm font-medium transition-colors duration-200
        hover:text-[#204983] text-gray-700 group
        ${isActive ? "text-[#204983]" : ""}
      `}
    >
      {children}
      <span
        className={`
          absolute bottom-0 left-0 w-full h-0.5 bg-[#204983] transition-all duration-200
          ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
        `}
      />
    </Link>
  )
}

export const Navbar: React.FC = () => {
  const { user, hasPermission } = useAuth()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
    if (!isMobileMenuOpen) {
      setIsUserMenuOpen(false)
    }
  }

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMobileMenuOpen])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const handleUserMenuToggle = useCallback((isOpen: boolean) => {
    setIsUserMenuOpen(isOpen)
    // Close mobile menu when opening user menu
    if (isOpen) {
      setIsMobileMenuOpen(false)
    }
  }, [])

  if (!user) return null

  const leftNavItems = [
    { path: "/ingreso", label: "Ingreso" },
    { path: "/protocolos", label: "Protocolos" },
    { path: "/pacientes", label: "Pacientes" },
  ]

  const rightNavItems = [
    { path: "/resultados", label: "Resultados", condition: true }, // Todos pueden ver
    {
      path: "/validacion",
      label: "Validación",
      condition: hasPermission(PERMISSIONS.VALIDATE_RESULTS.id),
    },
  ]

  return (
    <>
      <nav className="w-full px-0 lg:px-4 relative">
        {/* Desktop Navbar */}
        <div className="hidden lg:block">
          <div
            className={`bg-white shadow-lg mx-4 px-8 py-4 transition-all duration-200 relative ${
              isUserMenuOpen
                ? "rounded-bl-[25px] rounded-br-none rounded-tl-none rounded-tr-none"
                : "rounded-bl-[25px] rounded-br-[25px] rounded-tl-none rounded-tr-none"
            }`}
          >
            <div className="flex items-center justify-between">
              {/* Left Navigation - Centrado entre borde izquierdo y logo */}
              <div className="flex-1 flex items-center justify-center space-x-8">
                {leftNavItems.map((item) => (
                  <NavLink key={item.path} to={item.path} isActive={location.pathname === item.path}>
                    {item.label}
                  </NavLink>
                ))}
              </div>

              {/* Center Logo */}
              <div className="flex-shrink-0 mx-8">
                <Link to="/" className="flex items-center">
                  <img
                    src="/logo_icono.svg"
                    alt="Logo"
                    className="h-9 w-auto object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=48&width=160&text=LOGO"
                    }}
                  />
                </Link>
              </div>

              {/* Right Navigation + User */}
              <div className="flex-1 flex items-center justify-between">
                {/* Right Navigation Items - Centrado entre logo y usuario */}
                <div className="flex-1 flex items-center justify-center space-x-8">
                  {rightNavItems
                    .filter((item) => item.condition)
                    .map((item) => (
                      <NavLink key={item.path} to={item.path} isActive={location.pathname === item.path}>
                        {item.label}
                      </NavLink>
                    ))}
                </div>

                {/* User Dropdown - Pegado a la derecha */}
                <div className="flex-shrink-0 relative">
                  <UserDropdown onMenuToggle={handleUserMenuToggle} />
                </div>
              </div>
            </div>

            {/* Extensión del menú de usuario para desktop */}
            {isUserMenuOpen && (
              <div
                className="absolute right-4 top-full bg-white shadow-lg z-40"
                style={{
                  width: "12rem", // w-48 = 12rem
                  marginTop: "0px",
                }}
              >
                {/* Este div actúa como la extensión visual de la navbar */}
              </div>
            )}
          </div>
        </div>

        {/* Mobile/Tablet Navbar */}
        <div className="lg:hidden relative">
          <div
            className={`
              bg-white shadow-lg px-4 py-3 w-full transition-all duration-200
              ${isMobileMenuOpen || isUserMenuOpen ? "rounded-b-none" : "rounded-b-lg"}
            `}
          >
            <div className="flex items-center justify-between">
              {/* Left - User Avatar */}
              <div className="flex-shrink-0">
                <UserDropdown isMobile={true} onMenuToggle={handleUserMenuToggle} />
              </div>

              {/* Center - Logo */}
              <div className="flex-shrink-0">
                <Link to="/" className="flex items-center">
                  <img
                    src="/logo_icono.svg"
                    alt="Logo"
                    className="h-8 w-auto object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=32&width=120&text=LOGO"
                    }}
                  />
                </Link>
              </div>

              {/* Right - Hamburger Menu */}
              <button
                ref={hamburgerRef}
                onClick={toggleMobileMenu}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Backdrop overlay - closes menu when tapping outside */}
          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Mobile Menu Dropdown - Absolute, pegado a la navbar */}
          <div
            ref={mobileMenuRef}
            className={`
              absolute left-0 w-full bg-white shadow-lg z-40 overflow-hidden rounded-b-lg
              transition-all duration-200 ease-in-out
              ${isMobileMenuOpen ? "opacity-100 max-h-[70vh]" : "opacity-0 max-h-0 pointer-events-none"}
            `}
          >
            <div className="px-4 py-4">
              <div className="flex flex-col items-center space-y-2">
                {leftNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    isActive={location.pathname === item.path}
                    onClick={toggleMobileMenu}
                  >
                    <div className="block px-3 py-2 text-base">{item.label}</div>
                  </NavLink>
                ))}
                {rightNavItems
                  .filter((item) => item.condition)
                  .map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      isActive={location.pathname === item.path}
                      onClick={toggleMobileMenu}
                    >
                      <div className="block px-3 py-2 text-base">{item.label}</div>
                    </NavLink>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
