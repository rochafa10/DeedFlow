"use client"

import { useState } from "react"
import { Calendar, Download, ExternalLink, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarExportProps {
  countyId?: string | null
  countyName?: string | null
  className?: string
}

/**
 * Calendar export component with Google/Apple Calendar integration
 * Provides buttons to download ICS calendar files or export to Google Calendar
 */
export function CalendarExport({ countyId, countyName, className }: CalendarExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  /**
   * Download ICS file for Apple Calendar, Outlook, etc.
   */
  const handleDownloadICS = async () => {
    setIsExporting(true)
    setExportStatus("idle")
    setErrorMessage(null)

    try {
      // Build API URL with optional county filter
      const params = new URLSearchParams()
      if (countyId) {
        params.append("county_id", countyId)
      }
      params.append("include_alarms", "true")

      const url = `/api/auctions/calendar/export?${params.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to generate calendar file")
      }

      // Get the ICS file content
      const icsContent = await response.text()

      // Create a blob and download it
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl

      // Set filename from response header or use default
      const contentDisposition = response.headers.get("content-disposition")
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || "tax-auctions.ics"

      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      setExportStatus("success")
      setTimeout(() => setExportStatus("idle"), 3000)
    } catch (error) {
      console.error("[CalendarExport] Download failed:", error)
      setExportStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Failed to download calendar")
    } finally {
      setIsExporting(false)
    }
  }

  /**
   * Export to Google Calendar
   * Downloads ICS and provides instructions for Google Calendar import
   */
  const handleGoogleCalendar = async () => {
    setIsExporting(true)
    setExportStatus("idle")
    setErrorMessage(null)

    try {
      // Build API URL with optional county filter
      const params = new URLSearchParams()
      if (countyId) {
        params.append("county_id", countyId)
      }
      params.append("include_alarms", "true")

      const url = `/api/auctions/calendar/export?${params.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to generate calendar file")
      }

      // Get the ICS file content
      const icsContent = await response.text()

      // Create a blob and download it
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl

      // Set filename
      const contentDisposition = response.headers.get("content-disposition")
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || "tax-auctions.ics"

      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      // Show success message with instructions
      setExportStatus("success")

      // Open Google Calendar import page
      setTimeout(() => {
        window.open("https://calendar.google.com/calendar/r/settings/export", "_blank")
      }, 500)

      setTimeout(() => setExportStatus("idle"), 5000)
    } catch (error) {
      console.error("[CalendarExport] Google Calendar export failed:", error)
      setExportStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Failed to export to Google Calendar")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={cn("bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4", className)}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Export Calendar
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {countyName
            ? `Export ${countyName} auction events to your calendar app`
            : "Export all upcoming auction events to your calendar app"}
        </p>
      </div>

      {/* Export Buttons */}
      <div className="space-y-3">
        {/* Download ICS Button */}
        <button
          onClick={handleDownloadICS}
          disabled={isExporting}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors",
            "bg-blue-600 hover:bg-blue-700 text-white",
            "disabled:bg-slate-300 disabled:cursor-not-allowed dark:disabled:bg-slate-600",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          )}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating Calendar...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Download ICS File</span>
            </>
          )}
        </button>

        {/* Google Calendar Button */}
        <button
          onClick={handleGoogleCalendar}
          disabled={isExporting}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors",
            "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300",
            "dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:border-slate-600",
            "disabled:bg-slate-100 disabled:cursor-not-allowed dark:disabled:bg-slate-700",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          )}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating Calendar...</span>
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4" />
              <span>Export to Google Calendar</span>
            </>
          )}
        </button>
      </div>

      {/* Status Messages */}
      {exportStatus === "success" && (
        <div className="mt-4 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200 text-sm">
                Calendar file downloaded successfully!
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Import the downloaded file into your calendar app:
              </p>
              <ul className="text-xs text-green-600 dark:text-green-400 mt-2 space-y-1 list-disc list-inside">
                <li>Apple Calendar: File → Import</li>
                <li>Google Calendar: Settings → Import & Export</li>
                <li>Outlook: File → Open & Export → Import/Export</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {exportStatus === "error" && errorMessage && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200 text-sm">
                Export Failed
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <strong>What&apos;s included:</strong> Auction sale dates, registration deadlines, and calendar reminders
          (3 days, 1 day, and 6 hours before each event)
        </p>
      </div>
    </div>
  )
}
