/**
 * Push Notification Service
 * Handles Web Push API subscription and notification sending
 * Uses browser Notification API for deadline alerts
 */

// Check if notifications are supported in the browser
export const isNotificationSupported = (): boolean => {
  if (typeof window === "undefined") return false
  return "Notification" in window && "serviceWorker" in navigator
}

// Check if notification permission has been granted
export const isNotificationPermissionGranted = (): boolean => {
  if (!isNotificationSupported()) return false
  return Notification.permission === "granted"
}

// Check if notification permission has been denied
export const isNotificationPermissionDenied = (): boolean => {
  if (!isNotificationSupported()) return false
  return Notification.permission === "denied"
}

// Request notification permission from user
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    console.warn(
      "[Push Notifications] Not supported in this browser.",
      "Notifications require a modern browser with Web Push API support."
    )
    return "denied"
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error("[Push Notifications] Error requesting permission:", error)
    return "denied"
  }
}

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

// Convert PushSubscription to serializable format
export function serializePushSubscription(
  subscription: PushSubscription
): PushSubscriptionData {
  const keys = subscription.toJSON().keys
  if (!keys?.p256dh || !keys?.auth) {
    throw new Error("Invalid push subscription: missing keys")
  }

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  }
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(
  vapidPublicKey?: string
): Promise<PushSubscriptionData | null> {
  if (!isNotificationSupported()) {
    console.warn("[Push Notifications] Not supported in this browser")
    return null
  }

  if (!isNotificationPermissionGranted()) {
    const permission = await requestNotificationPermission()
    if (permission !== "granted") {
      console.warn("[Push Notifications] Permission not granted")
      return null
    }
  }

  try {
    const registration = await navigator.serviceWorker.ready

    // Subscribe with optional VAPID key
    const subscribeOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
    }

    if (vapidPublicKey) {
      subscribeOptions.applicationServerKey = urlBase64ToUint8Array(vapidPublicKey) as BufferSource
    }

    const subscription = await registration.pushManager.subscribe(subscribeOptions)
    return serializePushSubscription(subscription)
  } catch (error) {
    console.error("[Push Notifications] Error subscribing:", error)
    return null
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      return true
    }

    return false
  } catch (error) {
    console.error("[Push Notifications] Error unsubscribing:", error)
    return false
  }
}

// Get current push subscription
export async function getCurrentPushSubscription(): Promise<PushSubscriptionData | null> {
  if (!isNotificationSupported()) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      return serializePushSubscription(subscription)
    }

    return null
  } catch (error) {
    console.error("[Push Notifications] Error getting subscription:", error)
    return null
  }
}

export interface LocalNotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: unknown
  requireInteraction?: boolean
  silent?: boolean
}

// Show local notification (client-side only)
export async function showLocalNotification(
  options: LocalNotificationOptions
): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn("[Push Notifications] Not supported in this browser")
    return false
  }

  if (!isNotificationPermissionGranted()) {
    console.warn("[Push Notifications] Permission not granted")
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(options.title, {
      body: options.body,
      icon: options.icon || "/icon-192x192.png",
      badge: options.badge || "/badge-72x72.png",
      tag: options.tag,
      data: options.data,
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
    })
    return true
  } catch (error) {
    console.error("[Push Notifications] Error showing notification:", error)
    return false
  }
}

// Helper function to convert VAPID key
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

// Test notification (useful for debugging)
export async function sendTestNotification(): Promise<boolean> {
  return showLocalNotification({
    title: "Test Notification",
    body: "Push notifications are working correctly!",
    tag: "test-notification",
  })
}
