"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      // Register service worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log(
            "[Service Worker] Registered successfully:",
            registration.scope
          )

          // Check for updates periodically
          registration.update()

          // Listen for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing

            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // New service worker available
                  console.log(
                    "[Service Worker] New version available. Reload to update."
                  )
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error("[Service Worker] Registration failed:", error)
        })
    }
  }, [])

  // This component doesn't render anything
  return null
}
