"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  DollarSign,
  TrendingUp,
  Building2,
  BarChart3,
  ShoppingCart,
  AlertCircle,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  X,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  Receipt,
  Tag,
  Download,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { authFetch, authPost, authPatch, authDelete } from "@/lib/api/authFetch"
import type {
  PortfolioStats,
  PortfolioPurchaseFormData,
  PurchaseStatus,
  PortfolioRehabExpense,
  PortfolioSale,
  PortfolioSummary,
  RehabCategory,
  SaleType,
  PortfolioRehabExpenseFormData,
  PortfolioSaleFormData,
} from "@/types/portfolio"

// Extended purchase interface for list display
interface PurchaseListItem {
  id: string
  property_id: string
  purchase_date: string
  purchase_price: number
  closing_costs: number
  total_acquisition_cost: number
  predicted_roi: number | null
  notes: string | null
  status: PurchaseStatus
  created_at: string
  updated_at: string
  properties?: {
    id: string
    parcel_id: string | null
    address: string | null
    counties: {
      county_name: string
      state_code: string
    } | null
  } | null
}

// Property interface for dropdown
interface Property {
  id: string
  parcel_id: string | null
  address: string | null
  county: string
  state: string
}

// Stat card component
interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: string
  color?: string
}

function StatCard({ title, value, subtitle, icon, trend, color = "bg-blue-500" }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <div className="text-white">{icon}</div>
        </div>
        {trend && (
          <span className="text-sm font-medium text-green-600">{trend}</span>
        )}
      </div>
      <h3 className="text-sm font-medium text-slate-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {subtitle && (
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      )}
    </div>
  )
}

// Empty state component
interface EmptyStateProps {
  onAddPurchase: () => void
}

function EmptyState({ onAddPurchase }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-slate-100 rounded-full">
          <ShoppingCart className="h-8 w-8 text-slate-400" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        No Purchases Yet
      </h3>
      <p className="text-slate-600 mb-6 max-w-md mx-auto">
        Start tracking your tax deed investments by adding your first purchase.
        You&apos;ll be able to track acquisition costs, rehab expenses, and calculate actual ROI.
      </p>
      <button
        onClick={onAddPurchase}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Purchase
      </button>
    </div>
  )
}

// Error state component
function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-lg border border-red-200 p-12 text-center">
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-red-100 rounded-full">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        Error Loading Portfolio
      </h3>
      <p className="text-slate-600 max-w-md mx-auto">
        {message}
      </p>
    </div>
  )
}

// Purchase Form Modal
interface PurchaseFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PortfolioPurchaseFormData) => Promise<void>
  properties: Property[]
  editData?: PurchaseListItem | null
  isSubmitting: boolean
}

