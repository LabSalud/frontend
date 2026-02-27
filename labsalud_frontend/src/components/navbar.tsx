"use client"

import type React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import { Link, useLocation } from "react-router-dom"
import { Menu, X, UserCircle, Shield, Settings, LogOut } from "lucide-react"
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
  const { user, hasPermission, logout } = useAuth()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const userAvatarRef = useRef<HTMLDivElement>(null)

  const canAccessManagement = hasPermission(PERMISSIONS.MANAGE_USERS.id)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => {
      if (!prev) setIsUserMenuOpen(false) // close user menu when opening hamburger
      return !prev
    })
  }

  const toggleUserMenu = () => {
    setIsUserMenuOpen((prev) => {
      if (!prev) setIsMobileMenuOpen(false) // close hamburger when opening user menu
      return !prev
    })
  }

  const closeAllMenus = () => {
    setIsMobileMenuOpen(false)
    setIsUserMenuOpen(false)
  }

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(target)
      ) {
        setIsMobileMenuOpen(false)
      }

      if (
        isUserMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(target) &&
        userAvatarRef.current &&
        !userAvatarRef.current.contains(target)
      ) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMobileMenuOpen, isUserMenuOpen])

  // Close all menus on route change
  useEffect(() => {
    closeAllMenus()
  }, [location.pathname])

  // Desktop-only: forward user menu state from UserDropdown
  const handleUserMenuToggle = useCallback((isOpen: boolean) => {
    setIsUserMenuOpen(isOpen)
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
              {/* Left - User Avatar (toggles user menu panel) */}
              <div className="flex-shrink-0" ref={userAvatarRef}>
                <UserDropdown isMobile={true} onMenuToggle={() => toggleUserMenu()} />
              </div>

              {/* Center - Logo */}
              <div className="flex-shrink-0">
                <Link to="/" onClick={closeAllMenus} className="flex items-center">
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

          {/* Backdrop overlay - closes any open menu when tapping outside */}
          {(isMobileMenuOpen || isUserMenuOpen) && (
            <div
              className="fixed inset-0 z-30"
              onClick={closeAllMenus}
              aria-hidden="true"
            />
          )}

          {/* Mobile Navigation Menu (hamburger) */}
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
                    onClick={closeAllMenus}
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
                      onClick={closeAllMenus}
                    >
                      <div className="block px-3 py-2 text-base">{item.label}</div>
                    </NavLink>
                  ))}
              </div>
            </div>
          </div>

          {/* Mobile User Menu (same pattern as hamburger menu) */}
          <div
            ref={userMenuRef}
            className={`
              absolute left-0 w-full bg-white shadow-lg z-40 overflow-hidden rounded-b-lg
              transition-all duration-200 ease-in-out
              ${isUserMenuOpen ? "opacity-100 max-h-[70vh]" : "opacity-0 max-h-0 pointer-events-none"}
            `}
          >
            <div className="px-4 py-4">
              {/* User Info */}
              <div className="pb-3 mb-3 border-b border-gray-100">
                <p className="text-lg font-medium text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-sm text-gray-500">{user?.username}</p>
              </div>

              {/* Menu Items */}
              <div className="flex flex-col items-center space-y-1">
                <Link
                  to="/profile"
                  className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3 rounded-lg transition-colors duration-150"
                  onClick={closeAllMenus}
                >
                  <UserCircle className="w-5 h-5" />
                  <span>Mi Perfil</span>
                </Link>

                {canAccessManagement && (
                  <Link
                    to="/management"
                    className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3 rounded-lg transition-colors duration-150"
                    onClick={closeAllMenus}
                  >
                    <Shield className="w-5 h-5" />
                    <span>Gestion de Usuarios</span>
                  </Link>
                )}

                <Link
                  to="/configuracion"
                  className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3 rounded-lg transition-colors duration-150"
                  onClick={closeAllMenus}
                >
                  <Settings className="w-5 h-5" />
                  <span>Configuracion</span>
                </Link>

                <hr className="w-full my-2" />

                <button
                  onClick={() => {
                    logout(true)
                    closeAllMenus()
                  }}
                  className="w-full text-left px-3 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 rounded-lg transition-colors duration-150"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Cerrar Sesion</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
