export type NotificationFrequency = 'instant' | 'daily' | 'weekly'

export interface AlertRule {
  id: string
  userId: string
  name: string
  enabled: boolean
  scoreThreshold: number | null
  countyIds: string[]
  propertyTypes: string[]
  maxBid: number | null
  minAcres: number | null
  maxAcres: number | null
  notificationFrequency: NotificationFrequency
  lastNotifiedAt: Date | null
  matchCount: number
  createdAt: Date
  updatedAt: Date
}

export interface PropertyAlert {
  id: string
  alertRuleId: string
  propertyId: string
  matchScore: number
  matchReasons: MatchReasons
  read: boolean
  archived: boolean
  readAt: Date | null
  archivedAt: Date | null
  createdAt: Date
}

export interface MatchCriteria {
  scoreThreshold?: number
  countyIds?: string[]
  propertyTypes?: string[]
  maxBid?: number
  minAcres?: number
  maxAcres?: number
}

export interface MatchReasons {
  scoreMatch?: boolean
  countyMatch?: boolean
  propertyTypeMatch?: boolean
  priceWithinBudget?: boolean
  acresInRange?: boolean
  reasons?: string[]
}

export interface MatchResult {
  matches: boolean
  score: number
  reasons: MatchReasons
}

export interface CreateAlertRuleInput {
  name: string
  enabled?: boolean
  scoreThreshold?: number
  countyIds?: string[]
  propertyTypes?: string[]
  maxBid?: number
  minAcres?: number
  maxAcres?: number
  notificationFrequency?: NotificationFrequency
}

export interface UpdateAlertRuleInput extends Partial<CreateAlertRuleInput> {
  id: string
}