function PurchaseFormModal({
  isOpen,
  onClose,
  onSubmit,
  properties,
  editData,
  isSubmitting,
}: PurchaseFormModalProps) {
  const [formData, setFormData] = useState<PortfolioPurchaseFormData>({
    property_id: editData?.property_id || "",
    purchase_date: editData?.purchase_date || new Date().toISOString().split("T")[0],
    purchase_price: editData?.purchase_price || 0,
    closing_costs: editData?.closing_costs || 0,
    predicted_roi: editData?.predicted_roi || null,
    notes: editData?.notes || "",
  })

  const [errors, setErrors] = useState<Partial<Record<keyof PortfolioPurchaseFormData, string>>>({})

  // Update form data when editData changes
  useEffect(() => {
    if (editData) {
      setFormData({
        property_id: editData.property_id,
        purchase_date: editData.purchase_date,
        purchase_price: editData.purchase_price,
        closing_costs: editData.closing_costs,
        predicted_roi: editData.predicted_roi,
        notes: editData.notes || "",
      })
    } else {
      setFormData({
        property_id: "",
        purchase_date: new Date().toISOString().split("T")[0],
        purchase_price: 0,
        closing_costs: 0,
        predicted_roi: null,
        notes: "",
      })
    }
    setErrors({})
  }, [editData, isOpen])

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PortfolioPurchaseFormData, string>> = {}

    if (!formData.property_id) {
      newErrors.property_id = "Property is required"
    }
    if (!formData.purchase_date) {
      newErrors.purchase_date = "Purchase date is required"
    }
    if (formData.purchase_price <= 0) {
      newErrors.purchase_price = "Purchase price must be greater than 0"
    }
    if (formData.closing_costs < 0) {
      newErrors.closing_costs = "Closing costs cannot be negative"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    await onSubmit(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {editData ? "Edit Purchase" : "Add Purchase"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Property Selection */}
          <div>
            <label htmlFor="property_id" className="block text-sm font-medium text-slate-700 mb-2">
              Property <span className="text-red-500">*</span>
            </label>
            <select
              id="property_id"
              value={formData.property_id}
              onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.property_id ? "border-red-500" : "border-slate-300"
              }`}
              disabled={isSubmitting || !!editData}
            >
              <option value="">Select a property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.address || property.parcel_id || "Unknown Address"} - {property.county}, {property.state}
                </option>
              ))}
            </select>
            {errors.property_id && (
              <p className="mt-1 text-sm text-red-600">{errors.property_id}</p>
            )}
          </div>

          {/* Purchase Date */}
          <div>
            <label htmlFor="purchase_date" className="block text-sm font-medium text-slate-700 mb-2">
              Purchase Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="purchase_date"
              value={formData.purchase_date}
              onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.purchase_date ? "border-red-500" : "border-slate-300"
              }`}
              disabled={isSubmitting}
            />
            {errors.purchase_date && (
              <p className="mt-1 text-sm text-red-600">{errors.purchase_date}</p>
            )}
          </div>

          {/* Purchase Price and Closing Costs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="purchase_price" className="block text-sm font-medium text-slate-700 mb-2">
                Purchase Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500">$</span>
                <input
                  type="number"
                  id="purchase_price"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                  className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.purchase_price ? "border-red-500" : "border-slate-300"
                  }`}
                  min="0"
                  step="0.01"
                  disabled={isSubmitting}
                />
              </div>
              {errors.purchase_price && (
                <p className="mt-1 text-sm text-red-600">{errors.purchase_price}</p>
              )}
            </div>

            <div>
              <label htmlFor="closing_costs" className="block text-sm font-medium text-slate-700 mb-2">
                Closing Costs
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500">$</span>
                <input
                  type="number"
                  id="closing_costs"
                  value={formData.closing_costs}
                  onChange={(e) => setFormData({ ...formData, closing_costs: parseFloat(e.target.value) || 0 })}
                  className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.closing_costs ? "border-red-500" : "border-slate-300"
                  }`}
                  min="0"
                  step="0.01"
                  disabled={isSubmitting}
                />
              </div>
              {errors.closing_costs && (
                <p className="mt-1 text-sm text-red-600">{errors.closing_costs}</p>
              )}
            </div>
          </div>

          {/* Total Acquisition Cost (Calculated) */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Total Acquisition Cost</p>
            <p className="text-2xl font-bold text-slate-900">
              ${(formData.purchase_price + formData.closing_costs).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Predicted ROI */}
          <div>
            <label htmlFor="predicted_roi" className="block text-sm font-medium text-slate-700 mb-2">
              Predicted ROI (%)
            </label>
            <input
              type="number"
              id="predicted_roi"
              value={formData.predicted_roi || ""}
              onChange={(e) => setFormData({ ...formData, predicted_roi: e.target.value ? parseFloat(e.target.value) : null })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              step="0.1"
              placeholder="e.g., 25.5"
              disabled={isSubmitting}
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
              placeholder="Additional notes about this purchase..."
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:text-slate-900 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {editData ? "Updating..." : "Creating..."}
                </>
              ) : (
                editData ? "Update Purchase" : "Add Purchase"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Delete Confirmation Modal
interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  purchaseInfo: string
  isDeleting: boolean
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  purchaseInfo,
  isDeleting,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Delete Purchase</h3>
              <p className="text-sm text-slate-600">This action cannot be undone</p>
            </div>
          </div>

          <p className="text-slate-700 mb-6">
            Are you sure you want to delete the purchase for <strong>{purchaseInfo}</strong>?
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:text-slate-900 transition-colors"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Purchase
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Rehab Expense Form Component
interface RehabExpenseFormProps {
  purchaseId: string
  onAdded: () => void
}

function RehabExpenseForm({ purchaseId, onAdded }: RehabExpenseFormProps) {
  const [formData, setFormData] = useState({
    description: "",
    cost: 0,
    expense_date: new Date().toISOString().split("T")[0],
    category: "" as RehabCategory | "",
    vendor_name: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const newErrors: Record<string, string> = {}
    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    }
    if (formData.cost <= 0) {
      newErrors.cost = "Cost must be greater than 0"
    }
    if (!formData.expense_date) {
      newErrors.expense_date = "Date is required"
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      setIsSubmitting(true)
      const response = await authPost(`/api/portfolio/${purchaseId}/rehab`, {
        description: formData.description,
        cost: formData.cost,
        expense_date: formData.expense_date,
        category: formData.category || null,
        vendor_name: formData.vendor_name || null,
      })

      if (!response.ok) {
        throw new Error("Failed to add rehab expense")
      }

      // Reset form
      setFormData({
        description: "",
        cost: 0,
        expense_date: new Date().toISOString().split("T")[0],
        category: "",
        vendor_name: "",
      })
      setErrors({})

      // Notify parent
      onAdded()
    } catch (err) {
      console.error("[RehabExpenseForm] Error:", err)
      alert("Failed to add rehab expense")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2">
          <input
            type="text"
            placeholder="Description *"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.description ? "border-red-500" : "border-slate-300"
            }`}
            disabled={isSubmitting}
          />
          {errors.description && (
            <p className="text-xs text-red-600 mt-1">{errors.description}</p>
          )}
        </div>

        <div>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-500">$</span>
            <input
              type="number"
              placeholder="Cost *"
              value={formData.cost || ""}
              onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
              className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.cost ? "border-red-500" : "border-slate-300"
              }`}
              min="0"
              step="0.01"
              disabled={isSubmitting}
            />
          </div>
          {errors.cost && (
            <p className="text-xs text-red-600 mt-1">{errors.cost}</p>
          )}
        </div>

        <div>
          <input
            type="date"
            value={formData.expense_date}
            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.expense_date ? "border-red-500" : "border-slate-300"
            }`}
            disabled={isSubmitting}
          />
          {errors.expense_date && (
            <p className="text-xs text-red-600 mt-1">{errors.expense_date}</p>
          )}
        </div>

        <div>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as RehabCategory | "" })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSubmitting}
          >
            <option value="">Category</option>
            <option value="Electrical">Electrical</option>
            <option value="Plumbing">Plumbing</option>
            <option value="Roofing">Roofing</option>
            <option value="Cosmetic">Cosmetic</option>
            <option value="Legal">Legal</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <input
          type="text"
          placeholder="Vendor name (optional)"
          value={formData.vendor_name}
          onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isSubmitting}
        />

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add Expense
            </>
          )}
        </button>
      </div>
    </form>
  )
}

// Sale Recording Form Component
interface SaleFormProps {
  purchaseId: string
  totalInvested: number
  predictedRoi: number | null
  onRecorded: () => void
  onCancel: () => void
}

function SaleForm({ purchaseId, totalInvested, predictedRoi, onRecorded, onCancel }: SaleFormProps) {
  const [formData, setFormData] = useState<PortfolioSaleFormData>({
    sale_price: 0,
    sale_date: new Date().toISOString().split("T")[0],
    closing_costs: 0,
    buyer_name: "",
    sale_type: null,
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Calculate projected ROI
  const netProceeds = formData.sale_price - formData.closing_costs
  const grossProfit = netProceeds - totalInvested
  const projectedROI = totalInvested > 0 ? (grossProfit / totalInvested) * 100 : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const newErrors: Record<string, string> = {}
    if (formData.sale_price <= 0) {
      newErrors.sale_price = "Sale price must be greater than 0"
    }
    if (!formData.sale_date) {
      newErrors.sale_date = "Sale date is required"
    }
    if (formData.closing_costs < 0) {
      newErrors.closing_costs = "Closing costs cannot be negative"
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      setIsSubmitting(true)
      const response = await authPost(`/api/portfolio/${purchaseId}/sale`, formData)

      if (!response.ok) {
        throw new Error("Failed to record sale")
      }

      onRecorded()
    } catch (err) {
      console.error("[SaleForm] Error:", err)
      alert("Failed to record sale")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-green-50 p-4 rounded-lg border border-green-200">
      <h4 className="text-sm font-semibold text-slate-900 mb-3">Record Sale</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Sale Price <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-500">$</span>
            <input
              type="number"
              value={formData.sale_price || ""}
              onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })}
              className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.sale_price ? "border-red-500" : "border-slate-300"
              }`}
              min="0"
              step="0.01"
              disabled={isSubmitting}
            />
          </div>
          {errors.sale_price && (
            <p className="text-xs text-red-600 mt-1">{errors.sale_price}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Sale Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.sale_date}
            onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.sale_date ? "border-red-500" : "border-slate-300"
            }`}
            disabled={isSubmitting}
          />
          {errors.sale_date && (
            <p className="text-xs text-red-600 mt-1">{errors.sale_date}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Closing Costs
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-500">$</span>
            <input
              type="number"
              value={formData.closing_costs || ""}
              onChange={(e) => setFormData({ ...formData, closing_costs: parseFloat(e.target.value) || 0 })}
              className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.closing_costs ? "border-red-500" : "border-slate-300"
              }`}
              min="0"
              step="0.01"
              disabled={isSubmitting}
            />
          </div>
          {errors.closing_costs && (
            <p className="text-xs text-red-600 mt-1">{errors.closing_costs}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Sale Type
          </label>
          <select
            value={formData.sale_type || ""}
            onChange={(e) => setFormData({ ...formData, sale_type: (e.target.value || null) as SaleType | null })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSubmitting}
          >
            <option value="">Select type</option>
            <option value="MLS">MLS</option>
            <option value="Cash Buyer">Cash Buyer</option>
            <option value="Wholesaled">Wholesaled</option>
            <option value="Auction">Auction</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Buyer Name
        </label>
        <input
          type="text"
          value={formData.buyer_name}
          onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Optional"
          disabled={isSubmitting}
        />
      </div>

      {/* ROI Preview */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 mb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-600 mb-1">Net Proceeds</p>
            <p className="text-sm font-semibold text-slate-900">
              ${netProceeds.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Gross Profit</p>
            <p className={`text-sm font-semibold ${grossProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${grossProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Actual ROI</p>
            <p className={`text-sm font-semibold ${projectedROI >= 0 ? "text-green-600" : "text-red-600"}`}>
              {projectedROI.toFixed(1)}%
            </p>
          </div>
        </div>
        {predictedRoi !== null && (
          <p className="text-xs text-slate-500 text-center mt-2">
            Predicted: {predictedRoi.toFixed(1)}% | Variance: {(projectedROI - predictedRoi).toFixed(1)}%
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-slate-700 hover:text-slate-900 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Recording...
            </>
          ) : (
            "Record Sale"
          )}
        </button>
      </div>
    </form>
  )
}

export default function PortfolioPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [stats, setStats] = useState<PortfolioStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Purchases state
  const [purchases, setPurchases] = useState<PurchaseListItem[]>([])
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])

  // Modal state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<PurchaseListItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletePurchaseInfo, setDeletePurchaseInfo] = useState<string>("")
  const [isDeleting, setIsDeleting] = useState(false)

  // Purchase details state (for expansion)
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null)
  const [purchaseDetails, setPurchaseDetails] = useState<PortfolioSummary | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [showSaleForm, setShowSaleForm] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch purchases
  const fetchPurchases = async () => {
    try {
      setIsLoadingPurchases(true)
      const response = await authFetch("/api/portfolio")
      if (!response.ok) {
        throw new Error("Failed to fetch purchases")
      }
      const result = await response.json()
      setPurchases(result.data || [])
    } catch (err) {
      console.error("[Portfolio] Error fetching purchases:", err)
    } finally {
      setIsLoadingPurchases(false)
    }
  }

  // Fetch properties for dropdown
  const fetchProperties = async () => {
    try {
      const response = await authFetch("/api/properties")
      if (!response.ok) {
        throw new Error("Failed to fetch properties")
      }
      const result = await response.json()
      const transformedProperties: Property[] = (result.data || []).map((p: {
        id: string
        parcel_id?: string | null
        address?: string | null
        counties?: {
          county_name?: string
          state_code?: string
        } | null
      }) => ({
        id: p.id,
        parcel_id: p.parcel_id || null,
        address: p.address || null,
        county: p.counties?.county_name || "Unknown",
        state: p.counties?.state_code || "Unknown",
      }))
      setProperties(transformedProperties)
    } catch (err) {
      console.error("[Portfolio] Error fetching properties:", err)
    }
  }

  // Fetch purchases and properties when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchPurchases()
      fetchProperties()
    }
  }, [isAuthenticated])

  // Handle add purchase
  const handleAddPurchase = () => {
    setEditingPurchase(null)
    setShowPurchaseModal(true)
  }

  // Handle edit purchase
  const handleEditPurchase = (purchase: PurchaseListItem) => {
    setEditingPurchase(purchase)
    setShowPurchaseModal(true)
  }

  // Handle submit purchase (create or update)
  const handleSubmitPurchase = async (formData: PortfolioPurchaseFormData) => {
    try {
      setIsSubmitting(true)

      const payload = {
        property_id: formData.property_id,
        purchase_date: formData.purchase_date,
        purchase_price: formData.purchase_price,
        closing_costs: formData.closing_costs,
        total_acquisition_cost: formData.purchase_price + formData.closing_costs,
        predicted_roi: formData.predicted_roi,
        notes: formData.notes,
        status: "active" as PurchaseStatus,
      }

      if (editingPurchase) {
        // Update existing purchase
        const response = await authPatch(`/api/portfolio/${editingPurchase.id}`, payload)
        if (!response.ok) {
          throw new Error("Failed to update purchase")
        }
      } else {
        // Create new purchase
        const response = await authPost("/api/portfolio", payload)
        if (!response.ok) {
          throw new Error("Failed to create purchase")
        }
      }

      // Refresh data
      await fetchPurchases()
      await fetchStats()

      // Close modal
      setShowPurchaseModal(false)
      setEditingPurchase(null)
    } catch (err) {
      console.error("[Portfolio] Error submitting purchase:", err)
      alert(editingPurchase ? "Failed to update purchase" : "Failed to create purchase")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete purchase
  const handleDeleteClick = (purchase: PurchaseListItem) => {
    const propertyInfo = purchase.properties?.address ||
      purchase.properties?.parcel_id ||
      "this property"
    setDeletePurchaseInfo(propertyInfo)
    setDeleteConfirmId(purchase.id)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return

    try {
      setIsDeleting(true)
      const response = await authDelete(`/api/portfolio/${deleteConfirmId}`)
      if (!response.ok) {
        throw new Error("Failed to delete purchase")
      }

      // Refresh data
      await fetchPurchases()
      await fetchStats()

      // Close modal
      setDeleteConfirmId(null)
      setDeletePurchaseInfo("")
    } catch (err) {
      console.error("[Portfolio] Error deleting purchase:", err)
      alert("Failed to delete purchase")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null)
    setDeletePurchaseInfo("")
  }

  // Fetch purchase details (rehab expenses, sale info)
  const fetchPurchaseDetails = async (purchaseId: string) => {
    try {
      setIsLoadingDetails(true)
      const response = await authFetch(`/api/portfolio/${purchaseId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch purchase details")
      }
      const result = await response.json()
      setPurchaseDetails(result.data)
    } catch (err) {
      console.error("[Portfolio] Error fetching purchase details:", err)
      alert("Failed to load purchase details")
    } finally {
      setIsLoadingDetails(false)
    }
  }

  // Toggle purchase details expansion
  const handleToggleExpand = async (purchaseId: string) => {
    if (expandedPurchaseId === purchaseId) {
      // Collapse
      setExpandedPurchaseId(null)
      setPurchaseDetails(null)
      setShowSaleForm(false)
    } else {
      // Expand and fetch details
      setExpandedPurchaseId(purchaseId)
      setShowSaleForm(false)
      await fetchPurchaseDetails(purchaseId)
    }
  }

  // Handle rehab expense added
  const handleRehabExpenseAdded = async () => {
    if (expandedPurchaseId) {
      await fetchPurchaseDetails(expandedPurchaseId)
      await fetchStats()
    }
  }

  // Handle rehab expense deleted
  const handleRehabExpenseDeleted = async (expenseId: string) => {
    if (!expandedPurchaseId) return

    try {
      const response = await authDelete(`/api/portfolio/${expandedPurchaseId}/rehab/${expenseId}`)
      if (!response.ok) {
        throw new Error("Failed to delete rehab expense")
      }

      // Refresh details and stats
      await fetchPurchaseDetails(expandedPurchaseId)
      await fetchStats()
      await fetchPurchases()
    } catch (err) {
      console.error("[Portfolio] Error deleting rehab expense:", err)
      alert("Failed to delete rehab expense")
    }
  }

  // Handle sale recorded
  const handleSaleRecorded = async () => {
    if (expandedPurchaseId) {
      await fetchPurchaseDetails(expandedPurchaseId)
      await fetchStats()
      await fetchPurchases()
      setShowSaleForm(false)
    }
  }

  // Handle sale deleted (un-sell)
  const handleDeleteSale = async () => {
    if (!expandedPurchaseId) return

    if (!confirm("Are you sure you want to remove this sale record?")) {
      return
    }

    try {
      const response = await authDelete(`/api/portfolio/${expandedPurchaseId}/sale`)
      if (!response.ok) {
        throw new Error("Failed to delete sale")
      }

      // Refresh details and stats
      await fetchPurchaseDetails(expandedPurchaseId)
      await fetchStats()
      await fetchPurchases()
    } catch (err) {
      console.error("[Portfolio] Error deleting sale:", err)
      alert("Failed to delete sale")
    }
  }

  // Fetch stats function (moved from useEffect)
  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/portfolio/stats")
      if (!response.ok) {
        throw new Error("Failed to fetch portfolio stats")
      }

      const result = await response.json()
      setStats(result.data)
    } catch (err) {
      console.error("[Portfolio] Error fetching stats:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch portfolio stats on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // Export to CSV function
  const exportToCSV = () => {
    // CSV header
    const headers = [
      "Property Address",
      "Parcel ID",
      "County",
      "State",
      "Purchase Date",
      "Purchase Price",
      "Closing Costs",
      "Total Acquisition Cost",
      "Predicted ROI (%)",
      "Status",
      "Notes"
    ]

    // CSV rows from purchases
    const rows = purchases.map(purchase => {
      const propertyAddress = purchase.properties?.address || "N/A"
      const parcelId = purchase.properties?.parcel_id || "N/A"
      const county = purchase.properties?.counties?.county_name || "N/A"
      const state = purchase.properties?.counties?.state_code || "N/A"
      const purchaseDate = new Date(purchase.purchase_date).toLocaleDateString()
      const predictedROI = purchase.predicted_roi !== null ? purchase.predicted_roi.toFixed(1) : "N/A"
      const notes = purchase.notes || ""

      return [
        propertyAddress,
        parcelId,
        county,
        state,
        purchaseDate,
        purchase.purchase_price.toFixed(2),
        purchase.closing_costs.toFixed(2),
        purchase.total_acquisition_cost.toFixed(2),
        predictedROI,
        purchase.status,
        notes
      ]
    })

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n")

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0]
    link.setAttribute("download", `portfolio_${timestamp}.csv`)

    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Format percentage
  const formatPercentage = (value: number | null): string => {
    if (value === null) return "N/A"
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Investment Portfolio
          </h1>
          <p className="text-slate-600">
            Track your purchased properties, rehab costs, and actual ROI performance
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading portfolio data...</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <ErrorState message={error} />
        )}

        {/* Content */}
        {!isLoading && !error && stats && (
          <>
            {/* Show empty state if no properties */}
            {stats.totalProperties === 0 ? (
              <EmptyState onAddPurchase={handleAddPurchase} />
            ) : (
              <>
                {/* Stats grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <StatCard
                    title="Total Properties"
                    value={stats.totalProperties}
                    subtitle={`${stats.activeProperties} active, ${stats.soldProperties} sold`}
                    icon={<Building2 className="h-5 w-5" />}
                    color="bg-blue-500"
                  />

                  <StatCard
                    title="Total Invested"
                    value={formatCurrency(stats.totalInvested)}
                    subtitle="Acquisition + Rehab"
                    icon={<DollarSign className="h-5 w-5" />}
                    color="bg-purple-500"
                  />

                  <StatCard
                    title="Total Returns"
                    value={formatCurrency(stats.totalReturns)}
                    subtitle={`Profit: ${formatCurrency(stats.totalProfit)}`}
                    icon={<TrendingUp className="h-5 w-5" />}
                    color={stats.totalProfit >= 0 ? "bg-green-500" : "bg-red-500"}
                  />

                  <StatCard
                    title="Average ROI"
                    value={formatPercentage(stats.averageROI)}
                    subtitle={stats.soldProperties > 0 ? `Based on ${stats.soldProperties} sold` : "No sales yet"}
                    icon={<BarChart3 className="h-5 w-5" />}
                    color="bg-amber-500"
                  />
                </div>

                {/* Performance metrics */}
                <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">
                    Performance Metrics
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Avg Purchase Price</p>
                      <p className="text-xl font-semibold text-slate-900">
                        {stats.averagePurchasePrice !== null
                          ? formatCurrency(stats.averagePurchasePrice)
                          : "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Avg Rehab Cost</p>
                      <p className="text-xl font-semibold text-slate-900">
                        {stats.averageRehabCost !== null
                          ? formatCurrency(stats.averageRehabCost)
                          : "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Avg Sale Price</p>
                      <p className="text-xl font-semibold text-slate-900">
                        {stats.averageSalePrice !== null
                          ? formatCurrency(stats.averageSalePrice)
                          : "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Avg Holding Period</p>
                      <p className="text-xl font-semibold text-slate-900">
                        {stats.averageHoldingDays !== null
                          ? `${Math.round(stats.averageHoldingDays)} days`
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prediction accuracy */}
                {stats.avgPredictedROI !== null && stats.avgActualROI !== null && (
                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                      ROI Prediction Accuracy
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Predicted ROI</p>
                        <p className="text-xl font-semibold text-slate-900">
                          {formatPercentage(stats.avgPredictedROI)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-600 mb-1">Actual ROI</p>
                        <p className="text-xl font-semibold text-slate-900">
                          {formatPercentage(stats.avgActualROI)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-600 mb-1">Variance</p>
                        <p className={`text-xl font-semibold ${
                          stats.roiVariance !== null && stats.roiVariance >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}>
                          {stats.roiVariance !== null
                            ? `${stats.roiVariance >= 0 ? "+" : ""}${formatPercentage(stats.roiVariance)}`
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-slate-500 mt-4">
                      {stats.roiVariance !== null && stats.roiVariance >= 0
                        ? "Your properties are performing better than predicted! 🎉"
                        : stats.roiVariance !== null && stats.roiVariance < 0
                        ? "Your properties are performing below predictions. Review your analysis criteria."
                        : ""}
                    </p>
                  </div>
                )}

                {/* Purchases List */}
                <div className="mt-8 bg-white rounded-lg border border-slate-200">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Portfolio Properties
                    </h2>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={exportToCSV}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                      </button>
                      <button
                        onClick={handleAddPurchase}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Add Purchase
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  {isLoadingPurchases ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading purchases...</span>
                      </div>
                    </div>
                  ) : purchases.length === 0 ? (
                    <div className="p-12 text-center">
                      <p className="text-slate-600">No purchases found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="w-8"></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Property
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Purchase Date
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Purchase Price
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Total Invested
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {purchases.map((purchase) => {
                            const propertyDisplay = purchase.properties?.address ||
                              purchase.properties?.parcel_id ||
                              "Unknown Property"
                            const locationDisplay = purchase.properties?.counties
                              ? `${purchase.properties.counties.county_name}, ${purchase.properties.counties.state_code}`
                              : ""
                            const isExpanded = expandedPurchaseId === purchase.id

                            return (
                              <>
                                <tr
                                  key={purchase.id}
                                  className={`hover:bg-slate-50 cursor-pointer ${isExpanded ? "bg-slate-50" : ""}`}
                                  onClick={() => handleToggleExpand(purchase.id)}
                                >
                                  <td className="px-3 py-4 text-slate-400">
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-start gap-3">
                                      <div className="p-2 bg-blue-100 rounded-lg">
                                        <Building2 className="h-4 w-4 text-blue-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-slate-900">
                                          {propertyDisplay}
                                        </p>
                                        {locationDisplay && (
                                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                            <MapPin className="h-3 w-3" />
                                            {locationDisplay}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-slate-700">
                                      <Calendar className="h-4 w-4 text-slate-400" />
                                      {new Date(purchase.purchase_date).toLocaleDateString()}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                                    ${purchase.purchase_price.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 text-right font-semibold text-slate-900">
                                    ${purchase.total_acquisition_cost.toLocaleString()}
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      (+ rehab costs)
                                    </p>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                      purchase.status === "active"
                                        ? "bg-green-100 text-green-700"
                                        : purchase.status === "sold"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-slate-100 text-slate-700"
                                    }`}>
                                      {purchase.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => handleEditPurchase(purchase)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                                        title="Edit"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteClick(purchase)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Expanded Details Row */}
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={7} className="px-6 py-6 bg-slate-50">
                                      {isLoadingDetails ? (
                                        <div className="flex items-center justify-center py-8">
                                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                          <span className="ml-2 text-slate-600">Loading details...</span>
                                        </div>
                                      ) : purchaseDetails ? (
                                        <div className="space-y-6">
                                          {/* Cost Breakdown */}
                                          <div className="bg-white p-4 rounded-lg border border-slate-200">
                                            <h3 className="text-sm font-semibold text-slate-900 mb-3">Cost Breakdown</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                              <div>
                                                <p className="text-xs text-slate-600">Purchase Price</p>
                                                <p className="text-lg font-semibold text-slate-900">
                                                  ${purchaseDetails.purchase.purchase_price.toLocaleString()}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-slate-600">Closing Costs</p>
                                                <p className="text-lg font-semibold text-slate-900">
                                                  ${purchaseDetails.purchase.closing_costs.toLocaleString()}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-slate-600">Rehab Costs</p>
                                                <p className="text-lg font-semibold text-orange-600">
                                                  ${purchaseDetails.totalRehabCost.toLocaleString()}
                                                </p>
                                              </div>
                                              <div className="bg-blue-50 p-2 rounded">
                                                <p className="text-xs text-blue-600 font-medium">Total Invested</p>
                                                <p className="text-xl font-bold text-blue-900">
                                                  ${purchaseDetails.totalInvested.toLocaleString()}
                                                </p>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Rehab Expenses Section */}
                                          <div>
                                            <h3 className="text-sm font-semibold text-slate-900 mb-3">Rehab Expenses</h3>

                                            {/* Add Rehab Expense Form */}
                                            {purchase.status === "active" && (
                                              <div className="mb-4">
                                                <RehabExpenseForm
                                                  purchaseId={purchase.id}
                                                  onAdded={handleRehabExpenseAdded}
                                                />
                                              </div>
                                            )}

                                            {/* Rehab Expenses List */}
                                            {purchaseDetails.rehabExpenses.length > 0 ? (
                                              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                                <table className="w-full">
                                                  <thead className="bg-slate-50">
                                                    <tr>
                                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Description</th>
                                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Category</th>
                                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Vendor</th>
                                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Date</th>
                                                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Cost</th>
                                                      <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Actions</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-200">
                                                    {purchaseDetails.rehabExpenses.map((expense) => (
                                                      <tr key={expense.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 text-sm text-slate-900">{expense.description}</td>
                                                        <td className="px-4 py-3">
                                                          {expense.category && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                                                              <Tag className="h-3 w-3" />
                                                              {expense.category}
                                                            </span>
                                                          )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-600">{expense.vendor_name || "-"}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                          {new Date(expense.expense_date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                                                          ${expense.cost.toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                          {purchase.status === "active" && (
                                                            <button
                                                              onClick={() => handleRehabExpenseDeleted(expense.id)}
                                                              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                              title="Delete expense"
                                                            >
                                                              <Trash2 className="h-4 w-4" />
                                                            </button>
                                                          )}
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                  <tfoot className="bg-slate-50">
                                                    <tr>
                                                      <td colSpan={4} className="px-4 py-2 text-right text-xs font-semibold text-slate-700">
                                                        Total Rehab Costs:
                                                      </td>
                                                      <td className="px-4 py-2 text-right text-sm font-bold text-orange-600">
                                                        ${purchaseDetails.totalRehabCost.toLocaleString()}
                                                      </td>
                                                      <td></td>
                                                    </tr>
                                                  </tfoot>
                                                </table>
                                              </div>
                                            ) : (
                                              <p className="text-sm text-slate-500 italic">No rehab expenses recorded yet</p>
                                            )}
                                          </div>

                                          {/* Sale Information Section */}
                                          <div>
                                            <h3 className="text-sm font-semibold text-slate-900 mb-3">Sale Information</h3>

                                            {purchaseDetails.sale ? (
                                              <div className="bg-white p-4 rounded-lg border border-green-200">
                                                <div className="flex items-start justify-between mb-4">
                                                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div>
                                                      <p className="text-xs text-slate-600">Sale Price</p>
                                                      <p className="text-lg font-semibold text-slate-900">
                                                        ${purchaseDetails.sale.sale_price.toLocaleString()}
                                                      </p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs text-slate-600">Net Proceeds</p>
                                                      <p className="text-lg font-semibold text-green-600">
                                                        ${purchaseDetails.sale.net_proceeds.toLocaleString()}
                                                      </p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs text-slate-600">Gross Profit</p>
                                                      <p className={`text-lg font-semibold ${
                                                        purchaseDetails.grossProfit! >= 0 ? "text-green-600" : "text-red-600"
                                                      }`}>
                                                        ${purchaseDetails.grossProfit!.toLocaleString()}
                                                      </p>
                                                    </div>
                                                    <div className="bg-green-50 p-2 rounded">
                                                      <p className="text-xs text-green-600 font-medium">Actual ROI</p>
                                                      <p className={`text-xl font-bold ${
                                                        purchaseDetails.actualROI! >= 0 ? "text-green-900" : "text-red-900"
                                                      }`}>
                                                        {purchaseDetails.actualROI!.toFixed(1)}%
                                                      </p>
                                                      {purchaseDetails.purchase.predicted_roi !== null && (
                                                        <p className="text-xs text-slate-600 mt-1">
                                                          Predicted: {purchaseDetails.purchase.predicted_roi.toFixed(1)}%
                                                        </p>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <button
                                                    onClick={handleDeleteSale}
                                                    className="ml-4 p-2 text-slate-400 hover:text-red-600 transition-colors"
                                                    title="Remove sale"
                                                  >
                                                    <X className="h-5 w-5" />
                                                  </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                  <div>
                                                    <p className="text-xs text-slate-600">Sale Date</p>
                                                    <p className="text-slate-900">
                                                      {new Date(purchaseDetails.sale.sale_date).toLocaleDateString()}
                                                    </p>
                                                  </div>
                                                  {purchaseDetails.sale.buyer_name && (
                                                    <div>
                                                      <p className="text-xs text-slate-600">Buyer</p>
                                                      <p className="text-slate-900">{purchaseDetails.sale.buyer_name}</p>
                                                    </div>
                                                  )}
                                                  {purchaseDetails.sale.sale_type && (
                                                    <div>
                                                      <p className="text-xs text-slate-600">Sale Type</p>
                                                      <p className="text-slate-900">{purchaseDetails.sale.sale_type}</p>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ) : (
                                              <>
                                                {showSaleForm ? (
                                                  <SaleForm
                                                    purchaseId={purchase.id}
                                                    totalInvested={purchaseDetails.totalInvested}
                                                    predictedRoi={purchaseDetails.purchase.predicted_roi}
                                                    onRecorded={handleSaleRecorded}
                                                    onCancel={() => setShowSaleForm(false)}
                                                  />
                                                ) : (
                                                  <button
                                                    onClick={() => setShowSaleForm(true)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                  >
                                                    <Receipt className="h-4 w-4" />
                                                    Mark as Sold
                                                  </button>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-slate-600 text-center py-4">No details available</p>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Purchase Form Modal */}
      <PurchaseFormModal
        isOpen={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false)
          setEditingPurchase(null)
        }}
        onSubmit={handleSubmitPurchase}
        properties={properties}
        editData={editingPurchase}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirmId !== null}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        purchaseInfo={deletePurchaseInfo}
        isDeleting={isDeleting}
      />
    </div>
  )
}
