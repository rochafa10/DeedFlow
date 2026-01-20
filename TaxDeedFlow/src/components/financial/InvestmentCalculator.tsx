"use client";

/**
 * Investment Calculator Component
 *
 * Interactive calculator for adjusting investment parameters and
 * viewing real-time return projections.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { useState, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, RefreshCw, Download, Share2 } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ============================================
// Local Type Definitions
// ============================================

/** Input values for the calculator */
interface CalculatorValues {
  purchasePrice: number;
  estimatedARV: number;
  rehabScope: "cosmetic" | "moderate" | "major" | "gut";
  rehabBudget: number;
  holdingMonths: number;
  useFinancing: boolean;
  downPaymentPercent: number;
  interestRate: number;
  closingCostPercent: number;
  sellingCostPercent: number;
}

/** Calculated results from the calculator */
interface CalculatorResults {
  totalInvestment: number;
  cashRequired: number;
  grossProfit: number;
  netProfit: number;
  roi: number;
  annualizedRoi: number;
  cashOnCash: number;
  priceToARV: number;
  profitMargin: number;
  breakEvenPrice: number;
  maxOffer70: number;
}

// ============================================
// Type Definitions
// ============================================

interface InvestmentCalculatorProps {
  /** Initial values for the calculator */
  initialValues?: Partial<CalculatorValues>;
  /** Callback when calculation is performed */
  onCalculate?: (values: CalculatorValues) => void;
  /** Optional additional class names */
  className?: string;
}

// ============================================
// Default Values
// ============================================

const DEFAULT_VALUES: CalculatorValues = {
  purchasePrice: 50000,
  estimatedARV: 150000,
  rehabScope: "moderate",
  rehabBudget: 30000,
  holdingMonths: 6,
  useFinancing: false,
  downPaymentPercent: 25,
  interestRate: 12,
  closingCostPercent: 3,
  sellingCostPercent: 8,
};

// ============================================
// Calculator Logic
// ============================================

/**
 * Calculate investment returns based on input values
 */
function calculateInvestmentReturns(values: CalculatorValues): CalculatorResults {
  const {
    purchasePrice,
    estimatedARV,
    rehabBudget,
    holdingMonths,
    useFinancing,
    downPaymentPercent,
    interestRate,
    closingCostPercent,
    sellingCostPercent,
  } = values;

  // Acquisition costs
  const closingCosts = purchasePrice * (closingCostPercent / 100);
  const totalAcquisition = purchasePrice + closingCosts;

  // Financing calculations
  let cashRequired = totalAcquisition + rehabBudget;
  let interestCosts = 0;

  if (useFinancing) {
    const loanAmount = purchasePrice * (1 - downPaymentPercent / 100);
    const monthlyRate = interestRate / 100 / 12;
    interestCosts = loanAmount * monthlyRate * holdingMonths;
    cashRequired =
      purchasePrice * (downPaymentPercent / 100) + closingCosts + rehabBudget;
  }

  // Holding costs (simplified estimate)
  const monthlyHolding = (purchasePrice * 0.015) / 12 + 200; // Taxes + insurance + utilities
  const totalHolding = monthlyHolding * holdingMonths + interestCosts;

  // Selling costs
  const sellingCosts = estimatedARV * (sellingCostPercent / 100);

  // Totals
  const totalInvestment =
    totalAcquisition + rehabBudget + totalHolding + sellingCosts;

  // Profit calculations
  const grossProfit = estimatedARV - purchasePrice - rehabBudget;
  const netProfit = estimatedARV - totalInvestment;

  // ROI calculations
  const roi = (netProfit / cashRequired) * 100;
  const annualizedRoi =
    (Math.pow(1 + netProfit / cashRequired, 12 / holdingMonths) - 1) * 100;
  const cashOnCash = useFinancing ? (netProfit / cashRequired) * 100 : roi;

  // Ratios
  const priceToARV = purchasePrice / estimatedARV;
  const profitMargin = (netProfit / totalInvestment) * 100;

  // Break-even
  const breakEvenPrice = totalInvestment;

  // 70% Rule max offer
  const maxOffer70 = estimatedARV * 0.7 - rehabBudget;

  return {
    totalInvestment,
    cashRequired,
    grossProfit,
    netProfit,
    roi,
    annualizedRoi,
    cashOnCash,
    priceToARV,
    profitMargin,
    breakEvenPrice,
    maxOffer70,
  };
}

