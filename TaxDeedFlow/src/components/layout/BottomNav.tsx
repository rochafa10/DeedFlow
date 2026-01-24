"use client"

import { Home, Building2, Calendar, Heart, Settings } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

export function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()

  // Don't show bottom nav on auth pages or if not authenticated
  if (!isAuthenticated || pathname?.startsWith("/login") || pathname?.startsWith("/signup") || pathname?.startsWith("/forgot-password")) {
    return null
  }

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/",
      icon: <Home className="h-5 w-5" aria-hidden="true" />,
    },
    {
      label: "Properties",
      href: "/properties",
      icon: <Building2 className="h-5 w-5" aria-hidden="true" />,
    },
    {
      label: "Auctions",
      href: "/auctions",
      icon: <Calendar className="h-5 w-5" aria-hidden="true" />,
    },
    {
      label: "Watchlist",
      href: "/watchlist",
      icon: <Heart className="h-5 w-5" aria-hidden="true" />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" aria-hidden="true" />,
    },
  ]

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }
    return pathname?.startsWith(href)
  }

  const handleNavigation = (href: string) => {
    router.push(href)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 md:hidden"
      role="navigation"
      aria-label="Mobile bottom navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] px-2 py-1 rounded-lg transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900",
                active
                  ? "text-primary dark:text-primary"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "transition-transform",
                  active && "scale-110"
                )}
              >
                {item.icon}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium leading-none",
                  active && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
