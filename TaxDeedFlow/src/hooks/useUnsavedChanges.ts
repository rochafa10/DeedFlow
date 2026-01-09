"use client"

import { useEffect, useCallback, useState } from "react"

/**
 * Hook to warn users about unsaved changes before leaving a page
 *
 * @param hasUnsavedChanges - Whether there are unsaved changes
 * @param message - Optional custom message (note: most browsers ignore custom messages)
 * @returns Object with isDirty state setter for manual control
 */
export function useUnsavedChanges(
  hasUnsavedChanges: boolean,
  message: string = "You have unsaved changes. Are you sure you want to leave?"
) {
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

  // Handle browser close/refresh with beforeunload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault()
        // Modern browsers ignore custom messages but require returnValue to be set
        event.returnValue = message
        return message
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [hasUnsavedChanges, message])

  // Function to confirm navigation
  const confirmNavigation = useCallback(() => {
    if (pendingNavigation) {
      pendingNavigation()
      setPendingNavigation(null)
    }
    setShowDialog(false)
  }, [pendingNavigation])

  // Function to cancel navigation
  const cancelNavigation = useCallback(() => {
    setPendingNavigation(null)
    setShowDialog(false)
  }, [])

  // Function to intercept navigation
  const handleNavigation = useCallback(
    (navigationCallback: () => void) => {
      if (hasUnsavedChanges) {
        setPendingNavigation(() => navigationCallback)
        setShowDialog(true)
        return false // Prevent navigation
      }
      navigationCallback()
      return true // Allow navigation
    },
    [hasUnsavedChanges]
  )

  return {
    showDialog,
    confirmNavigation,
    cancelNavigation,
    handleNavigation,
  }
}
