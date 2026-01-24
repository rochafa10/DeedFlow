import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * POST /api/portfolio/[id]/rehab
 * Creates a new rehab expense for a purchase
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

  // Only admin and analyst can add rehab expenses
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot add rehab expenses.")
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

    // Verify purchase exists
    const { data: purchase, error: purchaseError } = await supabase
      .from("portfolio_purchases")
      .select("id")
      .eq("id", purchaseId)
      .is("deleted_at", null)
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: "Portfolio purchase not found" },
        { status: 404 }
      )
    }

    // Create rehab expense
    const { data, error } = await supabase
      .from("portfolio_rehab_expenses")
      .insert({
        purchase_id: purchaseId,
        description: body.description,
        cost: body.cost,
        expense_date: body.expense_date,
        category: body.category || null,
        vendor_name: body.vendor_name || null,
        receipt_url: body.receipt_url || null,
      })
      .select()
      .single()

    if (error) {
      console.error("[API Portfolio Rehab] Create error:", error)
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      message: "Rehab expense added successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Portfolio Rehab] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
