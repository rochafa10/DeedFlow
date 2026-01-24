"use client"

import { useState, useEffect, useCallback } from "react"

// Storage keys
const PWA_DISMISSED_KEY = "taxdeedflow_pwa_dismissed"
const PWA_INSTALLED_KEY = "taxdeedflow_pwa_installed"

// BeforeInstallPromptEvent interface (not in TypeScript by default)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isStandalone: boolean
  canPrompt: boolean
  isDismissed: boolean
  isLoading: boolean
  platform: "ios" | "android" | "desktop" | "unknown"
}

export interface PWAActions {
  promptInstall: () => Promise<{ outcome: "accepted" | "dismissed" } | null>
  dismissInstall: () => void
  resetDismissal: () => void
}

export type UsePWAReturn = PWAState & PWAActions

/**
 * Hook for PWA install detection and state management
 *
 * Handles:
 * - Detection of installable PWA via beforeinstallprompt event
 * - Detection of standalone mode (already installed)
 * - Platform detection (iOS, Android, Desktop)
 * - Install prompt management
 * - User dismissal tracking
 * - Installation state persistence
 */
export function usePWA(): UsePWAReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [platform, setPlatform] = useState<PWAState["platform"]>("unknown")

  // Detect platform
  const detectPlatform = useCallback((): PWAState["platform"] => {
    if (typeof window === "undefined") return "unknown"

    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(userAgent)
    const isAndroid = /android/.test(userAgent)

    if (isIOS) return "ios"
    if (isAndroid) return "android"
    return "desktop"
  }, [])

  // Check if running in standalone mode
  const checkStandaloneMode = useCallback((): boolean => {
    if (typeof window === "undefined") return false

    // Check various standalone indicators
    const isStandalonePWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://")

    return isStandalonePWA
  }, [])

  // Check if previously installed (from localStorage)
  const checkPreviouslyInstalled = useCallback((): boolean => {
    if (typeof window === "undefined") return false

    try {
      const installed = localStorage.getItem(PWA_INSTALLED_KEY)
      return installed === "true"
    } catch (error) {
      return false
    }
  }, [])

  // Check if user previously dismissed
  const checkPreviouslyDismissed = useCallback((): boolean => {
    if (typeof window === "undefined") return false

    try {
      const dismissed = localStorage.getItem(PWA_DISMISSED_KEY)
      if (!dismissed) return false

      const dismissedTime = parseInt(dismissed, 10)
      const now = Date.now()
      const daysSinceDismissal = (now - dismissedTime) / (1000 * 60 * 60 * 24)

      // Reset dismissal after 7 days
      if (daysSinceDismissal > 7) {
        localStorage.removeItem(PWA_DISMISSED_KEY)
        return false
      }

      return true
    } catch (error) {
      return false
    }
  }, [])

  // Prompt the user to install
  const promptInstall = useCallback(async (): Promise<{ outcome: "accepted" | "dismissed" } | null> => {
    if (!deferredPrompt) {
      return null
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt()

      // Wait for user choice
      const choiceResult = await deferredPrompt.userChoice

      if (choiceResult.outcome === "accepted") {
        // User accepted the install
        setIsInstalled(true)
        setIsInstallable(false)
        setDeferredPrompt(null)
        localStorage.setItem(PWA_INSTALLED_KEY, "true")
      } else {
        // User dismissed the install
        dismissInstall()
      }

      return choiceResult
    } catch (error) {
      // Installation prompt failed or was cancelled
      return null
    }
  }, [deferredPrompt])

  // Dismiss the install prompt
  const dismissInstall = useCallback(() => {
    setIsDismissed(true)
    localStorage.setItem(PWA_DISMISSED_KEY, Date.now().toString())
  }, [])

  // Reset dismissal (useful for testing or user preference)
  const resetDismissal = useCallback(() => {
    setIsDismissed(false)
    localStorage.removeItem(PWA_DISMISSED_KEY)
  }, [])

  // Initialize PWA state on mount
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false)
      return
    }

    try {
      // Detect platform
      const detectedPlatform = detectPlatform()
      setPlatform(detectedPlatform)

      // Check standalone mode
      const standalone = checkStandaloneMode()
      setIsStandalone(standalone)

      // Check if previously installed
      const previouslyInstalled = checkPreviouslyInstalled()

      // If standalone or previously installed, mark as installed
      if (standalone || previouslyInstalled) {
        setIsInstalled(true)
        setIsInstallable(false)
        if (standalone) {
          localStorage.setItem(PWA_INSTALLED_KEY, "true")
        }
      }

      // Check dismissal status
      const dismissed = checkPreviouslyDismissed()
      setIsDismissed(dismissed)
    } catch (error) {
      // Silent fail for initialization errors
    } finally {
      setIsLoading(false)
    }
  }, [detectPlatform, checkStandaloneMode, checkPreviouslyInstalled, checkPreviouslyDismissed])

  // Listen for beforeinstallprompt event
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the default browser install prompt
      event.preventDefault()

      const promptEvent = event as BeforeInstallPromptEvent

      // Store the event for later use
      setDeferredPrompt(promptEvent)
      setIsInstallable(true)

      // Don't show if already installed or dismissed
      const standalone = checkStandaloneMode()
      const previouslyInstalled = checkPreviouslyInstalled()

      if (standalone || previouslyInstalled) {
        setIsInstalled(true)
        setIsInstallable(false)
      }
    }

    const handleAppInstalled = () => {
      // App was installed
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      localStorage.setItem(PWA_INSTALLED_KEY, "true")
    }

    // Add event listeners
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [checkStandaloneMode, checkPreviouslyInstalled])

  // Monitor display mode changes (e.g., switching to standalone)
  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(display-mode: standalone)")

    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      const isNowStandalone = event.matches
      setIsStandalone(isNowStandalone)

      if (isNowStandalone) {
        setIsInstalled(true)
        setIsInstallable(false)
        localStorage.setItem(PWA_INSTALLED_KEY, "true")
      }
    }

    // Use deprecated addListener for broader compatibility
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleDisplayModeChange)
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleDisplayModeChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleDisplayModeChange)
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleDisplayModeChange)
      }
    }
  }, [])

  const canPrompt = isInstallable && !isInstalled && !isDismissed && !!deferredPrompt

  return {
    // State
    isInstallable,
    isInstalled,
    isStandalone,
    canPrompt,
    isDismissed,
    isLoading,
    platform,
    // Actions
    promptInstall,
    dismissInstall,
    resetDismissal,
  }
}
