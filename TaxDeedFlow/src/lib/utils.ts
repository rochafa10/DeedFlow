import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { logger } from "@/lib/logger"

// Create context logger for utility functions
const utilsLogger = logger.withContext('Utils')

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date format preference key
export const DATE_FORMAT_KEY = "taxdeedflow_date_format"

// Default date format
export const DEFAULT_DATE_FORMAT = "MMM DD, YYYY"

// Get the user's date format preference
export function getDateFormatPreference(): string {
  if (typeof window === "undefined") return DEFAULT_DATE_FORMAT
  try {
    const stored = localStorage.getItem(DATE_FORMAT_KEY)
    if (stored) return stored
  } catch (err) {
    utilsLogger.error('Failed to read date format preference', {
      error: err instanceof Error ? err.message : String(err)
    })
  }
  return DEFAULT_DATE_FORMAT
}

// Format a date string according to user preference
export function formatDate(dateString: string, formatOverride?: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString

  const format = formatOverride || getDateFormatPreference()

  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const padZero = (n: number) => n.toString().padStart(2, "0")

  switch (format) {
    case "MM/DD/YYYY":
      return `${padZero(month + 1)}/${padZero(day)}/${year}`
    case "DD/MM/YYYY":
      return `${padZero(day)}/${padZero(month + 1)}/${year}`
    case "YYYY-MM-DD":
      return `${year}-${padZero(month + 1)}-${padZero(day)}`
    case "MMM DD, YYYY":
    default:
      return `${months[month]} ${day}, ${year}`
  }
}
