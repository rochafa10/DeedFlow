"use client"

import { useState } from "react"
import { X, Download, Share, Smartphone } from "lucide-react"
import { usePWA } from "@/hooks/usePWA"

/**
 * InstallPrompt component displays a custom UI to prompt users to install the PWA
 *
 * Features:
 * - Platform-specific install instructions (iOS, Android, Desktop)
 * - Custom install button for Android/Desktop (uses beforeinstallprompt API)
 * - Manual instructions for iOS (Share > Add to Home Screen)
 * - Dismissible with 7-day cooldown (managed by usePWA hook)
 * - Dark mode support
 * - Responsive design
 */
export function InstallPrompt() {
  const { isInstalled, canPrompt, isDismissed, platform, promptInstall, dismissInstall } = usePWA()
  const [isInstalling, setIsInstalling] = useState(false)

  // Don't show if already installed, dismissed, or can't prompt on non-iOS platforms
  if (isInstalled || isDismissed) {
    return null
  }

  // For iOS, always show instructions (no beforeinstallprompt support)
  // For Android/Desktop, only show if canPrompt is true
  if (platform !== "ios" && !canPrompt) {
    return null
  }

  const handleInstall = async () => {
    if (platform === "ios") {
      // iOS doesn't support programmatic install, so this shouldn't happen
      // But if it does, just dismiss the prompt
      dismissInstall()
      return
    }

    setIsInstalling(true)

    try {
      const result = await promptInstall()

      if (result?.outcome === "accepted") {
        // Installation accepted - prompt will auto-hide via usePWA hook
      } else {
        // Installation dismissed - prompt will auto-hide via usePWA hook
      }
    } catch (error) {
      // Silent fail - just dismiss the prompt
      dismissInstall()
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    dismissInstall()
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-md">
      <div className="relative rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          aria-label="Dismiss install prompt"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="pr-8">
          {/* Icon and title */}
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              {platform === "ios" ? (
                <Share className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Install Tax Deed Flow
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get quick access and work offline
              </p>
            </div>
          </div>

          {/* Platform-specific content */}
          {platform === "ios" ? (
            // iOS instructions (no programmatic install support)
            <div className="mb-4 space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Install this app on your iPhone:
              </p>
              <ol className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="font-semibold">1.</span>
                  <span>
                    Tap the <Share className="inline h-4 w-4" /> Share button
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">2.</span>
                  <span>Scroll down and tap &ldquo;Add to Home Screen&rdquo;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">3.</span>
                  <span>Tap &ldquo;Add&rdquo; to confirm</span>
                </li>
              </ol>
            </div>
          ) : (
            // Android/Desktop install button
            <>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Add to Home Screen for a faster experience with offline access to your saved properties
                and auction alerts.
              </p>
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800"
              >
                <Smartphone className="h-5 w-5" />
                {isInstalling ? "Installing..." : "Add to Home Screen"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
