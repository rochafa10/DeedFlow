/**
 * Report Section Components
 *
 * All 12 sections of the Property Analysis Report
 *
 * @module report/sections
 */

// Section 1: Property Summary
export {
  PropertySummary,
  type PropertyDetails,
  type PropertySummaryProps,
} from "./PropertySummary";

// Section 2: Investment Score
export {
  InvestmentScore,
  type CategoryScore,
  type InvestmentScoreProps,
} from "./InvestmentScore";

// Section 3: Location Analysis
export {
  LocationAnalysis,
  type NearbyAmenity,
  type NeighborhoodStats,
  type MarketTrend,
  type LocationAnalysisProps,
} from "./LocationAnalysis";

// Section 4: Risk Assessment
export {
  RiskAssessment,
  type RiskItem,
  type TitleRisk,
  type EnvironmentalRisk,
  type ConditionRisk,
  type RiskAssessmentProps,
} from "./RiskAssessment";

// Section 5: Financial Analysis
export {
  FinancialAnalysis,
  type AcquisitionCosts,
  type RehabCosts,
  type HoldingCosts,
  type SellingCosts,
  type FinancialAnalysisProps,
} from "./FinancialAnalysis";

// Section 6: Market Analysis
export {
  MarketAnalysis,
  type MarketMetrics,
  type MarketTrendPoint,
  type MarketTrends,
  type MarketSegment,
  type MarketAnalysisProps,
} from "./MarketAnalysis";

// Section 7: Profit Potential
export {
  ProfitPotential,
  type ExitStrategy,
  type ROIBreakdown,
  type CashFlowProjection,
  type ProfitPotentialProps,
} from "./ProfitPotential";

// Section 8: Comparables
export {
  ComparablesSection,
  type ComparableProperty,
  type ComparablesAnalysis,
  type ComparablesSectionProps,
} from "./ComparablesSection";

// Section 9: Title Research
export {
  TitleResearch,
  type LienRecord,
  type OwnershipRecord,
  type TitleIssue,
  type TitleResearchSummary,
  type TitleResearchProps,
} from "./TitleResearch";

// Section 10: Auction Details
export {
  AuctionDetails,
  type AuctionRequirement,
  type AuctionData,
  type AuctionDetailsProps,
} from "./AuctionDetails";

// Section 11: Recommendations Summary
export {
  RecommendationsSummary,
  type RecommendationItem,
  type ProConItem,
  type SummaryMetric,
  type RecommendationsSummaryProps,
} from "./RecommendationsSummary";

// Section 12: Disclaimers
export {
  Disclaimers,
  type DisclaimerItem,
  type LegalReference,
  type DisclaimersProps,
} from "./Disclaimers";
