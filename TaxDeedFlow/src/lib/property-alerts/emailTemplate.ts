/**
 * Property Alert Email Template Module
 *
 * Generates professional HTML email templates for property alert notifications.
 *
 * @module lib/property-alerts/emailTemplate
 * @author Claude Code Agent
 * @date 2026-01-23
 */

// ============================================
// Types
// ============================================

export interface PropertyForEmail {
  id: string
  parcel: string | null
  full_address: string | null
  property_type: string | null
  total_due: number | null
  acres: number | null
  total_score: number | null
  county: {
    name: string
    state: string
  } | null
}

export interface AlertForEmail {
  id: string
  alert_rule_id: string
  alert_rule_name: string
  property_id: string
  match_score: number
  match_reasons: Record<string, any>
  property: PropertyForEmail
}

export interface EmailTemplateData {
  userName: string
  alerts: AlertForEmail[]
  appUrl?: string
}

// ============================================
// Helper Functions
// ============================================

/**
 * Formats currency values for email display
 */
function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '$0.00'
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Gets CSS class for match score badge
 */
function getScoreBadgeClass(score: number): string {
  if (score >= 80) return 'high'
  if (score >= 60) return 'medium'
  return 'low'
}

/**
 * Formats property address for display
 */
function formatAddress(property: PropertyForEmail): string {
  if (!property.full_address && !property.parcel) {
    return 'Address not available'
  }
  return property.full_address || property.parcel || 'Address not available'
}

/**
 * Formats county and state for display
 */
function formatCounty(property: PropertyForEmail): string {
  if (!property.county) return 'County, State'
  return `${property.county.name || 'County'}, ${property.county.state || 'State'}`
}

/**
 * Gets display value for property type
 */
function getPropertyType(property: PropertyForEmail): string {
  return property.property_type || 'Unknown'
}

/**
 * Gets display value for acres
 */
function getAcres(property: PropertyForEmail): string {
  if (property.acres === null || property.acres === undefined) return 'N/A'
  return property.acres.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Gets display value for parcel number
 */
function getParcelDisplay(property: PropertyForEmail): string {
  return property.parcel || 'Property'
}

// ============================================
// Email Generation Functions
// ============================================

/**
 * Generates HTML for a single property card
 */
function generatePropertyCard(alert: AlertForEmail): string {
  const p = alert.property
  const scoreClass = getScoreBadgeClass(alert.match_score)

  return `
      <div class="property-card">
        <div class="property-header">
          <h2 class="property-title">${getParcelDisplay(p)}</h2>
          <span class="property-score ${scoreClass}">Score: ${alert.match_score}</span>
        </div>
        <div class="property-details">
          📍 ${formatAddress(p)}<br>
          📍 ${formatCounty(p)}
        </div>
        <div class="property-stats">
          <div class="stat">
            <div class="stat-label">Total Due</div>
            <div class="stat-value">${formatCurrency(p.total_due)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Property Type</div>
            <div class="stat-value">${getPropertyType(p)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Acres</div>
            <div class="stat-value">${getAcres(p)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Alert Rule</div>
            <div class="stat-value">${alert.alert_rule_name}</div>
          </div>
        </div>
      </div>`
}

/**
 * Generates email subject line
 */
export function generateEmailSubject(alertCount: number): string {
  const emoji = '🎯'
  const noun = alertCount === 1 ? 'Alert' : 'Alerts'
  return `${emoji} ${alertCount} New Property ${noun} - Tax Deed Flow`
}

/**
 * Generates complete HTML email for property alerts
 *
 * @param data - Email template data containing user name and alerts
 * @returns Complete HTML email string
 */
export function generatePropertyAlertEmail(data: EmailTemplateData): string {
  const { userName, alerts, appUrl = 'https://taxdeedflow.com' } = data

  // Sort alerts by match score descending
  const sortedAlerts = [...alerts].sort((a, b) => b.match_score - a.match_score)

  // Generate property cards (show top 10)
  const displayAlerts = sortedAlerts.slice(0, 10)
  const propertyCardsHtml = displayAlerts.map(generatePropertyCard).join('')

  // Additional properties message
  const remainingCount = sortedAlerts.length - 10
  const morePropertiesHtml =
    remainingCount > 0
      ? `<p><em>+ ${remainingCount} more ${remainingCount === 1 ? 'property' : 'properties'}...</em></p>`
      : ''

  // Plural handling
  const matchText =
    sortedAlerts.length === 1 ? 'property matches' : 'properties match'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: #2563eb;
      color: #ffffff;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 24px;
    }
    .summary {
      background-color: #eff6ff;
      border-left: 4px solid #2563eb;
      padding: 16px;
      margin-bottom: 24px;
    }
    .property-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      background-color: #ffffff;
    }
    .property-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .property-score {
      background-color: #10b981;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: bold;
      font-size: 14px;
    }
    .property-score.high {
      background-color: #10b981;
    }
    .property-score.medium {
      background-color: #3b82f6;
    }
    .property-score.low {
      background-color: #6b7280;
    }
    .property-title {
      font-size: 18px;
      font-weight: bold;
      color: #111827;
      margin: 0;
    }
    .property-details {
      font-size: 14px;
      color: #6b7280;
      margin: 8px 0;
    }
    .property-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 12px 0;
    }
    .stat {
      background-color: #f9fafb;
      padding: 8px;
      border-radius: 4px;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
    }
    .stat-value {
      font-size: 16px;
      font-weight: bold;
      color: #111827;
    }
    .cta-button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      margin: 24px 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 16px 24px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 New Property Alerts</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <div class="summary">
        <strong>${sortedAlerts.length} new ${matchText} your investment criteria!</strong>
      </div>
      ${propertyCardsHtml}
      ${morePropertiesHtml}
      <center>
        <a href="${appUrl}/properties/alerts/inbox" class="cta-button">View All Alerts</a>
      </center>
    </div>
    <div class="footer">
      <p>You're receiving this email because you have active property alert rules.</p>
      <p>
        <a href="${appUrl}/properties/alerts">Manage Alert Settings</a> |
        <a href="${appUrl}/settings/notifications">Unsubscribe</a>
      </p>
      <p>&copy; 2026 Tax Deed Flow. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generates a plain text version of the email for clients that don't support HTML
 */
