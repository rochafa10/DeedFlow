// Dashboard statistics types

export interface DashboardStats {
  counties: {
    total: number
    trend: string
  }
  properties: {
    total: number
    trend: string
  }
  approved: {
    total: number
    percentage: string
  }
  pending: {
    total: number
    percentage: string
  }
  auctions: {
    total: number
    urgency: "urgent" | "normal"
  }
}

export interface PipelineFunnel {
  parsed: number
  enriched: number
  validated: number
  approved: number
}

export interface UpcomingAuction {
  id: string
  county: string
  state: string
  date: string
  daysUntil: number
  propertyCount: number
}

export interface Bottleneck {
  title: string
  count: number
  severity: "critical" | "warning" | "info"
  message: string
}

export interface ActivityItem {
  id: string
  action: string
  details: string
  time: string
  timestamp: Date
}

export interface CountyProgress {
  id: string
  county: string
  state: string
  total: number
  regridCount: number
  regridPercentage: number
  validated: number
  approved: number
  daysUntilAuction: number | null
}

export interface DashboardData {
  stats: DashboardStats
  funnel: PipelineFunnel
  upcomingAuctions: UpcomingAuction[]
  bottlenecks: Bottleneck[]
  recentActivity: ActivityItem[]
  countyProgress: CountyProgress[]
}
