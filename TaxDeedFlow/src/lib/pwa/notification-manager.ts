/**
 * Notification Manager
 * Handles push notification permissions, subscription, and management
 */

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined"

// Check if Notification API is supported
export const isNotificationSupported = (): boolean => {
  return isBrowser && "Notification" in window && "serviceWorker" in navigator
}

// Check if Push API is supported
export const isPushSupported = (): boolean => {
  return (
    isBrowser &&
    "PushManager" in window &&
    "serviceWorker" in navigator
  )
}

/**
 * Get current notification permission status
 * @returns "granted" | "denied" | "default" | null
 */
export const getNotificationPermission = (): NotificationPermission | null => {
  if (!isNotificationSupported()) {
    return null
  }
  return Notification.permission
}

/**
 * Check if notifications are enabled (permission granted)
 */
export const areNotificationsEnabled = (): boolean => {
  return getNotificationPermission() === "granted"
}

/**
 * Request notification permission from user
 * @returns Promise resolving to permission status
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission | null> => {
  if (!isNotificationSupported()) {
    console.warn(
      "[Notification Manager] Notifications not supported in this browser.",
      "The Notification API requires a modern browser with service worker support."
    )
    return null
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.warn("[Notification Manager] Error requesting notification permission:", error)
    return null
  }
}

/**
 * Subscribe to push notifications
 * @param vapidPublicKey - VAPID public key for push subscription
 * @returns Promise resolving to PushSubscription or null
 */
export const subscribeToPushNotifications = async (
  vapidPublicKey?: string
): Promise<PushSubscription | null> => {
  if (!isPushSupported()) {
    console.warn(
      "[Notification Manager] Push notifications not supported in this browser.",
      "The Push API requires a modern browser with service worker support."
    )
    return null
  }

  // Check permission first
  const permission = getNotificationPermission()
  if (permission !== "granted") {
    console.warn(
      "[Notification Manager] Notification permission not granted.",
      "Call requestNotificationPermission() first."
    )
    return null
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      return existingSubscription
    }

    // Subscribe to push notifications
    const subscribeOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
    }

    // Add VAPID public key if provided
    if (vapidPublicKey) {
      subscribeOptions.applicationServerKey = urlBase64ToUint8Array(vapidPublicKey) as BufferSource
    }

    const subscription = await registration.pushManager.subscribe(subscribeOptions)
    return subscription
  } catch (error) {
    console.warn("[Notification Manager] Error subscribing to push notifications:", error)
    return null
  }
}

/**
 * Unsubscribe from push notifications
 * @returns Promise resolving to boolean indicating success
 */
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  if (!isPushSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      const success = await subscription.unsubscribe()
      return success
    }

    return false
  } catch (error) {
    console.warn("[Notification Manager] Error unsubscribing from push notifications:", error)
    return false
  }
}

/**
 * Get current push subscription
 * @returns Promise resolving to PushSubscription or null
 */
export const getPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch (error) {
    console.warn("[Notification Manager] Error getting push subscription:", error)
    return null
  }
}

/**
 * Show a local notification (doesn't require push subscription)
 * @param title - Notification title
 * @param options - Notification options
 */
export const showNotification = async (
  title: string,
  options?: NotificationOptions
): Promise<void> => {
  if (!isNotificationSupported()) {
    console.warn("[Notification Manager] Notifications not supported")
    return
  }

  const permission = getNotificationPermission()
  if (permission !== "granted") {
    console.warn("[Notification Manager] Notification permission not granted")
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, options)
  } catch (error) {
    console.warn("[Notification Manager] Error showing notification:", error)
  }
}

/**
 * Helper function to convert VAPID key from base64 to Uint8Array
 * @param base64String - VAPID public key in base64 format
 * @returns Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
