// Organization plan types
export type OrganizationPlanType = 'free' | 'team' | 'enterprise'

// Member roles (aligned with auth.ts UserRole)
export type MemberRole = 'admin' | 'analyst' | 'viewer'

// Member status
export type MemberStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Organization visibility
export type WatchlistVisibility = 'private' | 'shared' | 'public'

// Watchlist collaborator permissions
export type WatchlistPermission = 'view' | 'edit' | 'admin'

// Deal priority levels
export type DealPriority = 'low' | 'medium' | 'high' | 'urgent'

// Deal status
export type DealStatus = 'active' | 'won' | 'lost' | 'abandoned'

// Deal activity types
export type DealActivityType =
  | 'note'
  | 'status_change'
  | 'stage_change'
  | 'assignment'
  | 'bid_update'
  | 'document_added'
  | 'email_sent'
  | 'phone_call'
  | 'meeting'

// Property assignment types
export type PropertyAssignmentType =
  | 'research'
  | 'analysis'
  | 'due_diligence'
  | 'inspection'
  | 'bidding'
  | 'closing'
  | 'general'

// Assignment status
export type AssignmentStatus =
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'blocked'

// Audit log severity levels
export type AuditLogSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical'

// Organization settings structure
export interface OrganizationSettings {
  features: {
    shared_watchlists: boolean
    deal_pipeline: boolean
    audit_log: boolean
    advanced_analytics: boolean
  }
  limits: {
    max_members: number
    max_watchlists: number
    max_properties_per_watchlist: number
  }
}

