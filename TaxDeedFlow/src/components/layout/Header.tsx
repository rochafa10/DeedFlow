"use client"

import { useState } from "react"
import { Building2, LogOut, User, ChevronDown, Bell, Check, X, Menu } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { SkipLink } from "./SkipLink"

// Mock notifications data
const INITIAL_NOTIFICATIONS = [
  {
    id: "1",
    title: "Auction Alert",
    message: "Westmoreland County auction starts in 7 days",
    time: "5 min ago",
    read: false,
    type: "warning" as const,
  },
  {
    id: "2",
    title: "Batch Complete",
    message: "Regrid scraping for Somerset completed successfully",
    time: "1 hour ago",
    read: false,
    type: "success" as const,
  },
  {
    id: "3",
    title: "New Properties",
    message: "842 new properties added to pipeline",
    time: "2 hours ago",
    read: false,
    type: "info" as const,
  },
  {
    id: "4",
    title: "System Update",
    message: "Scheduled maintenance tonight at 2 AM EST",
    time: "Yesterday",
    read: true,
    type: "info" as const,
  },
]

type NotificationType = "info" | "warning" | "success" | "error"

interface Notification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: NotificationType
}

export function Header() {
  const { user, logout, isAuthenticated } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"

  const getTypeStyles = (type: NotificationType) => {
    switch (type) {
      case "warning":
        return "bg-amber-100 text-amber-600"
      case "success":
        return "bg-green-100 text-green-600"
      case "error":
        return "bg-red-100 text-red-600"
      default:
        return "bg-blue-100 text-blue-600"
    }
  }

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
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications)
                    setShowDropdown(false)
                  }}
                  className="relative min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowNotifications(false)}
                    />

                    {/* Notifications Dropdown */}
                    <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white shadow-lg border border-slate-200 z-20 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                        <h3 className="font-semibold text-slate-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-primary hover:text-primary/80 font-medium"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${
                                !notification.read ? "bg-blue-50/50" : ""
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-1.5 rounded-full ${getTypeStyles(notification.type)}`}>
                                  <Bell className="h-3 w-3" aria-hidden="true" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-slate-900 truncate">
                                      {notification.title}
                                    </p>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {!notification.read && (
                                        <button
                                          onClick={() => markAsRead(notification.id)}
                                          className="p-1 hover:bg-slate-200 rounded"
                                          title="Mark as read"
                                          aria-label="Mark as read"
                                        >
                                          <Check className="h-3 w-3 text-slate-500" aria-hidden="true" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => dismissNotification(notification.id)}
                                        className="p-1 hover:bg-slate-200 rounded"
                                        title="Dismiss"
                                        aria-label="Dismiss notification"
                                      >
                                        <X className="h-3 w-3 text-slate-500" aria-hidden="true" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-sm text-slate-600 truncate">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {notification.time}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-slate-500">
                            <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300" aria-hidden="true" />
                            <p className="text-sm">No notifications</p>
                          </div>
                        )}
                      </div>

                      {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50">
                          <a
                            href="/settings/notifications"
                            className="text-xs text-primary hover:text-primary/80 font-medium"
                          >
                            View all notifications
                          </a>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowDropdown(!showDropdown)
                    setShowNotifications(false)
                  }}
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
