import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/portfolio/[id]
 * Returns a single portfolio purchase with all related data (rehab expenses, sale info)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const purchaseId = params.id

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Fetch portfolio purchase with related property data
    const { data: purchase, error: purchaseError } = await supabase
      .from("portfolio_purchases")
      .select(`
        *,
        properties (
          id,
          parcel_id,
          address,
          counties (
            id,
            county_name,
            state_code
          )
        )
      `)
      .eq("id", purchaseId)
      .is("deleted_at", null)
      .single()

    if (purchaseError) {
      if (purchaseError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Portfolio purchase not found" },
          { status: 404 }
        )
      }
      console.error("[API Portfolio Detail] Database error:", purchaseError)
      return NextResponse.json(
        { error: "Database error", message: purchaseError.message },
        { status: 500 }
      )
    }

    // Fetch rehab expenses for this purchase
    const { data: rehabExpenses, error: rehabError } = await supabase
      .from("portfolio_rehab_expenses")
      .select("*")
      .eq("purchase_id", purchaseId)
      .is("deleted_at", null)
      .order("expense_date", { ascending: false })

    if (rehabError) {
      console.error("[API Portfolio Detail] Rehab expenses error:", rehabError)
      // Continue even if rehab fetch fails - return empty array
    }

    // Fetch sale data if exists (purchase_id is unique in portfolio_sales)
    const { data: sale, error: saleError } = await supabase
      .from("portfolio_sales")
      .select("*")
      .eq("purchase_id", purchaseId)
      .is("deleted_at", null)
      .single()

    if (saleError && saleError.code !== "PGRST116") {
      console.error("[API Portfolio Detail] Sale data error:", saleError)
      // Continue even if sale fetch fails - just means no sale yet
    }

    // Calculate total rehab cost
    const totalRehabCost = (rehabExpenses || []).reduce(
      (sum, expense) => sum + Number(expense.cost || 0),
      0
    )

    // Calculate total invested
    const totalInvested = Number(purchase.total_acquisition_cost || 0) + totalRehabCost

    // Calculate gross profit and actual ROI if sold
    let grossProfit = null
    let actualROI = null
    let roiVariance = null

    if (sale) {
      const netProceeds = Number(sale.net_proceeds || 0)
      grossProfit = netProceeds - totalInvested

      if (totalInvested > 0) {
        actualROI = (grossProfit / totalInvested) * 100

        // Calculate variance from predicted ROI
        if (purchase.predicted_roi !== null) {
          roiVariance = actualROI - Number(purchase.predicted_roi)
        }
      }
    }

    // Transform to frontend-friendly format (PortfolioSummary)
    const transformedData = {
      // Purchase information
      purchase: {
        id: purchase.id,
        property_id: purchase.property_id,
        user_id: purchase.user_id,
        purchase_date: purchase.purchase_date,
        purchase_price: Number(purchase.purchase_price),
        closing_costs: Number(purchase.closing_costs || 0),
        total_acquisition_cost: Number(purchase.total_acquisition_cost),
        predicted_roi: purchase.predicted_roi ? Number(purchase.predicted_roi) : null,
        notes: purchase.notes,
        status: purchase.status,
        deleted_at: purchase.deleted_at,
        created_at: purchase.created_at,
        updated_at: purchase.updated_at,
      },

      // Related property details
      property: purchase.properties ? {
        id: purchase.properties.id,
        parcel_id: purchase.properties.parcel_id,
        address: purchase.properties.address,
        county_name: purchase.properties.counties?.county_name || null,
        state: purchase.properties.counties?.state_code || null,
      } : null,

      // Rehab expenses
      rehabExpenses: (rehabExpenses || []).map(expense => ({
        id: expense.id,
        purchase_id: expense.purchase_id,
        description: expense.description,
        cost: Number(expense.cost),
        expense_date: expense.expense_date,
        category: expense.category,
        receipt_url: expense.receipt_url,
        vendor_name: expense.vendor_name,
        deleted_at: expense.deleted_at,
        created_at: expense.created_at,
        updated_at: expense.updated_at,
      })),
      totalRehabCost,

      // Sale information (if sold)
      sale: sale ? {
        id: sale.id,
        purchase_id: sale.purchase_id,
        sale_price: Number(sale.sale_price),
        sale_date: sale.sale_date,
        closing_costs: Number(sale.closing_costs || 0),
        net_proceeds: Number(sale.net_proceeds),
        actual_roi: sale.actual_roi ? Number(sale.actual_roi) : actualROI,
        buyer_name: sale.buyer_name,
        sale_type: sale.sale_type,
        notes: sale.notes,
        deleted_at: sale.deleted_at,
        created_at: sale.created_at,
        updated_at: sale.updated_at,
      } : null,

      // Calculated totals
      totalInvested,
      grossProfit,
      actualROI,
      roiVariance,
    }

    return NextResponse.json({
      data: transformedData,
      source: "database",
    })
  } catch (error) {
    console.error("[API Portfolio Detail] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/portfolio/[id]
 * Updates a portfolio purchase - requires authentication and CSRF validation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const purchaseId = params.id

  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Portfolio Detail] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can update portfolio purchases
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot update portfolio purchases.")
  }

  try {
    const body = await request.json()

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // First, verify the purchase exists and is not deleted
    const { data: existing, error: existingError } = await supabase
      .from("portfolio_purchases")
      .select("id, user_id")
      .eq("id", purchaseId)
      .is("deleted_at", null)
      .single()

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Portfolio purchase not found" },
        { status: 404 }
      )
    }

    // Update the purchase
    const { data, error } = await supabase
      .from("portfolio_purchases")
      .update({
        purchase_date: body.purchase_date,
        purchase_price: body.purchase_price,
        closing_costs: body.closing_costs,
        predicted_roi: body.predicted_roi,
        notes: body.notes,
        status: body.status,
      })
      .eq("id", purchaseId)
      .select(`
        *,
        properties (
          id,
          parcel_id,
          address,
          counties (
            county_name,
            state_code
          )
        )
      `)
      .single()

    if (error) {
      console.error("[API Portfolio Detail] Update error:", error)
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      message: "Portfolio purchase updated successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Portfolio Detail] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/portfolio/[id]
 * Soft-deletes a portfolio purchase - requires authentication
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const purchaseId = params.id

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can delete portfolio purchases
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot delete portfolio purchases.")
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // First, verify the purchase exists and is not already deleted
    const { data: existing, error: existingError } = await supabase
      .from("portfolio_purchases")
      .select("id, user_id, status")
      .eq("id", purchaseId)
      .is("deleted_at", null)
      .single()

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Portfolio purchase not found" },
        { status: 404 }
      )
    }

    // Soft delete by setting deleted_at timestamp
    const { error } = await supabase
      .from("portfolio_purchases")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", purchaseId)

    if (error) {
      console.error("[API Portfolio Detail] Delete error:", error)
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Portfolio purchase deleted successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Portfolio Detail] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
