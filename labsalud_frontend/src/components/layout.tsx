"use client"

import type React from "react"
import { Navbar } from "./navbar"
import { Outlet } from "react-router-dom"

interface LayoutProps {
  children?: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Content */}
      <div className="relative z-10">
        <Navbar />
        <main className="px-2 pt-4 sm:px-4">{children || <Outlet />}</main>
      </div>
    </div>
  )
}
