# Tax Deed Flow - Implementation Track Plan

## Overview
This document organizes all implementation tasks from 20 phase documents into parallel tracks for coordinated execution.

---

## Track Dependencies Diagram

```
FOUNDATION LAYER (Must Complete First)
├── Track A: Database Schema (Phase 1)
│
PARALLEL LAYER 1 (After Track A)
├── Track B: Scoring System Core (Phase 6a-6c)
├── Track C: Risk Analysis Core (Phase 7a-7c)
├── Track D: API Integration (Phase 2)
│
PARALLEL LAYER 2 (After respective cores)
├── Track E: Scoring Complete (Phase 6d-6f) ← depends on Track B
├── Track F: Risk Integration (Phase 7d) ← depends on Track C
├── Track G: Cost Estimation (Phase 8a) ← depends on Track A
│
PARALLEL LAYER 3
├── Track H: ROI & Comparables (Phase 8b-8c) ← depends on Track G
├── Track I: UI Components (Phase 3) ← depends on Track D
│
INTEGRATION LAYER
├── Track J: Recommendations (Phase 8d) ← depends on Tracks E, F, H
├── Track K: Financial UI (Phase 8e) ← depends on Track J
│
FINAL LAYER
├── Track L: Reports (Phase 4) ← depends on Tracks I, K
├── Track M: Sharing & Export (Phase 5) ← depends on Track L
```

---

## Track A: Database Schema (Phase 1)
**Status:** Not Started
**Dependencies:** None (Foundation)
**Blocks:** All other tracks

### Tasks:
| ID | Task | Files | Status |
|----|------|-------|--------|
| A1 | Create Supabase types for all entities | `src/types/database.ts` | Not Started |
| A2 | Create properties table schema | `supabase/migrations/001_properties.sql` | Not Started |
| A3 | Create scoring tables (scores, score_history) | `supabase/migrations/002_scoring.sql` | Not Started |
| A4 | Create risk tables (risk_assessments, risk_factors) | `supabase/migrations/003_risks.sql` | Not Started |
| A5 | Create financial tables (costs, comparables, recommendations) | `supabase/migrations/004_financial.sql` | Not Started |
| A6 | Create reports tables | `supabase/migrations/005_reports.sql` | Not Started |
| A7 | Create RLS policies for all tables | `supabase/migrations/006_rls_policies.sql` | Not Started |
| A8 | Create database utility functions | `src/lib/supabase/queries.ts` | Not Started |

---

## Track B: Scoring System Core (Phase 6a-6c)
**Status:** Not Started
**Dependencies:** Track A (A1)
**Blocks:** Track E

### Tasks:
| ID | Task | Files | Status |
|----|------|-------|--------|
| B1 | Create ScoreCategory enum and base types | `src/types/scoring.ts` | Not Started |
| B2 | Create PropertyScore interface (125-point system) | `src/types/scoring.ts` | Not Started |
| B3 | Create ScoreBreakdown interface | `src/types/scoring.ts` | Not Started |
| B4 | Create CategoryWeights type | `src/types/scoring.ts` | Not Started |
| B5 | Create ScoringInput interface | `src/types/scoring.ts` | Not Started |
| B6 | Implement DataCompleteness interface | `src/lib/scoring/missing-data.ts` | Not Started |
| B7 | Implement calculateDataCompleteness() | `src/lib/scoring/missing-data.ts` | Not Started |
| B8 | Implement adjustScoreForMissingData() | `src/lib/scoring/missing-data.ts` | Not Started |
| B9 | Implement getDefaultValue() for missing fields | `src/lib/scoring/missing-data.ts` | Not Started |
| B10 | Create REGIONAL_ADJUSTMENTS config | `src/lib/scoring/regional-adjustments.ts` | Not Started |
| B11 | Implement getRegionalMultiplier() | `src/lib/scoring/regional-adjustments.ts` | Not Started |
| B12 | Implement applyRegionalAdjustments() | `src/lib/scoring/regional-adjustments.ts` | Not Started |

---

