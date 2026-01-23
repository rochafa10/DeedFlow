"use client"

import { useState, useEffect } from "react"
import { Building2, LogOut, User, ChevronDown, Bell, Menu, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { SkipLink } from "./SkipLink"

export function Header() {
  const { user, logout, isAuthenticated } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [propertyAlertCount, setPropertyAlertCount] = useState<number>(0)
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  // Fetch unread property alert count
  useEffect(() => {
    const fetchPropertyAlertCount = async () => {
      if (!isAuthenticated) return

      try {
        const response = await fetch('/api/property-alerts?read=false&count_only=true')
        if (response.ok) {
          const data = await response.json()
          setPropertyAlertCount(data.count || 0)
        }
      } catch (error) {
        // Silent fail - use default count of 0
      }
    }

    fetchPropertyAlertCount()
    // Poll for updates every 60 seconds
    const interval = setInterval(fetchPropertyAlertCount, 60000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"

  return (
    <>
      <SkipLink />
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button - min 44x44px touch target */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden min-w-[44px] min-h-[44px] p-2.5 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
              aria-label="Open menu"
              aria-expanded={showMobileMenu}
            >
              <Menu className="h-6 w-6 text-slate-600 dark:text-slate-300" aria-hidden="true" />
            </button>
            <Building2 className="h-8 w-8 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold text-slate-900 dark:text-white">Tax Deed Flow</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="/" className="text-sm font-medium text-primary">Dashboard</a>
            <a href="/properties" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Properties</a>
            <a href="/counties" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Counties</a>
            <a href="/auctions" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Auctions</a>
            <a href="/batch-jobs" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Batch Jobs</a>
            <a href="/orchestration" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Orchestration</a>
            <a href="/data-integrity" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Data Integrity</a>
          </nav>
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              {/* Property Alert Bell */}
              <button
                onClick={() => router.push('/properties/alerts/inbox')}
                className="relative min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                aria-label="Property Alerts"
                title="Property Alerts"
              >
                <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                {propertyAlertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {propertyAlertCount > 9 ? "9+" : propertyAlertCount}
                  </span>
                )}
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 min-h-[44px] p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="User menu"
                  aria-expanded={showDropdown}
                >
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                    {userInitial}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {showDropdown && (
                  <>
                    {/* Backdrop to close dropdown when clicking outside */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowDropdown(false)}
                    />

                    {/* Dropdown menu */}
                    <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg border border-slate-200 py-1 z-20">
                      <div className="px-4 py-3 border-b border-slate-200">
                        <p className="text-sm font-medium text-slate-900">{user?.name || "User"}</p>
                        <p className="text-sm text-slate-500 truncate">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <a
                          href="/settings"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          <User className="h-4 w-4" aria-hidden="true" />
                          Account Settings
                        </a>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />

          {/* Slide-out Menu */}
          <nav className="fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 md:hidden transform transition-transform">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
                <span className="font-bold text-slate-900">Tax Deed Flow</span>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-slate-600" aria-hidden="true" />
              </button>
            </div>
            <div className="py-4">
              <a
                href="/"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Dashboard
              </a>
              <a
                href="/properties"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Properties
              </a>
              <a
                href="/counties"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Counties
              </a>
              <a
                href="/auctions"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Auctions
              </a>
              <a
                href="/batch-jobs"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Batch Jobs
              </a>
              <a
                href="/orchestration"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Orchestration
              </a>
              <a
                href="/data-integrity"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Data Integrity
              </a>
            </div>
          </nav>
        </>
      )}
      </header>
    </>
  )
}
