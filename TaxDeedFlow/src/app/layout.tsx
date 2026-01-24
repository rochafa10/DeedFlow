import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Providers } from "./providers"
import { OfflineBanner } from "@/components/pwa/OfflineBanner"
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration"
import { BottomNav } from "@/components/layout/BottomNav"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export const metadata: Metadata = {
  title: "Tax Deed Flow",
  description: "Comprehensive tax deed auction investment management",
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <ServiceWorkerRegistration />
        <OfflineBanner />
        <Providers>
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  )
}
