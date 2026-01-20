"use client";

/**
 * Financial Dashboard Component
 *
 * Main container for the financial analysis UI, providing tabbed navigation
 * to overview, costs, returns, comparables, and calculator sections.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialSummary } from "./FinancialSummary";
import { InvestmentCalculator } from "./InvestmentCalculator";
import { CostBreakdownCard } from "./CostBreakdownCard";
import { ROIMetricsCard } from "./ROIMetricsCard";
import { InvestmentRecommendation } from "./InvestmentRecommendation";
import { CostPieChart } from "./charts/CostPieChart";
import { ProfitWaterfallChart } from "./charts/ProfitWaterfallChart";
import { ROIComparisonChart } from "./charts/ROIComparisonChart";
import { ComparablesScatterPlot } from "./charts/ComparablesScatterPlot";
import type {
  FinancialAnalysis,
  ComparableSale,
} from "@/lib/analysis/financial/types";

/** Calculator input values */
interface CalculatorValues {
  purchasePrice: number;
  estimatedARV: number;
  rehabBudget: number;
  holdingMonths: number;
}
import {
  Calculator,
  TrendingUp,
  DollarSign,
  BarChart3,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// Type Definitions
// ============================================

interface FinancialDashboardProps {
  /** Complete financial analysis data */
  analysis: FinancialAnalysis;
  /** Property ID for reference */
  propertyId: string;
  /** Callback when calculator parameters change */
  onRecalculate?: (params: CalculatorValues) => void;
  /** Optional additional class names */
  className?: string;
}

// ============================================
// Main Component
// ============================================

export function FinancialDashboard({
  analysis,
  propertyId,
  onRecalculate,
  className,
}: FinancialDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Extract data from analysis for components
  const { costs, revenue, metrics, recommendation, comparables, dataQuality } =
    analysis;

  // Convert comparables to array if it's an object with comparables property
  const comparablesList: ComparableSale[] = Array.isArray(comparables)
    ? comparables
    : comparables?.comparables || [];

  // Prepare costs data for charts
  const costData = {
    acquisition: costs?.acquisition?.totalAcquisition || 0,
    rehab: costs?.rehab?.totalRehab || 0,
    holding: costs?.holding?.totalHolding || 0,
    selling: costs?.selling?.totalSelling || 0,
    totalInvestment: costs?.grandTotal || costs?.totalCosts || 0,
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Recommendation Banner */}
      <InvestmentRecommendation
        recommendation={recommendation}
        dataQuality={dataQuality}
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Costs</span>
          </TabsTrigger>
          <TabsTrigger value="returns" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Returns</span>
          </TabsTrigger>
          <TabsTrigger value="comparables" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Comps</span>
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Calculator</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FinancialSummary analysis={analysis} />
            <CostPieChart costs={costData} />
          </div>
          <ProfitWaterfallChart
            costs={costData}
            arv={revenue?.sale?.estimatedARV || 0}
            netProfit={metrics?.netProfit || 0}
          />
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <CostBreakdownCard costs={costs} />
            <CostPieChart costs={costData} showLegend />
          </div>
        </TabsContent>

        {/* Returns Tab */}
        <TabsContent value="returns" className="space-y-6">
          <ROIMetricsCard metrics={metrics} />
          <div className="grid gap-6 md:grid-cols-2">
            <ROIComparisonChart
              roi={metrics?.roi || 0}
              annualizedRoi={metrics?.irr || 0}
            />
            <ProfitWaterfallChart
              costs={costData}
              arv={revenue?.sale?.estimatedARV || 0}
              netProfit={metrics?.netProfit || 0}
            />
          </div>
        </TabsContent>

        {/* Comparables Tab */}
        <TabsContent value="comparables" className="space-y-6">
          <ComparablesScatterPlot
            comparables={comparablesList}
            subjectSqft={revenue?.sale?.pricePerSqft ? undefined : 1500}
            subjectPrice={costs?.acquisition?.bidAmount}
          />
        </TabsContent>

        {/* Calculator Tab */}
        <TabsContent value="calculator">
          <InvestmentCalculator
            initialValues={{
              purchasePrice: costs?.acquisition?.bidAmount || 50000,
              estimatedARV: revenue?.sale?.estimatedARV || 150000,
              rehabBudget: costData.rehab || 30000,
              holdingMonths: costs?.holding?.holdingPeriodMonths || 6,
            }}
            onCalculate={onRecalculate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FinancialDashboard;
