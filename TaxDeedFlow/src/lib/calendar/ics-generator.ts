import { createEvents, EventAttributes } from "ics"

/**
 * Auction event data for calendar export
 */
export interface AuctionEvent {
  id: string
  county: string
  state: string
  date: string // ISO date string
  type: string
  platform: string
  location: string
  propertyCount: number
  registrationDeadline?: string | null
  depositRequired?: string
}

/**
 * ICS generator options
 */
export interface ICSGeneratorOptions {
  includeAlarms?: boolean
  alarmMinutesBefore?: number[]
}

/**
 * Convert ISO date string to date array format [year, month, day, hour, minute]
 * Required by the ics package
 */
function dateToArray(dateString: string): [number, number, number, number, number] {
  const date = new Date(dateString)
  return [
    date.getFullYear(),
    date.getMonth() + 1, // ics package uses 1-based months
    date.getDate(),
    date.getHours() || 9, // Default to 9 AM if no time specified
    date.getMinutes() || 0,
  ]
}

/**
 * Create a calendar event for an auction sale date
 */
function createAuctionEvent(
  auction: AuctionEvent,
  options: ICSGeneratorOptions = {}
): EventAttributes {
  const startDate = dateToArray(auction.date)

  // Auction events typically last 2-4 hours, default to 3 hours
  const endDate = new Date(auction.date)
  endDate.setHours(endDate.getHours() + 3)

  const event: EventAttributes = {
    title: `${auction.county}, ${auction.state} Tax Auction`,
    start: startDate,
    end: dateToArray(endDate.toISOString()),
    description: [
      `Tax Deed Auction - ${auction.county} County, ${auction.state}`,
      `Type: ${auction.type}`,
      `Platform: ${auction.platform}`,
      `Properties: ${auction.propertyCount}`,
      auction.depositRequired ? `Deposit: ${auction.depositRequired}` : "",
    ].filter(Boolean).join("\n"),
    location: auction.location,
    status: "CONFIRMED",
    busyStatus: "BUSY",
    categories: ["Tax Auction", "Investment"],
    url: `${process.env.NEXT_PUBLIC_BASE_URL || ""}/auctions`,
  }

  // Add alarms if requested
  if (options.includeAlarms && options.alarmMinutesBefore) {
    event.alarms = options.alarmMinutesBefore.map((minutes) => ({
      action: "display" as const,
      trigger: { minutes, before: true },
      description: `Tax auction in ${auction.county}, ${auction.state} starting soon`,
    }))
  }

  return event
}

/**
 * Create a calendar event for a registration deadline
 */
function createRegistrationDeadlineEvent(
  auction: AuctionEvent,
  options: ICSGeneratorOptions = {}
): EventAttributes | null {
  if (!auction.registrationDeadline) {
    return null
  }

  const startDate = dateToArray(auction.registrationDeadline)

  // Registration deadline is typically an all-day event or ends at 5 PM
  const endDate = new Date(auction.registrationDeadline)
  endDate.setHours(17, 0, 0, 0) // 5 PM

  const event: EventAttributes = {
    title: `Registration Deadline - ${auction.county}, ${auction.state}`,
    start: startDate,
    end: dateToArray(endDate.toISOString()),
    description: [
      `Registration deadline for ${auction.county} County, ${auction.state} tax auction`,
      `Auction Date: ${new Date(auction.date).toLocaleDateString()}`,
      `Platform: ${auction.platform}`,
      auction.depositRequired ? `Deposit Required: ${auction.depositRequired}` : "",
    ].filter(Boolean).join("\n"),
    location: auction.platform,
    status: "CONFIRMED",
    busyStatus: "BUSY",
    categories: ["Tax Auction", "Deadline"],
    url: `${process.env.NEXT_PUBLIC_BASE_URL || ""}/auctions`,
  }

  // Add alarms for registration deadlines (more urgent)
  if (options.includeAlarms) {
    const alarmMinutes = options.alarmMinutesBefore || [4320, 1440, 360] // 3 days, 1 day, 6 hours
    event.alarms = alarmMinutes.map((minutes) => ({
      action: "display" as const,
      trigger: { minutes, before: true },
      description: `Registration deadline approaching for ${auction.county}, ${auction.state}`,
    }))
  }

  return event
}

/**
 * Generate ICS calendar file content from auction events
 *
 * @param auctions Array of auction events to include in calendar
 * @param options Configuration options for the calendar generation
 * @returns ICS file content as string, or null if generation fails
 */
export function generateAuctionCalendar(
  auctions: AuctionEvent[],
  options: ICSGeneratorOptions = {}
): string | null {
  if (!auctions || auctions.length === 0) {
    console.warn("[ICS Generator] No auctions provided for calendar generation")
    return null
  }

  const events: EventAttributes[] = []

  // Create events for each auction
  for (const auction of auctions) {
    // Add auction sale date event
    events.push(createAuctionEvent(auction, options))

    // Add registration deadline event if exists
    const registrationEvent = createRegistrationDeadlineEvent(auction, options)
    if (registrationEvent) {
      events.push(registrationEvent)
    }
  }

  // Generate ICS file content
  const { error, value } = createEvents(events)

  if (error) {
    console.error("[ICS Generator] Error creating calendar events:", error)
    return null
  }

  return value || null
}

/**
 * Generate filename for ICS download
 */
export function generateCalendarFilename(county?: string): string {
  const timestamp = new Date().toISOString().split("T")[0]
  const prefix = county ? `${county.toLowerCase().replace(/\s+/g, "-")}` : "all-auctions"
  return `${prefix}-calendar-${timestamp}.ics`
}

/**
 * Helper to check if calendar generation is supported
 */
export function isCalendarGenerationSupported(): boolean {
  return typeof createEvents === "function"
}