// Organization interface
export interface Organization {
  id: string
  name: string
  slug: string
  planType: OrganizationPlanType
  settings: OrganizationSettings
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

// Organization member interface
export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  role: MemberRole
  status: MemberStatus
  invitedBy?: string
  invitationAcceptedAt?: Date
  joinedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Pipeline stage interface
export interface PipelineStage {
  id: string
  organizationId: string
  name: string
  description?: string
  color?: string
  sortOrder: number
  isTerminal: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Deal interface
export interface Deal {
  id: string
  organizationId: string
  propertyId?: string
  title: string
  description?: string
  currentStageId: string
  previousStageId?: string
  stageEnteredAt: Date
  targetBidAmount?: number
  maxBidAmount?: number
  actualBidAmount?: number
  purchasePrice?: number
  estimatedValue?: number
  estimatedProfit?: number
  priority: DealPriority
  status: DealStatus
  assignedTo?: string
  createdBy: string
  auctionDate?: Date
  registrationDeadline?: Date
  wonAt?: Date
  lostAt?: Date
  tags?: string[]
  customFields?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

// Deal assignment interface
export interface DealAssignment {
  id: string
  dealId: string
  userId: string
  role?: string
  assignedBy?: string
  assignedAt: Date
  isActive: boolean
  removedAt?: Date
}

// Deal activity interface
export interface DealActivity {
  id: string
  dealId: string
  userId?: string
  activityType: DealActivityType
  title: string
  description?: string
  fromStageId?: string
  toStageId?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

// Watchlist settings structure
export interface WatchlistSettings {
  notifications: {
    price_changes: boolean
    status_updates: boolean
    auction_reminders: boolean
  }
  auto_filters: {
    min_value?: number
    max_value?: number
    property_types: string[]
  }
}

// Watchlist interface
export interface Watchlist {
  id: string
  name: string
  description?: string
  organizationId?: string
  createdBy: string
  isShared: boolean
  visibility: WatchlistVisibility
  color?: string
  icon?: string
  sortOrder: number
  settings: WatchlistSettings
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

// Watchlist property interface
export interface WatchlistProperty {
  id: string
  watchlistId: string
  propertyId: string
  notes?: string
  priority: number
  isFavorite: boolean
  tags?: string[]
  customData?: Record<string, unknown>
  addedBy: string
  addedAt: Date
  lastViewedAt?: Date
  viewCount: number
  createdAt: Date
  updatedAt: Date
}

// Watchlist collaborator interface
export interface WatchlistCollaborator {
  id: string
  watchlistId: string
  userId: string
  permission: WatchlistPermission
  invitedBy?: string
  invitedAt: Date
  createdAt: Date
  updatedAt: Date
}

// Property assignment interface
export interface PropertyAssignment {
  id: string
  organizationId: string
  propertyId: string
  assignedTo: string
  assignedBy?: string
  assignmentType: PropertyAssignmentType
  status: AssignmentStatus
  priority: DealPriority
  dueDate?: Date
  startedAt?: Date
  completedAt?: Date
  cancelledAt?: Date
  assignmentNotes?: string
  completionNotes?: string
  blockedReason?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

// Audit log interface
export interface AuditLog {
  id: string
  userId?: string
  organizationId?: string
  action: string
  entityType: string
  entityId?: string
  description: string
  severity: AuditLogSeverity
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  requestId?: string
  metadata?: Record<string, unknown>
  tags?: string[]
  createdAt: Date
}

// Detailed view interfaces for API responses
export interface OrganizationMemberDetailed extends OrganizationMember {
  organizationName: string
  organizationPlanType: OrganizationPlanType
}

export interface DealComplete extends Deal {
  organizationName: string
  currentStageName: string
  currentStageColor?: string
  activeTeamMembers: number
  activityCount: number
}

export interface PipelineOverview {
  organizationId: string
  organizationName: string
  stageId: string
  stageName: string
  stageColor?: string
  sortOrder: number
  dealCount: number
  urgentCount: number
  highPriorityCount: number
  totalEstimatedValue?: number
  totalEstimatedProfit?: number
  avgEstimatedProfit?: number
}

export interface PropertyAssignmentDetailed extends PropertyAssignment {
  organizationName: string
  parcelNumber?: string
  propertyAddress?: string
  city?: string
  state?: string
  zipCode?: string
}

// Request/Response types for API operations
export interface CreateOrganizationRequest {
  name: string
  slug: string
  planType?: OrganizationPlanType
}

export interface UpdateOrganizationRequest {
  name?: string
  slug?: string
  planType?: OrganizationPlanType
  settings?: Partial<OrganizationSettings>
}

export interface InviteMemberRequest {
  email: string
  role: MemberRole
}

export interface UpdateMemberRoleRequest {
  role: MemberRole
}

export interface CreateWatchlistRequest {
  name: string
  description?: string
  organizationId?: string
  isShared?: boolean
  visibility?: WatchlistVisibility
  color?: string
  icon?: string
}

export interface UpdateWatchlistRequest {
  name?: string
  description?: string
  isShared?: boolean
  visibility?: WatchlistVisibility
  color?: string
  icon?: string
  settings?: Partial<WatchlistSettings>
}

export interface AddToWatchlistRequest {
  propertyId: string
  notes?: string
  priority?: number
  tags?: string[]
}

export interface CreateDealRequest {
  propertyId?: string
  title: string
  description?: string
  currentStageId: string
  targetBidAmount?: number
  maxBidAmount?: number
  estimatedValue?: number
  priority?: DealPriority
  assignedTo?: string
  auctionDate?: Date
  registrationDeadline?: Date
  tags?: string[]
}

export interface UpdateDealRequest {
  title?: string
  description?: string
  currentStageId?: string
  targetBidAmount?: number
  maxBidAmount?: number
  actualBidAmount?: number
  purchasePrice?: number
  estimatedValue?: number
  estimatedProfit?: number
  priority?: DealPriority
  status?: DealStatus
  assignedTo?: string
  auctionDate?: Date
  registrationDeadline?: Date
  tags?: string[]
  customFields?: Record<string, unknown>
}

export interface CreatePropertyAssignmentRequest {
  propertyId: string
  assignedTo: string
  assignmentType: PropertyAssignmentType
  priority?: DealPriority
  dueDate?: Date
  assignmentNotes?: string
}

export interface UpdatePropertyAssignmentRequest {
  status?: AssignmentStatus
  priority?: DealPriority
  dueDate?: Date
  completionNotes?: string
  blockedReason?: string
}

export interface CreateDealActivityRequest {
  activityType: DealActivityType
  title: string
  description?: string
  fromStageId?: string
  toStageId?: string
  metadata?: Record<string, unknown>
}

export interface AuditLogFilters {
  userId?: string
  organizationId?: string
  action?: string
  entityType?: string
  entityId?: string
  severity?: AuditLogSeverity
  startDate?: Date
  endDate?: Date
  tags?: string[]
}
