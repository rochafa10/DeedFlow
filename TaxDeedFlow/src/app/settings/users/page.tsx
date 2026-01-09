"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  User,
  Bell,
  Shield,
  Key,
  Save,
  ArrowLeft,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  ShieldX,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"

// Mock users data
const MOCK_USERS = [
  {
    id: "user-001",
    name: "Demo User",
    email: "demo@taxdeedflow.com",
    role: "admin",
    status: "active",
    lastActive: "2026-01-09T14:30:00Z",
    createdAt: "2025-06-15T10:00:00Z",
  },
  {
    id: "user-002",
    name: "John Smith",
    email: "john.smith@taxdeedflow.com",
    role: "analyst",
    status: "active",
    lastActive: "2026-01-09T12:15:00Z",
    createdAt: "2025-08-20T14:30:00Z",
  },
  {
    id: "user-003",
    name: "Sarah Johnson",
    email: "sarah.j@taxdeedflow.com",
    role: "analyst",
    status: "active",
    lastActive: "2026-01-08T16:45:00Z",
    createdAt: "2025-09-10T09:00:00Z",
  },
  {
    id: "user-004",
    name: "Mike Williams",
    email: "mike.w@taxdeedflow.com",
    role: "viewer",
    status: "invited",
    lastActive: null,
    createdAt: "2026-01-05T11:00:00Z",
  },
  {
    id: "user-005",
    name: "Emily Davis",
    email: "emily.d@taxdeedflow.com",
    role: "analyst",
    status: "inactive",
    lastActive: "2025-12-15T10:00:00Z",
    createdAt: "2025-07-01T08:00:00Z",
  },
]

type UserRole = "admin" | "analyst" | "viewer"
type UserStatus = "active" | "inactive" | "invited"

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bgColor: string }> = {
  admin: { label: "Admin", color: "text-purple-700", bgColor: "bg-purple-100" },
  analyst: { label: "Analyst", color: "text-blue-700", bgColor: "bg-blue-100" },
  viewer: { label: "Viewer", color: "text-slate-700", bgColor: "bg-slate-100" },
}

const STATUS_CONFIG: Record<UserStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  active: {
    label: "Active",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  inactive: {
    label: "Inactive",
    color: "text-slate-700",
    bgColor: "bg-slate-100",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  invited: {
    label: "Invited",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
}

export default function SettingsUsersPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [users, setUsers] = useState(MOCK_USERS)
  const [searchQuery, setSearchQuery] = useState("")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Check if user is admin
  const isAdmin = user?.role === "admin"

  // Handle user deletion with double-click protection
  const handleDeleteUser = async (userId: string) => {
    // Prevent multiple deletes
    if (isDeleting) return

    setIsDeleting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      // Remove user from list
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId))
      setDeleteConfirmId(null)
      setOpenMenuId(null)
    } catch (error) {
      console.error("Failed to delete user:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <ShieldX className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Access Denied
            </h2>
            <p className="text-slate-600 mb-4">
              You don't have permission to access this page. Only administrators can manage users.
            </p>
            <p className="text-sm text-slate-500">
              Contact your administrator if you need access to this feature.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Filter users
  const filteredUsers = users.filter(
    (user) =>
      searchQuery === "" ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const SETTINGS_TABS = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" />, active: false },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, active: false },
    { id: "security", label: "Security", icon: <Shield className="h-4 w-4" />, active: false },
    { id: "api", label: "API Keys", icon: <Key className="h-4 w-4" />, active: false },
    { id: "users", label: "Users", icon: <Users className="h-4 w-4" />, active: true },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-slate-600 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Settings Sidebar */}
          <div className="md:w-48 flex-shrink-0">
            <nav className="space-y-1">
              {SETTINGS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => router.push(`/settings/${tab.id}`)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    tab.active
                      ? "bg-primary text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Users Management */}
          <div className="flex-1">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">User Management</h2>
                  <p className="text-sm text-slate-500">Manage team members and permissions</p>
                </div>
                <button className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                  <UserPlus className="h-4 w-4" />
                  Invite User
                </button>
              </div>

              {/* Search */}
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Last Active
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredUsers.map((user) => {
                      const roleConfig = ROLE_CONFIG[user.role as UserRole]
                      const statusConfig = STATUS_CONFIG[user.status as UserStatus]
                      return (
                        <tr key={user.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">{user.name}</div>
                                <div className="text-sm text-slate-500 flex items-center gap-1">
                                  <Mail className="h-3.5 w-3.5" />
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                roleConfig.bgColor,
                                roleConfig.color
                              )}
                            >
                              {roleConfig.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                                statusConfig.bgColor,
                                statusConfig.color
                              )}
                            >
                              {statusConfig.icon}
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-700">
                              {user.lastActive
                                ? new Date(user.lastActive).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Never"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="relative inline-block">
                              <button
                                onClick={() =>
                                  setOpenMenuId(openMenuId === user.id ? null : user.id)
                                }
                                className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </button>
                              {openMenuId === user.id && (
                                <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                    <Edit className="h-4 w-4" />
                                    Edit User
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(user.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                  </button>
                                </div>
                              )}
                              {/* Delete Confirmation Dialog */}
                              {deleteConfirmId === user.id && (
                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                  <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                      Remove User
                                    </h3>
                                    <p className="text-slate-600 mb-4">
                                      Are you sure you want to remove <strong>{user.name}</strong>? This action cannot be undone.
                                    </p>
                                    <div className="flex justify-end gap-3">
                                      <button
                                        onClick={() => setDeleteConfirmId(null)}
                                        disabled={isDeleting}
                                        className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        disabled={isDeleting}
                                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {isDeleting ? "Removing..." : "Remove User"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="px-6 py-8 text-center">
                  <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Users Found</h3>
                  <p className="text-slate-500">
                    {searchQuery
                      ? "No users match your search criteria."
                      : "Invite team members to get started."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