export function generatePlainTextEmail(data: EmailTemplateData): string {
  const { userName, alerts, appUrl = 'https://taxdeedflow.com' } = data

  // Sort alerts by match score descending
  const sortedAlerts = [...alerts].sort((a, b) => b.match_score - a.match_score)

  // Generate property list
  const displayAlerts = sortedAlerts.slice(0, 10)
  const propertyList = displayAlerts
    .map((alert) => {
      const p = alert.property
      return `
Property: ${getParcelDisplay(p)}
Address: ${formatAddress(p)}
County: ${formatCounty(p)}
Total Due: ${formatCurrency(p.total_due)}
Property Type: ${getPropertyType(p)}
Acres: ${getAcres(p)}
Match Score: ${alert.match_score}
Alert Rule: ${alert.alert_rule_name}
---
`
    })
    .join('\n')

  // Additional properties message
  const remainingCount = sortedAlerts.length - 10
  const moreProperties =
    remainingCount > 0
      ? `\n+ ${remainingCount} more ${remainingCount === 1 ? 'property' : 'properties'}...`
      : ''

  const matchText =
    sortedAlerts.length === 1 ? 'property matches' : 'properties match'

  return `
NEW PROPERTY ALERTS - Tax Deed Flow

Hi ${userName},

${sortedAlerts.length} new ${matchText} your investment criteria!

${propertyList}${moreProperties}

View all alerts: ${appUrl}/properties/alerts/inbox

---

You're receiving this email because you have active property alert rules.

Manage Alert Settings: ${appUrl}/properties/alerts
Unsubscribe: ${appUrl}/settings/notifications

© 2026 Tax Deed Flow. All rights reserved.
`
}

/**
 * Validates that email template data is complete and ready for rendering
 */
export function validateEmailData(data: EmailTemplateData): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data.userName || data.userName.trim() === '') {
    errors.push('userName is required')
  }

  if (!data.alerts || !Array.isArray(data.alerts)) {
    errors.push('alerts must be an array')
  } else if (data.alerts.length === 0) {
    errors.push('alerts array cannot be empty')
  } else {
    // Validate each alert has required fields
    data.alerts.forEach((alert, index) => {
      if (!alert.property) {
        errors.push(`Alert at index ${index} is missing property data`)
      }
      if (typeof alert.match_score !== 'number') {
        errors.push(`Alert at index ${index} is missing match_score`)
      }
      if (!alert.alert_rule_name) {
        errors.push(`Alert at index ${index} is missing alert_rule_name`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