## Track C: Risk Analysis Core (Phase 7a-7c)
**Status:** Not Started
**Dependencies:** Track A (A1, A4)
**Blocks:** Track F

### Tasks:
| ID | Task | Files | Status |
|----|------|-------|--------|
| C1 | Create WaterRiskAssessment interface | `src/types/risks.ts` | Not Started |
| C2 | Create FloodRisk, HurricaneRisk types | `src/types/risks.ts` | Not Started |
| C3 | Implement fetchFloodZone() from FEMA NFHL | `src/lib/risks/water-risks.ts` | Not Started |
| C4 | Implement assessHurricaneRisk() from NOAA/NHC | `src/lib/risks/water-risks.ts` | Not Started |
| C5 | Implement calculateWaterRiskScore() | `src/lib/risks/water-risks.ts` | Not Started |
| C6 | Create GeologicalRiskAssessment interface | `src/types/risks.ts` | Not Started |
| C7 | Implement fetchSeismicData() from USGS | `src/lib/risks/geological-risks.ts` | Not Started |
| C8 | Implement assessSlopeRisk() | `src/lib/risks/geological-risks.ts` | Not Started |
| C9 | Implement assessSinkholeRisk() | `src/lib/risks/geological-risks.ts` | Not Started |
| C10 | Implement calculateGeologicalRiskScore() | `src/lib/risks/geological-risks.ts` | Not Started |
| C11 | Create FireRisk, EnvironmentalRisk, RadonRisk types | `src/types/risks.ts` | Not Started |
| C12 | Implement fetchFireRiskData() from NASA FIRMS | `src/lib/risks/fire-risks.ts` | Not Started |
| C13 | Implement assessWildfireRisk() | `src/lib/risks/fire-risks.ts` | Not Started |
| C14 | Implement fetchEnvironmentalData() from EPA | `src/lib/risks/environmental-risks.ts` | Not Started |
| C15 | Implement assessContaminationRisk() | `src/lib/risks/environmental-risks.ts` | Not Started |
| C16 | Implement fetchRadonData() | `src/lib/risks/radon-risks.ts` | Not Started |
| C17 | Implement assessRadonRisk() | `src/lib/risks/radon-risks.ts` | Not Started |

---

## Track D: API Integration (Phase 2)
**Status:** Not Started
**Dependencies:** Track A (A1)
**Blocks:** Track I

### Tasks:
| ID | Task | Files | Status |
|----|------|-------|--------|
| D1 | Create API client base utilities | `src/lib/api/client.ts` | Not Started |
| D2 | Implement rate limiting utility | `src/lib/api/rate-limiter.ts` | Not Started |
| D3 | Implement retry logic with exponential backoff | `src/lib/api/retry.ts` | Not Started |
| D4 | Create property data fetcher | `src/lib/api/property-data.ts` | Not Started |
| D5 | Create FEMA API integration | `src/lib/api/fema.ts` | Not Started |
| D6 | Create USGS API integration | `src/lib/api/usgs.ts` | Not Started |
| D7 | Create external data aggregator | `src/lib/api/aggregator.ts` | Not Started |
| D8 | Create API route: /api/properties/[id] | `src/app/api/properties/[id]/route.ts` | Not Started |
| D9 | Create API route: /api/analysis/[propertyId] | `src/app/api/analysis/[propertyId]/route.ts` | Not Started |

---

## Track E: Scoring Complete (Phase 6d-6f)
**Status:** Not Started
**Dependencies:** Track B (all)
**Blocks:** Track J

