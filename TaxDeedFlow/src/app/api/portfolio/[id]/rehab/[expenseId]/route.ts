import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { createServerClient } from "@/lib/supabase/client"

/**
 * DELETE /api/portfolio/[id]/rehab/[expenseId]
 * Soft-deletes a rehab expense
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  const expenseId = params.expenseId

  // Validate authentication
  const authResult = await validateApiAuth(request)
  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can delete rehab expenses
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot delete rehab expenses.")
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Verify expense exists
    const { data: existing, error: existingError } = await supabase
      .from("portfolio_rehab_expenses")
      .select("id")
      .eq("id", expenseId)
      .is("deleted_at", null)
      .single()

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Rehab expense not found" },
        { status: 404 }
      )
    }

    // Soft delete
    const { error } = await supabase
      .from("portfolio_rehab_expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", expenseId)

    if (error) {
      console.error("[API Portfolio Rehab] Delete error:", error)
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Rehab expense deleted successfully",
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
