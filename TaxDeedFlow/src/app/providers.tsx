"use client"

import { ReactNode, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { AuthProvider } from "@/contexts/AuthContext"
import { SidebarProvider } from "@/contexts/SidebarContext"
import { Toaster } from "sonner"
import { InstallPrompt } from "@/components/pwa/InstallPrompt"

export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient inside component to avoid shared state between requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <SidebarProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                classNames: {
                  success: 'bg-green-50 border-green-200 text-green-800',
                  error: 'bg-red-50 border-red-200 text-red-800',
                  warning: 'bg-amber-50 border-amber-200 text-amber-800',
                  info: 'bg-blue-50 border-blue-200 text-blue-800',
                },
              }}
              richColors
            />
            <InstallPrompt />
          </SidebarProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