### Tasks:
| ID | Task | Files | Status |
|----|------|-------|--------|
| E1 | Create EdgeCaseHandler interface | `src/lib/scoring/edge-cases.ts` | Not Started |
| E2 | Implement detectEdgeCases() | `src/lib/scoring/edge-cases.ts` | Not Started |
| E3 | Implement handleVacantLand() | `src/lib/scoring/edge-cases.ts` | Not Started |
| E4 | Implement handleCommercialProperty() | `src/lib/scoring/edge-cases.ts` | Not Started |
| E5 | Implement handleHistoricProperty() | `src/lib/scoring/edge-cases.ts` | Not Started |
| E6 | Implement handleNewConstruction() | `src/lib/scoring/edge-cases.ts` | Not Started |
| E7 | Create PropertyScoreCalculator class | `src/lib/scoring/calculator.ts` | Not Started |
| E8 | Implement calculateLocationScore() | `src/lib/scoring/calculator.ts` | Not Started |
| E9 | Implement calculateConditionScore() | `src/lib/scoring/calculator.ts` | Not Started |
| E10 | Implement calculateFinancialScore() | `src/lib/scoring/calculator.ts` | Not Started |
| E11 | Implement calculateMarketScore() | `src/lib/scoring/calculator.ts` | Not Started |
| E12 | Implement calculateRiskScore() | `src/lib/scoring/calculator.ts` | Not Started |
| E13 | Implement calculateTotalScore() | `src/lib/scoring/calculator.ts` | Not Started |
| E14 | Implement generateScoreExplanation() | `src/lib/scoring/calculator.ts` | Not Started |
| E15 | Create scoring unit tests | `src/lib/scoring/__tests__/calculator.test.ts` | Not Started |
| E16 | Create edge case tests | `src/lib/scoring/__tests__/edge-cases.test.ts` | Not Started |
| E17 | Create integration tests | `src/lib/scoring/__tests__/integration.test.ts` | Not Started |

---

## Track F: Risk Integration (Phase 7d)
**Status:** Not Started
**Dependencies:** Track C (all)
**Blocks:** Track J

### Tasks:
| ID | Task | Files | Status |
|----|------|-------|--------|
| F1 | Create ComprehensiveRiskAssessment interface | `src/types/risks.ts` | Not Started |
| F2 | Create RISK_REGIONS configuration | `src/lib/risks/risk-config.ts` | Not Started |
| F3 | Implement getRegionRiskWeights() | `src/lib/risks/risk-integration.ts` | Not Started |
| F4 | Implement RiskAssessor class | `src/lib/risks/risk-integration.ts` | Not Started |
| F5 | Implement assessAllRisks() | `src/lib/risks/risk-integration.ts` | Not Started |
| F6 | Implement calculateOverallRiskScore() | `src/lib/risks/risk-integration.ts` | Not Started |
| F7 | Implement generateRiskSummary() | `src/lib/risks/risk-integration.ts` | Not Started |
| F8 | Create API route: /api/risks/[propertyId] | `src/app/api/risks/[propertyId]/route.ts` | Not Started |
| F9 | Create risk assessment tests | `src/lib/risks/__tests__/integration.test.ts` | Not Started |

---

## Track G: Cost Estimation (Phase 8a)
**Status:** Not Started
**Dependencies:** Track A (A1, A5)
**Blocks:** Track H

### Tasks:
| ID | Task | Files | Status |
|----|------|-------|--------|
| G1 | Create CostEstimate interface | `src/types/financial.ts` | Not Started |
| G2 | Create CostCategory enum | `src/types/financial.ts` | Not Started |
| G3 | Create AcquisitionCosts, RehabCosts, HoldingCosts types | `src/types/financial.ts` | Not Started |
| G4 | Create REGIONAL_COST_MULTIPLIERS config (50 states) | `src/lib/financial/cost-config.ts` | Not Started |
| G5 | Create REHAB_COST_ESTIMATES config | `src/lib/financial/cost-config.ts` | Not Started |
| G6 | Implement CostEstimator class | `src/lib/financial/cost-estimator.ts` | Not Started |
| G7 | Implement estimateAcquisitionCosts() | `src/lib/financial/cost-estimator.ts` | Not Started |
| G8 | Implement estimateRehabCosts() | `src/lib/financial/cost-estimator.ts` | Not Started |
| G9 | Implement estimateHoldingCosts() | `src/lib/financial/cost-estimator.ts` | Not Started |
| G10 | Implement estimateSellingCosts() | `src/lib/financial/cost-estimator.ts` | Not Started |
| G11 | Implement calculateTotalCosts() | `src/lib/financial/cost-estimator.ts` | Not Started |
| G12 | Implement getRegionalMultiplier() | `src/lib/financial/cost-estimator.ts` | Not Started |
| G13 | Create API route: /api/costs/[propertyId] | `src/app/api/costs/[propertyId]/route.ts` | Not Started |