// ============================================
// Sub-components
// ============================================

interface ResultCardProps {
  label: string;
  value: string;
  variant: "positive" | "negative" | "neutral";
}

function ResultCard({ label, value, variant }: ResultCardProps) {
  const variantClasses = {
    positive:
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    negative: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    neutral:
      "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
  };

  const textClasses = {
    positive: "text-green-700 dark:text-green-400",
    negative: "text-red-700 dark:text-red-400",
    neutral: "text-slate-900 dark:text-slate-100",
  };

  return (
    <div className={cn("p-3 rounded-lg border", variantClasses[variant])}>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn("text-lg font-bold", textClasses[variant])}>
        {value}
      </div>
    </div>
  );
}

function CalculatorResultsDisplay({
  results,
}: {
  results: CalculatorResults;
}) {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <ResultCard
          label="Total Investment"
          value={formatCurrency(results.totalInvestment)}
          variant="neutral"
        />
        <ResultCard
          label="Cash Required"
          value={formatCurrency(results.cashRequired)}
          variant="neutral"
        />
        <ResultCard
          label="Net Profit"
          value={formatCurrency(results.netProfit)}
          variant={results.netProfit > 0 ? "positive" : "negative"}
        />
        <ResultCard
          label="ROI"
          value={formatPercent(results.roi)}
          variant={
            results.roi > 20 ? "positive" : results.roi > 10 ? "neutral" : "negative"
          }
        />
      </div>

      {/* Detailed Metrics */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold">Investment Metrics</h4>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">
              Annualized ROI
            </span>
            <span className="font-medium">
              {formatPercent(results.annualizedRoi)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">
              Profit Margin
            </span>
            <span className="font-medium">
              {formatPercent(results.profitMargin)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">
              Price to ARV
            </span>
            <span
              className={cn(
                "font-medium",
                results.priceToARV < 0.7
                  ? "text-green-600"
                  : "text-orange-600"
              )}
            >
              {formatPercent(results.priceToARV * 100)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">
              Break-Even Price
            </span>
            <span className="font-medium">
              {formatCurrency(results.breakEvenPrice)}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">
              70% Rule Max Offer
            </span>
            <span className="text-lg font-bold text-blue-600">
              {formatCurrency(results.maxOffer70)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ARV x 70% - Rehab Costs = Max Purchase Price
          </p>
        </div>
      </div>

      {/* Verdict */}
      <div
        className={cn(
          "p-4 rounded-lg",
          results.roi >= 25
            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
            : results.roi >= 15
              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
        )}
      >
        <div className="font-semibold">
          {results.roi >= 25
            ? "Strong Investment Potential"
            : results.roi >= 15
              ? "Moderate Investment Potential"
              : "Proceed with Caution"}
        </div>
        <p className="text-sm mt-1 opacity-90">
          {results.roi >= 25
            ? `This deal offers ${formatPercent(results.roi)} ROI with ${formatCurrency(results.netProfit)} profit potential.`
            : results.roi >= 15
              ? "Returns are acceptable but consider negotiating a lower price."
              : "The numbers may not support this investment at current prices."}
        </p>
      </div>

      {/* Export Options */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function InvestmentCalculator({
  initialValues,
  onCalculate,
  className,
}: InvestmentCalculatorProps) {
  const [values, setValues] = useState<CalculatorValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });

  const [results, setResults] = useState<CalculatorResults | null>(null);

  const updateValue = useCallback(
    <K extends keyof CalculatorValues>(key: K, value: CalculatorValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const calculate = useCallback(() => {
    const calculated = calculateInvestmentReturns(values);
    setResults(calculated);
    onCalculate?.(values);
  }, [values, onCalculate]);

  const resetToDefaults = useCallback(() => {
    setValues({ ...DEFAULT_VALUES, ...initialValues });
    setResults(null);
  }, [initialValues]);

  // Auto-calculate on initial render if we have initial values
  useMemo(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      const calculated = calculateInvestmentReturns({
        ...DEFAULT_VALUES,
        ...initialValues,
      });
      setResults(calculated);
    }
  }, []);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Investment Calculator
        </CardTitle>
        <CardDescription>
          Adjust parameters to see how different scenarios affect your returns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Purchase Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">
                Purchase Details
              </h3>

              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Purchase Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    $
                  </span>
                  <Input
                    id="purchasePrice"
                    type="number"
                    value={values.purchasePrice}
                    onChange={(e) =>
                      updateValue("purchasePrice", Number(e.target.value))
                    }
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedARV">
                  Estimated ARV (After Repair Value)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    $
                  </span>
                  <Input
                    id="estimatedARV"
                    type="number"
                    value={values.estimatedARV}
                    onChange={(e) =>
                      updateValue("estimatedARV", Number(e.target.value))
                    }
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            {/* Rehab Costs */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">
                Rehabilitation
              </h3>

              <div className="space-y-2">
                <Label htmlFor="rehabScope">Rehab Scope</Label>
                <Select
                  value={values.rehabScope}
                  onValueChange={(val) =>
                    updateValue(
                      "rehabScope",
                      val as CalculatorValues["rehabScope"]
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cosmetic">
                      Cosmetic ($10-25/sqft)
                    </SelectItem>
                    <SelectItem value="moderate">
                      Moderate ($25-60/sqft)
                    </SelectItem>
                    <SelectItem value="major">Major ($50-100/sqft)</SelectItem>
                    <SelectItem value="gut">Gut Rehab ($80-175/sqft)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="rehabBudget">Rehab Budget</Label>
                  <span className="text-sm text-slate-500">
                    {formatCurrency(values.rehabBudget)}
                  </span>
                </div>
                <Slider
                  value={[values.rehabBudget]}
                  onValueChange={([val]) => updateValue("rehabBudget", val)}
                  min={5000}
                  max={200000}
                  step={1000}
                />
              </div>
            </div>

            {/* Holding Period */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">
                Timeline
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="holdingMonths">Holding Period</Label>
                  <span className="text-sm text-slate-500">
                    {values.holdingMonths} months
                  </span>
                </div>
                <Slider
                  value={[values.holdingMonths]}
                  onValueChange={([val]) => updateValue("holdingMonths", val)}
                  min={1}
                  max={24}
                  step={1}
                />
              </div>
            </div>

            {/* Financing */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">
                Financing
              </h3>

              <div className="flex items-center justify-between">
                <Label htmlFor="useFinancing">Use Financing</Label>
                <Switch
                  id="useFinancing"
                  checked={values.useFinancing}
                  onCheckedChange={(checked) =>
                    updateValue("useFinancing", checked)
                  }
                />
              </div>

              {values.useFinancing && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Down Payment</Label>
                      <span className="text-sm text-slate-500">
                        {values.downPaymentPercent}%
                      </span>
                    </div>
                    <Slider
                      value={[values.downPaymentPercent]}
                      onValueChange={([val]) =>
                        updateValue("downPaymentPercent", val)
                      }
                      min={10}
                      max={50}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Interest Rate</Label>
                      <span className="text-sm text-slate-500">
                        {values.interestRate}%
                      </span>
                    </div>
                    <Slider
                      value={[values.interestRate]}
                      onValueChange={([val]) => updateValue("interestRate", val)}
                      min={6}
                      max={18}
                      step={0.5}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={calculate} className="flex-1">
                <Calculator className="h-4 w-4 mr-2" />
                Calculate
              </Button>
              <Button variant="outline" onClick={resetToDefaults}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results ? (
              <CalculatorResultsDisplay results={results} />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-center text-slate-500">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Adjust values and click Calculate to see results</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InvestmentCalculator;
