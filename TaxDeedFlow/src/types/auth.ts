export type UserRole = 'admin' | 'analyst' | 'viewer'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatarUrl?: string
  createdAt: Date
  // Organization membership
  currentOrganizationId?: string
  organizationRole?: UserRole
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials {
  email: string
  password: string
  name: string
}