---

## Track H: ROI & Comparables (Phase 8b-8c)
**Status:** Not Started
**Dependencies:** Track G (all)
**Blocks:** Track J

### Tasks:
| ID | Task | Files | Status |
|----|------|-------|--------|
| H1 | Create ROIMetrics interface | `src/types/financial.ts` | Not Started |
| H2 | Create InvestmentScenario interface | `src/types/financial.ts` | Not Started |
| H3 | Implement ROICalculator class | `src/lib/financial/roi-calculator.ts` | Not Started |
| H4 | Implement calculateCashOnCashReturn() | `src/lib/financial/roi-calculator.ts` | Not Started |
| H5 | Implement calculateCapRate() | `src/lib/financial/roi-calculator.ts` | Not Started |
| H6 | Implement calculateIRR() (Newton-Raphson) | `src/lib/financial/roi-calculator.ts` | Not Started |
| H7 | Implement calculateEquityMultiple() | `src/lib/financial/roi-calculator.ts` | Not Started |
| H8 | Implement analyzeBRRRRStrategy() | `src/lib/financial/roi-calculator.ts` | Not Started |
| H9 | Create ComparableSale interface | `src/types/financial.ts` | Not Started |
| H10 | Create ComparablesAnalysis interface | `src/types/financial.ts` | Not Started |
| H11 | Implement ComparablesAnalyzer class | `src/lib/financial/comparables.ts` | Not Started |
| H12 | Implement findComparables() | `src/lib/financial/comparables.ts` | Not Started |
| H13 | Implement calculateSimilarityScore() | `src/lib/financial/comparables.ts` | Not Started |
| H14 | Implement calculateARV() | `src/lib/financial/comparables.ts` | Not Started |
| H15 | Implement applyAdjustments() | `src/lib/financial/comparables.ts` | Not Started |
| H16 | Create API route: /api/roi/[propertyId] | `src/app/api/roi/[propertyId]/route.ts` | Not Started |
| H17 | Create API route: /api/comparables/[propertyId] | `src/app/api/comparables/[propertyId]/route.ts` | Not Started |

---

## Track I: UI Components (Phase 3)
**Status:** Not Started
**Dependencies:** Track D (D8, D9)
**Blocks:** Track L

### Tasks:
| ID | Task | Files | Status |
|----|------|-------|--------|
| I1 | Create base layout components | `src/components/layout/` | Not Started |
| I2 | Create PropertyCard component | `src/components/property/PropertyCard.tsx` | Not Started |
| I3 | Create PropertyList component | `src/components/property/PropertyList.tsx` | Not Started |
| I4 | Create PropertyDetails component | `src/components/property/PropertyDetails.tsx` | Not Started |
| I5 | Create ScoreDisplay component | `src/components/scoring/ScoreDisplay.tsx` | Not Started |
| I6 | Create ScoreBreakdown component | `src/components/scoring/ScoreBreakdown.tsx` | Not Started |
| I7 | Create ScoreGauge component | `src/components/scoring/ScoreGauge.tsx` | Not Started |
| I8 | Create RiskBadge component | `src/components/risks/RiskBadge.tsx` | Not Started |
| I9 | Create RiskSummary component | `src/components/risks/RiskSummary.tsx` | Not Started |
| I10 | Create DataTable component | `src/components/ui/DataTable.tsx` | Not Started |
| I11 | Create LoadingStates components | `src/components/ui/LoadingStates.tsx` | Not Started |
| I12 | Create ErrorBoundary component | `src/components/ui/ErrorBoundary.tsx` | Not Started |
| I13 | Create property list page | `src/app/properties/page.tsx` | Not Started |
| I14 | Create property detail page | `src/app/properties/[id]/page.tsx` | Not Started |

