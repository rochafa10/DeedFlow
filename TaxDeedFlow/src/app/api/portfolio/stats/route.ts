import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import type { PortfolioStats } from "@/types/portfolio"

// Mock data for development when Supabase is not configured or no data exists
const MOCK_DATA: PortfolioStats = {
  // Property counts
  totalProperties: 5,
  activeProperties: 3,
  soldProperties: 2,

  // Financial aggregates
  totalInvested: 125000, // $125k total invested
  totalReturns: 95000, // $95k in returns so far
  totalProfit: -30000, // -$30k (some properties still active)
  averageROI: 22.5, // 22.5% average ROI on sold properties

  // Performance metrics
  averagePurchasePrice: 18500,
  averageRehabCost: 6500,
  averageSalePrice: 47500,
  averageHoldingDays: 145,

  // Prediction accuracy
  avgPredictedROI: 25.0,
  avgActualROI: 22.5,
  roiVariance: -2.5, // Actual was 2.5% less than predicted
}

export async function GET() {
  try {
    const supabase = createServerClient()

    // If Supabase is not configured, return mock data
    if (!supabase) {
      console.log("[API] Supabase not configured, returning mock portfolio stats")
      return NextResponse.json({
        data: MOCK_DATA,
        source: "mock",
      })
    }

    // Fetch real data from Supabase
    const [
      purchasesResult,
      activePurchasesResult,
      soldPurchasesResult,
      rehabExpensesResult,
      salesResult,
      soldPurchasesDetailResult,
    ] = await Promise.all([
      // Count total purchases
      supabase
        .from("portfolio_purchases")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null),

      // Count active purchases
      supabase
        .from("portfolio_purchases")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .is("deleted_at", null),

      // Count sold purchases
      supabase
        .from("portfolio_purchases")
        .select("*", { count: "exact", head: true })
        .eq("status", "sold")
        .is("deleted_at", null),

      // Sum total rehab expenses
      supabase
        .from("portfolio_rehab_expenses")
        .select("cost")
        .is("deleted_at", null),

      // Get all sales with net proceeds
      supabase
        .from("portfolio_sales")
        .select("net_proceeds, actual_roi, sale_date")
        .is("deleted_at", null),

      // Get sold purchases with details for performance metrics
      supabase
        .from("portfolio_purchases")
        .select(
          `
          id,
          purchase_price,
          total_acquisition_cost,
          purchase_date,
          predicted_roi,
          portfolio_sales!inner(
            sale_price,
            sale_date,
            net_proceeds,
            actual_roi
          ),
          portfolio_rehab_expenses(
            cost
          )
        `
        )
        .eq("status", "sold")
        .is("deleted_at", null),

      // Get all purchases for total invested calculation
      supabase
        .from("portfolio_purchases")
        .select(
          `
          total_acquisition_cost,
          portfolio_rehab_expenses(
            cost
          )
        `
        )
        .is("deleted_at", null),
    ])

    const totalProperties = purchasesResult.count ?? 0
    const activeProperties = activePurchasesResult.count ?? 0
    const soldProperties = soldPurchasesResult.count ?? 0

    // If no purchases exist, return mock data
    if (totalProperties === 0) {
      console.log("[API] No portfolio purchases found, returning mock data")
      return NextResponse.json({
        data: MOCK_DATA,
        source: "mock",
        reason: "no_data",
      })
    }

    // Calculate total invested (acquisition costs + rehab expenses)
    const allPurchases = soldPurchasesDetailResult.data ?? []
    const totalRehabCost =
      rehabExpensesResult.data?.reduce((sum, expense) => sum + (expense.cost ?? 0), 0) ?? 0

    const totalAcquisitionCost =
      allPurchases.reduce((sum, purchase) => sum + (purchase.total_acquisition_cost ?? 0), 0) ?? 0

    const totalInvested = totalAcquisitionCost + totalRehabCost

    // Calculate total returns (sum of net proceeds from sales)
    const sales = salesResult.data ?? []
    const totalReturns = sales.reduce((sum, sale) => sum + (sale.net_proceeds ?? 0), 0)

    // Calculate total profit
    const totalProfit = totalReturns - totalInvested

    // Calculate average ROI from sold properties
    const roiValues = sales.map((sale) => sale.actual_roi).filter((roi): roi is number => roi !== null)
    const averageROI = roiValues.length > 0 ? roiValues.reduce((sum, roi) => sum + roi, 0) / roiValues.length : null

    // Calculate performance metrics
    const soldPurchasesData = soldPurchasesDetailResult.data ?? []

    const avgPurchasePrice =
      soldPurchasesData.length > 0
        ? soldPurchasesData.reduce((sum, p) => sum + (p.purchase_price ?? 0), 0) / soldPurchasesData.length
        : null

    const avgRehabCost =
      soldPurchasesData.length > 0
        ? soldPurchasesData.reduce((sum, p) => {
            const rehabTotal = (p.portfolio_rehab_expenses ?? []).reduce((s, e) => s + (e.cost ?? 0), 0)
            return sum + rehabTotal
          }, 0) / soldPurchasesData.length
        : null

    const avgSalePrice =
      soldPurchasesData.length > 0
        ? soldPurchasesData.reduce((sum, p) => {
            const sale = Array.isArray(p.portfolio_sales) ? p.portfolio_sales[0] : p.portfolio_sales
            return sum + (sale?.sale_price ?? 0)
          }, 0) / soldPurchasesData.length
        : null

    // Calculate average holding days (purchase date to sale date)
    const holdingDays = soldPurchasesData
      .map((p) => {
        const sale = Array.isArray(p.portfolio_sales) ? p.portfolio_sales[0] : p.portfolio_sales
        if (!sale?.sale_date || !p.purchase_date) return null

        const purchaseDate = new Date(p.purchase_date)
        const saleDate = new Date(sale.sale_date)
        const diffTime = saleDate.getTime() - purchaseDate.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
      })
      .filter((days): days is number => days !== null)

    const avgHoldingDays = holdingDays.length > 0 ? holdingDays.reduce((sum, days) => sum + days, 0) / holdingDays.length : null

    // Calculate prediction accuracy
    const predictedROIs = soldPurchasesData
      .map((p) => p.predicted_roi)
      .filter((roi): roi is number => roi !== null)

    const avgPredictedROI =
      predictedROIs.length > 0 ? predictedROIs.reduce((sum, roi) => sum + roi, 0) / predictedROIs.length : null

    const actualROIs = soldPurchasesData
      .map((p) => {
        const sale = Array.isArray(p.portfolio_sales) ? p.portfolio_sales[0] : p.portfolio_sales
        return sale?.actual_roi
      })
      .filter((roi): roi is number => roi !== null)

    const avgActualROI = actualROIs.length > 0 ? actualROIs.reduce((sum, roi) => sum + roi, 0) / actualROIs.length : null

    const roiVariance = avgPredictedROI !== null && avgActualROI !== null ? avgActualROI - avgPredictedROI : null

    const data: PortfolioStats = {
      // Property counts
      totalProperties,
      activeProperties,
      soldProperties,

      // Financial aggregates
      totalInvested,
      totalReturns,
      totalProfit,
      averageROI,

      // Performance metrics
      averagePurchasePrice: avgPurchasePrice,
      averageRehabCost: avgRehabCost,
      averageSalePrice: avgSalePrice,
      averageHoldingDays: avgHoldingDays,

      // Prediction accuracy
      avgPredictedROI,
      avgActualROI,
      roiVariance,
    }

    return NextResponse.json({
      data,
      source: "supabase",
    })
  } catch (error) {
    console.error("[API] Error fetching portfolio stats:", error)

    // Return mock data on error for better development experience
    return NextResponse.json(
      {
        data: MOCK_DATA,
        source: "mock",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    )
  }
}
