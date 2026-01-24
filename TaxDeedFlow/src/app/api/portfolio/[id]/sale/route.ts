import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * POST /api/portfolio/[id]/sale
 * Records a sale for a purchase
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const purchaseId = params.id

  // CSRF Protection
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)
  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can record sales
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot record sales.")
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

    // Verify purchase exists and get total invested
    const { data: purchase, error: purchaseError } = await supabase
      .from("portfolio_purchases")
      .select(`
        id,
        total_acquisition_cost
      `)
      .eq("id", purchaseId)
      .is("deleted_at", null)
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: "Portfolio purchase not found" },
        { status: 404 }
      )
    }

    // Get total rehab costs
    const { data: rehabExpenses } = await supabase
      .from("portfolio_rehab_expenses")
      .select("cost")
      .eq("purchase_id", purchaseId)
      .is("deleted_at", null)

    const totalRehabCost = (rehabExpenses || []).reduce(
      (sum, expense) => sum + Number(expense.cost || 0),
      0
    )

    const totalInvested = Number(purchase.total_acquisition_cost) + totalRehabCost
    const netProceeds = Number(body.sale_price) - Number(body.closing_costs || 0)
    const grossProfit = netProceeds - totalInvested
    const actualROI = totalInvested > 0 ? (grossProfit / totalInvested) * 100 : 0

    // Create sale record
    const { data, error } = await supabase
      .from("portfolio_sales")
      .insert({
        purchase_id: purchaseId,
        sale_price: body.sale_price,
        sale_date: body.sale_date,
        closing_costs: body.closing_costs || 0,
        actual_roi: actualROI,
        buyer_name: body.buyer_name || null,
        sale_type: body.sale_type || null,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error("[API Portfolio Sale] Create error:", error)
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      message: "Sale recorded successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Portfolio Sale] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/portfolio/[id]/sale
 * Removes sale record (to un-sell a property)
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

  // Only admin and analyst can delete sales
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot delete sales.")
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Soft delete sale record
    const { error } = await supabase
      .from("portfolio_sales")
      .update({ deleted_at: new Date().toISOString() })
      .eq("purchase_id", purchaseId)
      .is("deleted_at", null)

    if (error) {
      console.error("[API Portfolio Sale] Delete error:", error)
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Sale removed successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Portfolio Sale] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