---

## Track J: Recommendations (Phase 8d)
**Status:** Not Started
**Dependencies:** Tracks E, F, H (all)
**Blocks:** Track K

### Tasks:
| ID | Task | Files | Status |
|----|------|-------|--------|
| J1 | Create InvestmentRecommendation interface | `src/types/financial.ts` | Not Started |
| J2 | Create Verdict enum (strong_buy, buy, hold, pass, avoid) | `src/types/financial.ts` | Not Started |
| J3 | Create ExitStrategy type | `src/types/financial.ts` | Not Started |
| J4 | Create RECOMMENDATION_THRESHOLDS config | `src/lib/financial/recommendation-config.ts` | Not Started |
| J5 | Implement RecommendationEngine class | `src/lib/financial/recommendations.ts` | Not Started |
| J6 | Implement generateRecommendation() | `src/lib/financial/recommendations.ts` | Not Started |
| J7 | Implement determineVerdict() | `src/lib/financial/recommendations.ts` | Not Started |
| J8 | Implement calculateMaxBid() (70% rule) | `src/lib/financial/recommendations.ts` | Not Started |
| J9 | Implement determineExitStrategy() | `src/lib/financial/recommendations.ts` | Not Started |
| J10 | Implement assessDataQuality() | `src/lib/financial/recommendations.ts` | Not Started |
| J11 | Implement analyzePropertyFinancials() orchestrator | `src/lib/financial/analyzer.ts` | Not Started |
| J12 | Create API route: /api/analysis/financial | `src/app/api/analysis/financial/route.ts` | Not Started |
| J13 | Create RecommendationCard component | `src/components/financial/RecommendationCard.tsx` | Not Started |
| J14 | Create DataQualityIndicator component | `src/components/financial/DataQualityIndicator.tsx` | Not Started |

---

## Track K: Financial UI (Phase 8e)
**Status:** Not Started
**Dependencies:** Track J (all)
**Blocks:** Track L

### Tasks:
| ID | Task | Files | Status |
|----|------|-------|--------|
| K1 | Create formatting utilities | `src/lib/utils/format.ts` | Not Started |
| K2 | Create CostBreakdownCard component | `src/components/financial/CostBreakdownCard.tsx` | Not Started |
| K3 | Create ROIMetricsCard component | `src/components/financial/ROIMetricsCard.tsx` | Not Started |
| K4 | Create ComparablesTable component | `src/components/financial/ComparablesTable.tsx` | Not Started |
| K5 | Create CostPieChart component | `src/components/financial/charts/CostPieChart.tsx` | Not Started |
| K6 | Create ProfitWaterfallChart component | `src/components/financial/charts/ProfitWaterfallChart.tsx` | Not Started |
| K7 | Create ROIComparisonChart component | `src/components/financial/charts/ROIComparisonChart.tsx` | Not Started |
| K8 | Create ComparablesScatterPlot component | `src/components/financial/charts/ComparablesScatterPlot.tsx` | Not Started |
| K9 | Create InvestmentCalculator component | `src/components/financial/InvestmentCalculator.tsx` | Not Started |
| K10 | Create FinancialDashboard component | `src/components/financial/FinancialDashboard.tsx` | Not Started |
| K11 | Create financial analysis page | `src/app/analysis/[propertyId]/page.tsx` | Not Started |

---

## Track L: Reports (Phase 4)
**Status:** Not Started
**Dependencies:** Tracks I, K (all)
**Blocks:** Track M

### Tasks:
| ID | Task | Files | Status |
|----|------|-------|--------|
| L1 | Create ReportTemplate interface | `src/types/reports.ts` | Not Started |
| L2 | Create ReportSection interface | `src/types/reports.ts` | Not Started |
| L3 | Implement ReportGenerator class | `src/lib/reports/generator.ts` | Not Started |
| L4 | Implement generatePropertyReport() | `src/lib/reports/generator.ts` | Not Started |
| L5 | Implement generateSummarySection() | `src/lib/reports/generator.ts` | Not Started |
| L6 | Implement generateScoreSection() | `src/lib/reports/generator.ts` | Not Started |
| L7 | Implement generateRiskSection() | `src/lib/reports/generator.ts` | Not Started |
| L8 | Implement generateFinancialSection() | `src/lib/reports/generator.ts` | Not Started |
| L9 | Create PDF export utility | `src/lib/reports/pdf-export.ts` | Not Started |
| L10 | Create ReportPreview component | `src/components/reports/ReportPreview.tsx` | Not Started |
| L11 | Create API route: /api/reports/generate | `src/app/api/reports/generate/route.ts` | Not Started |
| L12 | Create reports page | `src/app/reports/page.tsx` | Not Started |
| L13 | Create report detail page | `src/app/reports/[id]/page.tsx` | Not Started |

---

## Track M: Sharing & Export (Phase 5)
**Status:** Not Started
**Dependencies:** Track L (all)
**Blocks:** None (Final track)

### Tasks:
| ID | Task | Files | Status |
|----|------|-------|--------|
| M1 | Create ShareLink interface | `src/types/sharing.ts` | Not Started |
| M2 | Create ExportOptions interface | `src/types/sharing.ts` | Not Started |
| M3 | Implement ShareLinkGenerator class | `src/lib/sharing/link-generator.ts` | Not Started |
| M4 | Implement generateShareableLink() | `src/lib/sharing/link-generator.ts` | Not Started |
| M5 | Implement validateShareLink() | `src/lib/sharing/link-generator.ts` | Not Started |
| M6 | Implement ExportService class | `src/lib/sharing/export-service.ts` | Not Started |
| M7 | Implement exportToPDF() | `src/lib/sharing/export-service.ts` | Not Started |
| M8 | Implement exportToExcel() | `src/lib/sharing/export-service.ts` | Not Started |
| M9 | Create ShareDialog component | `src/components/sharing/ShareDialog.tsx` | Not Started |
| M10 | Create ExportButton component | `src/components/sharing/ExportButton.tsx` | Not Started |
| M11 | Create API route: /api/share | `src/app/api/share/route.ts` | Not Started |
| M12 | Create API route: /api/export | `src/app/api/export/route.ts` | Not Started |
| M13 | Create shared report page | `src/app/shared/[token]/page.tsx` | Not Started |

---

## Execution Order

### Wave 1 (Foundation)
- **Track A**: Database Schema ← START HERE

### Wave 2 (Parallel - after Track A complete)
- **Track B**: Scoring System Core
- **Track C**: Risk Analysis Core
- **Track D**: API Integration
- **Track G**: Cost Estimation

### Wave 3 (Parallel - after respective Wave 2 tracks)
- **Track E**: Scoring Complete (after B)
- **Track F**: Risk Integration (after C)
- **Track H**: ROI & Comparables (after G)
- **Track I**: UI Components (after D)

### Wave 4 (Integration)
- **Track J**: Recommendations (after E, F, H)

### Wave 5 (after Track J)
- **Track K**: Financial UI

### Wave 6 (after I, K)
- **Track L**: Reports

### Wave 7 (Final)
- **Track M**: Sharing & Export

---

## Status Summary

| Track | Phase(s) | Tasks | Status | Blocked By |
|-------|----------|-------|--------|------------|
| A | 1 | 8 | Not Started | None |
| B | 6a-6c | 12 | Not Started | A |
| C | 7a-7c | 17 | Not Started | A |
| D | 2 | 9 | Not Started | A |
| E | 6d-6f | 17 | Not Started | B |
| F | 7d | 9 | Not Started | C |
| G | 8a | 13 | Not Started | A |
| H | 8b-8c | 17 | Not Started | G |
| I | 3 | 14 | Not Started | D |
| J | 8d | 14 | Not Started | E, F, H |
| K | 8e | 11 | Not Started | J |
| L | 4 | 13 | Not Started | I, K |
| M | 5 | 13 | Not Started | L |

**Total Tasks: 167**
