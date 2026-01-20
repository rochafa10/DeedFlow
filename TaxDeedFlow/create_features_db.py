#!/usr/bin/env python3
"""
Create features.db for autocoder-master
Populates the database with all features from Property Analysis Report phases 1-8E
"""

import sqlite3
import json
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent / "features.db"

def create_database():
    """Create the features database with the correct schema."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create features table matching autocoder schema
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS features (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            priority INTEGER NOT NULL DEFAULT 999,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            steps TEXT NOT NULL,
            passes INTEGER DEFAULT 0,
            in_progress INTEGER DEFAULT 0
        )
    """)

    # Create index for efficient queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_priority ON features(priority)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_passes ON features(passes)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_in_progress ON features(in_progress)")

    conn.commit()
    return conn

def insert_feature(conn, priority: int, category: str, name: str, description: str, steps: list):
    """Insert a feature into the database."""
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO features (priority, category, name, description, steps, passes, in_progress)
        VALUES (?, ?, ?, ?, ?, 0, 0)
    """, (priority, category, name, description, json.dumps(steps)))
    conn.commit()

def populate_features(conn):
    """Populate all features from phases 1-8E."""

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: DATABASE SCHEMA
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 1, "Phase 1: Database Schema",
        "Create property_reports table",
        "Create the main property_reports table in Supabase with all required columns for storing analysis data",
        [
            "Create SQL migration for property_reports table",
            "Include columns: id, property_id, overall_score, overall_grade, location_score, risk_score, financial_score, market_score, profit_score",
            "Include JSON columns: score_breakdown, risk_analysis, financial_analysis, comparables_data",
            "Add confidence_level, data_completeness, missing_data_impact columns",
            "Add timestamps: created_at, updated_at, analysis_version",
            "Run migration against Supabase"
        ])

    insert_feature(conn, 2, "Phase 1: Database Schema",
        "Create comparable_sales table",
        "Create table for storing comparable property sales data used in ARV calculations",
        [
            "Create SQL migration for comparable_sales table",
            "Include columns: id, property_report_id, address, sale_price, sale_date, sqft, bedrooms, bathrooms",
            "Include adjustment columns: similarity_score, adjusted_price, distance_miles",
            "Add source column (realtor, zillow, mls, manual)",
            "Create foreign key to property_reports",
            "Run migration"
        ])

    insert_feature(conn, 3, "Phase 1: Database Schema",
        "Create risk_assessments table",
        "Create table for storing detailed risk analysis results per property",
        [
            "Create SQL migration for risk_assessments table",
            "Include flood_risk, hurricane_risk, earthquake_risk, wildfire_risk columns as JSONB",
            "Include environmental_risk, radon_risk, geological_risk columns",
            "Add overall_risk_score, risk_grade, mitigation_recommendations",
            "Create foreign key to property_reports",
            "Run migration"
        ])

    insert_feature(conn, 4, "Phase 1: Database Schema",
        "Create database indexes and views",
        "Create indexes for query performance and views for common queries",
        [
            "Create index on property_reports(property_id)",
            "Create index on property_reports(overall_grade)",
            "Create index on comparable_sales(property_report_id)",
            "Create view vw_property_scores for score summaries",
            "Create view vw_investable_properties filtering approved properties",
            "Test query performance"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: API INTEGRATION
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 10, "Phase 2: API Integration",
        "Create FEMA Flood Zone API service",
        "Implement service to fetch flood zone data from FEMA National Flood Hazard Layer API",
        [
            "Create src/lib/api/fema.ts",
            "Implement getFEMAFloodZone(latitude, longitude) function",
            "Parse NFHL API response for flood zone designation",
            "Map FEMA zones (A, AE, AH, AO, V, VE, X, etc.) to risk levels",
            "Handle API errors and rate limiting",
            "Add caching for repeated lookups",
            "Write unit tests"
        ])

    insert_feature(conn, 11, "Phase 2: API Integration",
        "Create USGS Seismic Hazard API service",
        "Implement service to fetch earthquake risk data from USGS",
        [
            "Create src/lib/api/usgs.ts",
            "Implement getSeismicHazard(latitude, longitude) function",
            "Query USGS Seismic Hazard Map API",
            "Parse PGA (Peak Ground Acceleration) values",
            "Map seismic zones to risk scores",
            "Handle API errors",
            "Write unit tests"
        ])

    insert_feature(conn, 12, "Phase 2: API Integration",
        "Create NASA FIRMS Wildfire API service",
        "Implement service to fetch wildfire data from NASA FIRMS",
        [
            "Create src/lib/api/nasaFirms.ts",
            "Implement getWildfireHistory(latitude, longitude, radiusMiles) function",
            "Query NASA FIRMS API for historical fire data",
            "Calculate fire frequency and proximity metrics",
            "Integrate WUI (Wildland-Urban Interface) zone detection",
            "Write unit tests"
        ])

    insert_feature(conn, 13, "Phase 2: API Integration",
        "Create EPA Envirofacts API service",
        "Implement service to fetch environmental hazard data from EPA",
        [
            "Create src/lib/api/epa.ts",
            "Implement getEnvironmentalHazards(latitude, longitude) function",
            "Query EPA Envirofacts for Superfund sites, UST, TRI facilities",
            "Calculate proximity scores for each hazard type",
            "Aggregate into overall environmental risk score",
            "Write unit tests"
        ])

    insert_feature(conn, 14, "Phase 2: API Integration",
        "Create Realtor.com Comparables API service",
        "Implement service to fetch comparable sales from Realtor.com API",
        [
            "Create src/lib/api/realtor.ts",
            "Implement getComparableSales(address, radius, filters) function",
            "Query Realtor.com API for recent sales",
            "Transform response to ComparableSale interface",
            "Filter by property type, size, age",
            "Handle pagination and rate limits",
            "Write unit tests"
        ])

    insert_feature(conn, 15, "Phase 2: API Integration",
        "Create NOAA Hurricane API service",
        "Implement service to fetch hurricane history and risk from NOAA",
        [
            "Create src/lib/api/noaa.ts",
            "Implement getHurricaneRisk(latitude, longitude) function",
            "Query NOAA National Hurricane Center data",
            "Calculate historical storm frequency",
            "Determine coastal distance and exposure",
            "Map to hurricane risk score",
            "Write unit tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 3: UI COMPONENTS
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 20, "Phase 3: UI Components",
        "Create PropertyScoreCard component",
        "Build the main score card showing overall property grade and score breakdown",
        [
            "Create src/components/reports/PropertyScoreCard.tsx",
            "Display overall grade (A-F) with color coding",
            "Show overall score (0-125)",
            "Display radar chart with 5 category scores",
            "Add confidence indicator",
            "Style with Tailwind CSS and shadcn/ui",
            "Make responsive for mobile",
            "Write component tests"
        ])

    insert_feature(conn, 21, "Phase 3: UI Components",
        "Create ScoreBreakdownChart component",
        "Build radar chart visualizing the 5 scoring categories",
        [
            "Create src/components/reports/ScoreBreakdownChart.tsx",
            "Use Recharts RadarChart",
            "Display Location, Risk, Financial, Market, Profit scores",
            "Add tooltips with score details",
            "Color code based on score thresholds",
            "Add animation on load",
            "Write component tests"
        ])

    insert_feature(conn, 22, "Phase 3: UI Components",
        "Create RiskOverviewCard component",
        "Build card showing aggregated risk analysis with breakdown",
        [
            "Create src/components/reports/RiskOverviewCard.tsx",
            "Display overall risk score and grade",
            "Show individual risk categories (flood, fire, earthquake, etc.)",
            "Include risk level badges (low, moderate, high, extreme)",
            "Add expandable details section",
            "Style consistently with design system",
            "Write component tests"
        ])

    insert_feature(conn, 23, "Phase 3: UI Components",
        "Create FinancialSummaryCard component",
        "Build card showing key financial metrics and ROI projections",
        [
            "Create src/components/reports/FinancialSummaryCard.tsx",
            "Display total investment, projected ARV, net profit",
            "Show ROI percentage with annualized return",
            "Include cost breakdown (acquisition, rehab, holding, selling)",
            "Add profit margin indicator",
            "Style with consistent design system",
            "Write component tests"
        ])

    insert_feature(conn, 24, "Phase 3: UI Components",
        "Create ComparablesTable component",
        "Build table showing comparable sales with adjustments",
        [
            "Create src/components/reports/ComparablesTable.tsx",
            "Display comparable properties in sortable table",
            "Show address, sale price, sqft, beds/baths, similarity score",
            "Include adjustment details in expandable row",
            "Add ARV summary row",
            "Style with TanStack Table and shadcn/ui",
            "Write component tests"
        ])

    insert_feature(conn, 25, "Phase 3: UI Components",
        "Create RecommendationBadge component",
        "Build badge component for buy/hold/avoid recommendations",
        [
            "Create src/components/reports/RecommendationBadge.tsx",
            "Display recommendation (Strong Buy, Buy, Hold, Caution, Avoid)",
            "Color code based on recommendation level",
            "Add tooltip with reasoning",
            "Animate on hover",
            "Write component tests"
        ])

    insert_feature(conn, 26, "Phase 3: UI Components",
        "Create PropertyReportPage layout",
        "Build the main report page assembling all components",
        [
            "Create src/app/properties/[id]/report/page.tsx",
            "Fetch property report data using React Query",
            "Layout components: ScoreCard, RiskCard, FinancialCard, Comparables",
            "Add loading skeleton states",
            "Handle error states",
            "Add print-friendly styles",
            "Make fully responsive",
            "Write integration tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 4: REPORT GENERATION
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 30, "Phase 4: Report Generation",
        "Create report generation API endpoint",
        "Build API endpoint to generate property analysis report",
        [
            "Create src/app/api/reports/generate/route.ts",
            "Accept property_id as input",
            "Orchestrate all analysis modules",
            "Call risk analysis, financial analysis, comparables services",
            "Calculate overall scores",
            "Store result in property_reports table",
            "Return report data",
            "Handle errors and timeouts"
        ])

    insert_feature(conn, 31, "Phase 4: Report Generation",
        "Create report orchestration service",
        "Build service that coordinates all analysis modules for report generation",
        [
            "Create src/lib/reports/reportOrchestrator.ts",
            "Implement generateReport(propertyId) function",
            "Fetch property and regrid data",
            "Run risk analysis pipeline",
            "Run financial analysis pipeline",
            "Run comparables analysis",
            "Calculate final scores",
            "Generate recommendations",
            "Return complete PropertyReport object"
        ])

    insert_feature(conn, 32, "Phase 4: Report Generation",
        "Create batch report generation endpoint",
        "Build endpoint for generating reports for multiple properties",
        [
            "Create src/app/api/reports/generate-batch/route.ts",
            "Accept array of property_ids",
            "Process in batches to manage memory",
            "Return progress updates via streaming",
            "Handle partial failures gracefully",
            "Log batch results"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 5: SHARING & EXPORT
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 40, "Phase 5: Sharing & Export",
        "Create PDF export functionality",
        "Implement PDF generation for property analysis reports",
        [
            "Install react-pdf or puppeteer for PDF generation",
            "Create src/lib/export/pdfExport.ts",
            "Implement generateReportPDF(reportId) function",
            "Design PDF template with all report sections",
            "Include charts as images",
            "Add watermark and branding",
            "Handle large reports with pagination",
            "Write tests"
        ])

    insert_feature(conn, 41, "Phase 5: Sharing & Export",
        "Create Excel export functionality",
        "Implement Excel export for report data and comparables",
        [
            "Install xlsx or exceljs library",
            "Create src/lib/export/excelExport.ts",
            "Implement generateReportExcel(reportId) function",
            "Create worksheets: Summary, Scores, Risks, Financials, Comparables",
            "Add formatting and charts",
            "Write tests"
        ])

    insert_feature(conn, 42, "Phase 5: Sharing & Export",
        "Create shareable report links",
        "Implement public shareable links for reports",
        [
            "Create share_tokens table in database",
            "Generate unique share token on request",
            "Create public report view page",
            "Add expiration for share links",
            "Track view counts",
            "Allow revoking shared links"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 6A: CORE SCORING TYPES & METHODOLOGY
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 50, "Phase 6A: Scoring Types",
        "Create PropertyScore interface and types",
        "Define TypeScript interfaces for the 125-point scoring system",
        [
            "Create src/lib/scoring/types.ts",
            "Define PropertyScore interface with all category scores",
            "Define ScoreBreakdown for detailed component scores",
            "Define CategoryWeights interface",
            "Define ScoreInput interface for calculator input",
            "Define GradeThresholds constants (A>=80%, B>=60%, C>=40%, D>=20%, F<20%)",
            "Export all types"
        ])

    insert_feature(conn, 51, "Phase 6A: Scoring Types",
        "Create scoring constants and configuration",
        "Define constants for score weights, thresholds, and defaults",
        [
            "Create src/lib/scoring/constants.ts",
            "Define MAX_TOTAL_SCORE = 125",
            "Define CATEGORY_MAX_SCORE = 25 for each of 5 categories",
            "Define DEFAULT_WEIGHTS for each category",
            "Define GRADE_THRESHOLDS percentages",
            "Define MISSING_DATA_DEFAULTS",
            "Export all constants"
        ])

    insert_feature(conn, 52, "Phase 6A: Scoring Types",
        "Create calculateGrade utility function",
        "Implement grade calculation from score percentage",
        [
            "Create src/lib/scoring/utils.ts",
            "Implement calculateGrade(score, maxScore) function",
            "Return grade A/B/C/D/F based on percentage thresholds",
            "Handle edge cases (0, max, negative)",
            "Write comprehensive unit tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 6B: MISSING DATA & CONFIDENCE
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 55, "Phase 6B: Missing Data",
        "Create missing data strategy system",
        "Implement strategies for handling missing data in scoring",
        [
            "Create src/lib/scoring/missingData.ts",
            "Define MissingDataStrategy enum: DEFAULT_NEUTRAL, DEFAULT_CONSERVATIVE, DEFAULT_OPTIMISTIC, SKIP_COMPONENT, REQUIRE_DATA, ESTIMATE_FROM_PEERS",
            "Implement getDefaultValue(field, strategy) function",
            "Define default values per strategy (neutral=2.5, conservative=2.0, optimistic=3.5)",
            "Track which fields used defaults",
            "Write unit tests"
        ])

    insert_feature(conn, 56, "Phase 6B: Missing Data",
        "Create confidence score calculator",
        "Calculate confidence level based on data completeness",
        [
            "Create src/lib/scoring/confidence.ts",
            "Implement calculateConfidence(inputData) function",
            "Define required fields with weights",
            "Calculate completeness percentage",
            "Map to confidence levels: high (>80%), medium (>50%), low (<=50%)",
            "Track missing fields for reporting",
            "Write unit tests"
        ])

    insert_feature(conn, 57, "Phase 6B: Missing Data",
        "Create data completeness reporter",
        "Generate report on data completeness and impact",
        [
            "Add to src/lib/scoring/confidence.ts",
            "Implement generateDataReport(inputData) function",
            "List all available fields",
            "List all missing fields with impact level",
            "Calculate estimated score range uncertainty",
            "Return DataCompletenessReport object",
            "Write unit tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 6C: REGIONAL & PROPERTY TYPE ADJUSTMENTS
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 60, "Phase 6C: Regional Adjustments",
        "Create state-based scoring adjustments",
        "Implement regional multipliers for different states",
        [
            "Create src/lib/scoring/regional.ts",
            "Define STATE_ADJUSTMENTS config for all 50 states",
            "Include adjustments for: cost_of_living, market_volatility, tax_burden, regulatory_complexity",
            "Implement getStateAdjustments(stateCode) function",
            "Apply adjustments to financial scores",
            "Write unit tests"
        ])

    insert_feature(conn, 61, "Phase 6C: Regional Adjustments",
        "Create property type detection and adjustments",
        "Auto-detect property type and apply type-specific scoring",
        [
            "Create src/lib/scoring/propertyType.ts",
            "Implement detectPropertyType(regridData) function",
            "Detect: single_family, condo, townhouse, multi_family, vacant_land, commercial, mobile_home",
            "Define type-specific weight adjustments",
            "Apply adjustments to category scores",
            "Write unit tests"
        ])

    insert_feature(conn, 62, "Phase 6C: Regional Adjustments",
        "Create metro area multipliers",
        "Implement city-level cost and value adjustments",
        [
            "Add to src/lib/scoring/regional.ts",
            "Define METRO_MULTIPLIERS for major cities in each state",
            "Include labor_cost, material_cost, market_premium factors",
            "Implement getMetroMultiplier(state, city) function",
            "Apply to renovation cost estimates",
            "Write unit tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 6D: EDGE CASES & CALIBRATION
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 65, "Phase 6D: Edge Cases",
        "Create edge case handlers",
        "Implement handlers for unusual property scenarios",
        [
            "Create src/lib/scoring/edgeCases.ts",
            "Handle: negative_equity, extremely_high_value, zero_comparables, mixed_use, historic_property",
            "Handle: flood_zone_v, coastal_high_hazard, brownfield_site, condemned_property",
            "Implement detectEdgeCases(propertyData) function",
            "Apply score adjustments or flags for each case",
            "Write unit tests for all 15+ edge cases"
        ])

    insert_feature(conn, 66, "Phase 6D: Edge Cases",
        "Create score validation and bounds checking",
        "Ensure scores stay within valid ranges",
        [
            "Add to src/lib/scoring/utils.ts",
            "Implement validateScore(score, min, max) function",
            "Clamp scores to valid ranges",
            "Log warnings for out-of-bounds values",
            "Add sanity checks for negative profits, impossible ROIs",
            "Write unit tests"
        ])

    insert_feature(conn, 67, "Phase 6D: Edge Cases",
        "Create calibration configuration",
        "Define calibration factors for score fine-tuning",
        [
            "Create src/lib/scoring/calibration.ts",
            "Define CALIBRATION_FACTORS for each score component",
            "Allow override via environment variables",
            "Implement applyCalibration(rawScore, component) function",
            "Document calibration methodology",
            "Write unit tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 6E: MAIN CALCULATOR & LOCATION
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 70, "Phase 6E: Main Calculator",
        "Create main PropertyScoreCalculator",
        "Implement the main scoring calculator orchestrating all components",
        [
            "Create src/lib/scoring/calculator.ts",
            "Implement calculatePropertyScore(input: ScoreInput): PropertyScore",
            "Calculate each of 5 category scores",
            "Apply regional adjustments",
            "Apply property type adjustments",
            "Handle missing data with strategies",
            "Calculate confidence and completeness",
            "Return complete PropertyScore object",
            "Write comprehensive integration tests"
        ])

    insert_feature(conn, 71, "Phase 6E: Main Calculator",
        "Create Location Score calculator",
        "Calculate location category score (25 points max)",
        [
            "Create src/lib/scoring/categories/locationScore.ts",
            "Implement calculateLocationScore(input) function",
            "Score components: school_quality, crime_rate, employment_access, amenities_proximity",
            "Score components: property_appreciation_trend, neighborhood_stability",
            "Weight and combine component scores",
            "Return score out of 25 with breakdown",
            "Write unit tests"
        ])

    insert_feature(conn, 72, "Phase 6E: Main Calculator",
        "Create Market Score calculator",
        "Calculate market category score (25 points max)",
        [
            "Create src/lib/scoring/categories/marketScore.ts",
            "Implement calculateMarketScore(input) function",
            "Score components: days_on_market, price_trends, inventory_levels, absorption_rate",
            "Score components: buyer_demand, seasonal_factors",
            "Weight and combine component scores",
            "Return score out of 25 with breakdown",
            "Write unit tests"
        ])

    insert_feature(conn, 73, "Phase 6E: Main Calculator",
        "Create Profit Score calculator",
        "Calculate profit potential category score (25 points max)",
        [
            "Create src/lib/scoring/categories/profitScore.ts",
            "Implement calculateProfitScore(financialMetrics) function",
            "Score components: roi_percentage, profit_margin, cash_on_cash, arv_to_price_ratio",
            "Score components: break_even_buffer, risk_adjusted_return",
            "Weight and combine component scores",
            "Return score out of 25 with breakdown",
            "Write unit tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 6F: TESTS & VERIFICATION
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 75, "Phase 6F: Testing",
        "Create scoring system unit tests",
        "Comprehensive unit tests for all scoring components",
        [
            "Create src/lib/scoring/__tests__/calculator.test.ts",
            "Test calculatePropertyScore with complete data",
            "Test calculatePropertyScore with missing data",
            "Test each category score calculator",
            "Test grade calculation boundaries",
            "Test edge case handlers",
            "Achieve >90% code coverage"
        ])

    insert_feature(conn, 76, "Phase 6F: Testing",
        "Create scoring system integration tests",
        "End-to-end tests for scoring pipeline",
        [
            "Create src/lib/scoring/__tests__/integration.test.ts",
            "Test full scoring pipeline with real property data",
            "Test with various property types",
            "Test regional adjustment application",
            "Test confidence calculation accuracy",
            "Verify score reproducibility"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 7A: WATER RISKS (FLOOD & HURRICANE)
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 80, "Phase 7A: Water Risks",
        "Create FloodRiskAnalysis service",
        "Implement flood risk analysis using FEMA data",
        [
            "Create src/lib/analysis/risk/floodRisk.ts",
            "Define FloodRiskAnalysis interface",
            "Implement analyzeFloodRisk(latitude, longitude) function",
            "Call FEMA API for flood zone",
            "Map zones to risk levels: minimal, low, moderate, high, extreme",
            "Calculate flood insurance estimate",
            "Return complete FloodRiskAnalysis",
            "Write unit tests"
        ])

    insert_feature(conn, 81, "Phase 7A: Water Risks",
        "Create HurricaneRiskAnalysis service",
        "Implement hurricane risk analysis using NOAA data",
        [
            "Create src/lib/analysis/risk/hurricaneRisk.ts",
            "Define HurricaneRiskAnalysis interface",
            "Implement analyzeHurricaneRisk(latitude, longitude) function",
            "Call NOAA API for historical storm data",
            "Calculate distance to coast",
            "Determine wind zone classification",
            "Calculate storm frequency metrics",
            "Return complete HurricaneRiskAnalysis",
            "Write unit tests"
        ])

    insert_feature(conn, 82, "Phase 7A: Water Risks",
        "Create WaterRiskSummary aggregator",
        "Combine flood and hurricane risks into summary",
        [
            "Create src/lib/analysis/risk/waterRisk.ts",
            "Implement calculateWaterRiskSummary(flood, hurricane) function",
            "Weight and combine risk scores",
            "Generate combined risk level",
            "List mitigation recommendations",
            "Calculate insurance cost estimates",
            "Return WaterRiskSummary",
            "Write unit tests"
        ])

    insert_feature(conn, 83, "Phase 7A: Water Risks",
        "Create FloodRiskCard UI component",
        "Build UI component for displaying flood risk analysis",
        [
            "Create src/components/reports/risk/FloodRiskCard.tsx",
            "Display flood zone designation",
            "Show risk level with color coding",
            "Display FEMA map link",
            "Show insurance estimate",
            "List flood history if available",
            "Style with design system",
            "Write component tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 7B: GEOLOGICAL RISKS
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 85, "Phase 7B: Geological Risks",
        "Create EarthquakeRiskAnalysis service",
        "Implement earthquake risk analysis using USGS data",
        [
            "Create src/lib/analysis/risk/earthquakeRisk.ts",
            "Define EarthquakeRiskAnalysis interface",
            "Implement analyzeEarthquakeRisk(latitude, longitude) function",
            "Call USGS API for seismic hazard data",
            "Parse PGA (Peak Ground Acceleration) values",
            "Map to seismic zones (california, pacific_northwest, new_madrid, etc.)",
            "Calculate risk score",
            "Return complete analysis",
            "Write unit tests"
        ])

    insert_feature(conn, 86, "Phase 7B: Geological Risks",
        "Create SinkholeRiskAnalysis service",
        "Implement sinkhole/karst risk analysis",
        [
            "Create src/lib/analysis/risk/sinkholeRisk.ts",
            "Define SinkholeRiskAnalysis interface",
            "Implement analyzeSinkholeRisk(latitude, longitude, state) function",
            "Check against karst region database (FL, TX, KY, TN, AL, MO, PA)",
            "Query state geological surveys if available",
            "Calculate proximity to known sinkholes",
            "Return risk analysis",
            "Write unit tests"
        ])

    insert_feature(conn, 87, "Phase 7B: Geological Risks",
        "Create SlopeRiskAnalysis service",
        "Implement slope/landslide risk analysis",
        [
            "Create src/lib/analysis/risk/slopeRisk.ts",
            "Define SlopeRiskAnalysis interface",
            "Implement analyzeSlopeRisk(latitude, longitude) function",
            "Query elevation data API",
            "Calculate slope percentage",
            "Determine landslide susceptibility",
            "Return risk analysis",
            "Write unit tests"
        ])

    insert_feature(conn, 88, "Phase 7B: Geological Risks",
        "Create GeologicalRiskCard UI component",
        "Build UI component for geological risk display",
        [
            "Create src/components/reports/risk/GeologicalRiskCard.tsx",
            "Display earthquake zone and risk level",
            "Show sinkhole risk if applicable",
            "Display slope/terrain analysis",
            "List geological mitigation options",
            "Style with design system",
            "Write component tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 7C: FIRE & ENVIRONMENTAL RISKS
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 90, "Phase 7C: Fire & Environmental",
        "Create WildfireRiskAnalysis service",
        "Implement wildfire risk analysis using NASA FIRMS",
        [
            "Create src/lib/analysis/risk/wildfireRisk.ts",
            "Define WildfireRiskAnalysis interface",
            "Implement analyzeWildfireRisk(latitude, longitude) function",
            "Call NASA FIRMS API for fire history",
            "Calculate fire frequency within radius",
            "Determine WUI (Wildland-Urban Interface) zone",
            "Calculate vegetation density risk",
            "Return complete analysis",
            "Write unit tests"
        ])

    insert_feature(conn, 91, "Phase 7C: Fire & Environmental",
        "Create EnvironmentalRiskAnalysis service",
        "Implement environmental hazard analysis using EPA data",
        [
            "Create src/lib/analysis/risk/environmentalRisk.ts",
            "Define EnvironmentalRiskAnalysis interface",
            "Implement analyzeEnvironmentalRisk(latitude, longitude) function",
            "Query EPA Envirofacts for Superfund sites",
            "Query for Underground Storage Tanks (UST)",
            "Query for Toxic Release Inventory (TRI) facilities",
            "Query for brownfield sites",
            "Calculate proximity scores",
            "Return complete analysis",
            "Write unit tests"
        ])

    insert_feature(conn, 92, "Phase 7C: Fire & Environmental",
        "Create RadonRiskAnalysis service",
        "Implement radon risk analysis using EPA zone data",
        [
            "Create src/lib/analysis/risk/radonRisk.ts",
            "Define RadonRiskAnalysis interface",
            "Implement analyzeRadonRisk(state, county) function",
            "Map EPA radon zones (Zone 1 high, Zone 2 moderate, Zone 3 low)",
            "Include state-specific radon data",
            "Calculate mitigation cost if needed",
            "Return complete analysis",
            "Write unit tests"
        ])

    insert_feature(conn, 93, "Phase 7C: Fire & Environmental",
        "Create FireEnvironmentalRiskCards UI components",
        "Build UI components for fire and environmental risks",
        [
            "Create src/components/reports/risk/WildfireRiskCard.tsx",
            "Create src/components/reports/risk/EnvironmentalRiskCard.tsx",
            "Create src/components/reports/risk/RadonRiskCard.tsx",
            "Display risk levels with icons",
            "Show nearby hazard locations",
            "List mitigation recommendations",
            "Style consistently",
            "Write component tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 7D: RISK INTEGRATION
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 95, "Phase 7D: Risk Integration",
        "Create RiskAnalyzer orchestrator",
        "Build main orchestrator for all risk analyses",
        [
            "Create src/lib/analysis/risk/riskAnalyzer.ts",
            "Implement analyzePropertyRisk(propertyData) function",
            "Call all risk analysis services in parallel",
            "Aggregate results into RiskAnalysis object",
            "Calculate overall risk score (0-25)",
            "Apply location-adaptive weights",
            "Generate risk summary and recommendations",
            "Return complete RiskAnalysis",
            "Write integration tests"
        ])

    insert_feature(conn, 96, "Phase 7D: Risk Integration",
        "Create location-adaptive risk weights",
        "Implement regional weight adjustments for risk factors",
        [
            "Create src/lib/analysis/risk/riskWeights.ts",
            "Define RISK_REGIONS configuration",
            "Implement calculateAdaptiveWeights(state, lat, lng, coastDistance) function",
            "Adjust flood weight for coastal areas",
            "Adjust earthquake weight for seismic zones",
            "Adjust wildfire weight for western states",
            "Return region-specific weight configuration",
            "Write unit tests"
        ])

    insert_feature(conn, 97, "Phase 7D: Risk Integration",
        "Create calculateRiskCategoryScore for 125-point system",
        "Integrate risk analysis into scoring system",
        [
            "Add to src/lib/analysis/risk/riskAnalyzer.ts",
            "Implement calculateRiskCategoryScore(riskAnalysis) function",
            "Convert risk levels to point scores",
            "Apply category weights",
            "Return score out of 25 points",
            "Integrate with main calculator",
            "Write unit tests"
        ])

    insert_feature(conn, 98, "Phase 7D: Risk Integration",
        "Create RiskOverview UI component",
        "Build comprehensive risk overview component",
        [
            "Create src/components/reports/risk/RiskOverview.tsx",
            "Display overall risk score and grade",
            "Show radar chart of risk categories",
            "List top risk concerns",
            "Display insurance estimates",
            "Show mitigation recommendations",
            "Add expandable detail sections",
            "Write component tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 8A: COST ESTIMATION
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 100, "Phase 8A: Cost Estimation",
        "Create CostBreakdown interfaces and types",
        "Define TypeScript types for cost estimation",
        [
            "Create src/lib/analysis/financial/costTypes.ts",
            "Define CostBreakdown interface with acquisition, rehab, holding, selling",
            "Define RehabBreakdown interface with component costs",
            "Define HoldingBreakdown interface",
            "Define RehabEstimateInput interface",
            "Export all types"
        ])

    insert_feature(conn, 101, "Phase 8A: Cost Estimation",
        "Create regional cost multipliers configuration",
        "Define labor and material cost adjustments for all 50 states",
        [
            "Create src/lib/analysis/financial/regionalMultipliers.ts",
            "Define REGIONAL_MULTIPLIERS for all 50 states",
            "Include metro-level overrides for major cities",
            "Implement getRegionalMultiplier(state, city) function",
            "Document cost sources and methodology",
            "Write unit tests"
        ])

    insert_feature(conn, 102, "Phase 8A: Cost Estimation",
        "Create acquisition cost calculator",
        "Calculate acquisition costs including closing, taxes, fees",
        [
            "Create src/lib/analysis/financial/acquisitionCosts.ts",
            "Implement calculateAcquisitionCosts(purchasePrice, state) function",
            "Calculate closing costs based on state",
            "Calculate transfer taxes using state rates",
            "Calculate auction fees (buyer's premium)",
            "Return AcquisitionCosts breakdown",
            "Write unit tests"
        ])

    insert_feature(conn, 103, "Phase 8A: Cost Estimation",
        "Create rehabilitation cost estimator",
        "Estimate renovation costs based on property condition",
        [
            "Create src/lib/analysis/financial/rehabCosts.ts",
            "Implement estimateRehabCosts(input: RehabEstimateInput) function",
            "Calculate costs by scope: cosmetic, moderate, major, gut",
            "Apply regional labor multipliers",
            "Add contingency buffer (10-20%)",
            "Return RehabBreakdown with component costs",
            "Write unit tests"
        ])

    insert_feature(conn, 104, "Phase 8A: Cost Estimation",
        "Create holding cost calculator",
        "Calculate monthly and total holding costs",
        [
            "Create src/lib/analysis/financial/holdingCosts.ts",
            "Implement calculateHoldingCosts(property, months) function",
            "Calculate property taxes (monthly)",
            "Calculate insurance costs",
            "Calculate utilities estimate",
            "Calculate financing costs if applicable",
            "Return HoldingBreakdown",
            "Write unit tests"
        ])

    insert_feature(conn, 105, "Phase 8A: Cost Estimation",
        "Create selling cost calculator",
        "Calculate costs associated with selling property",
        [
            "Create src/lib/analysis/financial/sellingCosts.ts",
            "Implement calculateSellingCosts(salePrice, state) function",
            "Calculate agent commission (5-6%)",
            "Calculate seller closing costs",
            "Calculate staging and marketing",
            "Calculate transfer taxes if applicable",
            "Return SellingCosts breakdown",
            "Write unit tests"
        ])

    insert_feature(conn, 106, "Phase 8A: Cost Estimation",
        "Create total investment calculator",
        "Aggregate all costs into total investment",
        [
            "Create src/lib/analysis/financial/totalInvestment.ts",
            "Implement calculateTotalInvestment(costs: CostBreakdown) function",
            "Sum acquisition, rehab, holding, selling costs",
            "Return total with confidence level",
            "Write unit tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 8B: ROI CALCULATOR
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 110, "Phase 8B: ROI Calculator",
        "Create InvestmentMetrics interfaces",
        "Define types for ROI and investment calculations",
        [
            "Create src/lib/analysis/financial/types.ts (or add to existing)",
            "Define InvestmentMetrics interface",
            "Define RevenueProjection interface with sale and rental scenarios",
            "Define InflationAdjustment interface",
            "Define BRRRRAnalysis interface",
            "Export all types"
        ])

    insert_feature(conn, 111, "Phase 8B: ROI Calculator",
        "Create IRR calculator using Newton-Raphson",
        "Implement Internal Rate of Return calculation",
        [
            "Create src/lib/analysis/financial/roiCalculator.ts",
            "Implement calculateIRR(cashFlows) function using Newton-Raphson iteration",
            "Handle convergence and edge cases",
            "Implement generateCashFlows helper function",
            "Add tolerance and max iterations parameters",
            "Write unit tests with known IRR values"
        ])

    insert_feature(conn, 112, "Phase 8B: ROI Calculator",
        "Create ROI and annualized return calculator",
        "Calculate basic ROI and annualized returns",
        [
            "Add to src/lib/analysis/financial/roiCalculator.ts",
            "Implement calculateROI(netProfit, cashInvested) function",
            "Implement calculateAnnualizedROI(roi, holdingMonths) using CAGR",
            "Handle sub-year holding periods correctly",
            "Write unit tests"
        ])

    insert_feature(conn, 113, "Phase 8B: ROI Calculator",
        "Create cash-on-cash return calculator",
        "Calculate cash-on-cash returns for rental analysis",
        [
            "Add to src/lib/analysis/financial/roiCalculator.ts",
            "Implement calculateCashOnCash(annualCashFlow, cashInvested) function",
            "Handle rental income scenarios",
            "Write unit tests"
        ])

    insert_feature(conn, 114, "Phase 8B: ROI Calculator",
        "Create complete investment metrics calculator",
        "Main function calculating all investment metrics",
        [
            "Add to src/lib/analysis/financial/roiCalculator.ts",
            "Implement calculateInvestmentMetrics(costs, revenue, riskScore, months) function",
            "Calculate: grossProfit, netProfit, profitMargin, roi, annualizedRoi",
            "Calculate: cashOnCash, irr, priceToARV, breakEvenPrice",
            "Calculate: riskAdjustedReturn",
            "Return complete InvestmentMetrics object",
            "Write integration tests"
        ])

    insert_feature(conn, 115, "Phase 8B: ROI Calculator",
        "Create inflation adjustment utilities",
        "Calculate real returns adjusted for inflation",
        [
            "Add to src/lib/analysis/financial/roiCalculator.ts",
            "Implement adjustForInflation(value, years, rate) function",
            "Implement calculateRealReturn(nominalReturn, inflationRate) using Fisher equation",
            "Default to 3% annual inflation",
            "Write unit tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 8C: COMPARABLES ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 120, "Phase 8C: Comparables",
        "Create comparables type definitions",
        "Define types for comparable sales analysis",
        [
            "Create src/lib/analysis/financial/types/comparables.ts",
            "Define ComparablesAnalysis interface",
            "Define ComparableSale interface with all fields",
            "Define PriceAdjustments interface",
            "Define SubjectProperty and ExtendedSubjectProperty interfaces",
            "Define ComparablesFetchOptions interface",
            "Export all types"
        ])

    insert_feature(conn, 121, "Phase 8C: Comparables",
        "Create adjustment values configuration",
        "Define standard adjustment values for comparables",
        [
            "Create src/lib/analysis/financial/config/adjustmentValues.ts",
            "Define ADJUSTMENT_VALUES configuration object",
            "Include sqft, bedroom, bathroom, age adjustments",
            "Include garage, basement, pool, view adjustments",
            "Include market condition and time adjustments",
            "Document sources and methodology",
            "Export configuration"
        ])

    insert_feature(conn, 122, "Phase 8C: Comparables",
        "Create comparables selection and filtering",
        "Implement logic to filter and select relevant comparables",
        [
            "Create src/lib/analysis/financial/comparablesSelection.ts",
            "Define DEFAULT_SELECTION_CRITERIA",
            "Implement filterComparables(comps, subject, criteria) function",
            "Filter by distance, size, beds/baths, age, sale date",
            "Implement getCompatiblePropertyTypes helper",
            "Write unit tests"
        ])

    insert_feature(conn, 123, "Phase 8C: Comparables",
        "Create similarity score calculator",
        "Calculate similarity scores between properties",
        [
            "Create src/lib/analysis/financial/similarityScore.ts",
            "Implement calculateSimilarityScore(subject, comparable) function",
            "Weight factors: distance, size, beds/baths, age, property type",
            "Return score from 0-100",
            "Write unit tests"
        ])

    insert_feature(conn, 124, "Phase 8C: Comparables",
        "Create price adjustment calculator",
        "Calculate and apply adjustments to comparable prices",
        [
            "Create src/lib/analysis/financial/priceAdjustments.ts",
            "Implement calculateAdjustments(subject, comparable) function",
            "Calculate each adjustment type (sqft, beds, baths, etc.)",
            "Sum adjustments and apply to sale price",
            "Return PriceAdjustments object and adjusted price",
            "Write unit tests"
        ])

    insert_feature(conn, 125, "Phase 8C: Comparables",
        "Create ARV calculator from comparables",
        "Calculate After Repair Value using weighted comparables",
        [
            "Create src/lib/analysis/financial/arvCalculator.ts",
            "Implement calculateARV(comparables, subject) function",
            "Weight comparables by similarity score",
            "Calculate weighted average adjusted price",
            "Determine confidence level from data quality",
            "Return ARVCalculation with range and confidence",
            "Write unit tests"
        ])

    insert_feature(conn, 126, "Phase 8C: Comparables",
        "Create comparables analysis orchestrator",
        "Main service coordinating comparables analysis",
        [
            "Create src/lib/analysis/financial/comparablesAnalyzer.ts",
            "Implement analyzeComparables(subject, options) function",
            "Fetch comparables from API",
            "Filter and select relevant comparables",
            "Calculate similarity scores",
            "Apply price adjustments",
            "Calculate ARV",
            "Return complete ComparablesAnalysis",
            "Write integration tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 8D: RECOMMENDATIONS ENGINE
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 130, "Phase 8D: Recommendations",
        "Create recommendation types and thresholds",
        "Define types and thresholds for recommendations",
        [
            "Create src/lib/analysis/recommendations/types.ts",
            "Define Recommendation enum: STRONG_BUY, BUY, HOLD, CAUTION, AVOID",
            "Define RecommendationResult interface",
            "Define RECOMMENDATION_THRESHOLDS configuration",
            "Define investment criteria thresholds",
            "Export all types"
        ])

    insert_feature(conn, 131, "Phase 8D: Recommendations",
        "Create recommendation engine",
        "Generate investment recommendations from analysis",
        [
            "Create src/lib/analysis/recommendations/recommendationEngine.ts",
            "Implement generateRecommendation(score, risk, financial) function",
            "Apply threshold logic for each recommendation level",
            "Consider risk-adjusted returns",
            "Generate reasoning text",
            "Return RecommendationResult",
            "Write unit tests"
        ])

    insert_feature(conn, 132, "Phase 8D: Recommendations",
        "Create deal quality analyzer",
        "Analyze and score overall deal quality",
        [
            "Create src/lib/analysis/recommendations/dealQuality.ts",
            "Implement analyzeDealQuality(metrics) function",
            "Score: price_to_arv_ratio, profit_margin, roi, risk_level",
            "Generate strengths and weaknesses list",
            "Calculate deal score out of 100",
            "Return DealQualityAnalysis",
            "Write unit tests"
        ])

    insert_feature(conn, 133, "Phase 8D: Recommendations",
        "Create action items generator",
        "Generate actionable next steps based on analysis",
        [
            "Create src/lib/analysis/recommendations/actionItems.ts",
            "Implement generateActionItems(analysis) function",
            "Prioritize: due diligence, inspections, title search",
            "Include risk mitigation actions",
            "Include financing preparation",
            "Return prioritized ActionItem list",
            "Write unit tests"
        ])

    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 8E: FINANCIAL UI COMPONENTS
    # ═══════════════════════════════════════════════════════════════════════════

    insert_feature(conn, 140, "Phase 8E: Financial UI",
        "Create CostBreakdownCard component",
        "Build UI for displaying cost breakdown",
        [
            "Create src/components/reports/financial/CostBreakdownCard.tsx",
            "Display acquisition, rehab, holding, selling costs",
            "Show total investment prominently",
            "Add expandable detail sections",
            "Include pie chart visualization",
            "Style with design system",
            "Write component tests"
        ])

    insert_feature(conn, 141, "Phase 8E: Financial UI",
        "Create ROIMetricsCard component",
        "Build UI for displaying ROI and returns",
        [
            "Create src/components/reports/financial/ROIMetricsCard.tsx",
            "Display ROI, annualized ROI, IRR",
            "Show profit margin and net profit",
            "Display break-even price",
            "Color code based on performance",
            "Add tooltips explaining metrics",
            "Write component tests"
        ])

    insert_feature(conn, 142, "Phase 8E: Financial UI",
        "Create ComparablesGrid component",
        "Build grid display for comparable properties",
        [
            "Create src/components/reports/financial/ComparablesGrid.tsx",
            "Display comparable properties in responsive grid",
            "Show key metrics: price, sqft, similarity score",
            "Highlight adjustments applied",
            "Show ARV summary",
            "Add sorting and filtering",
            "Write component tests"
        ])

    insert_feature(conn, 143, "Phase 8E: Financial UI",
        "Create RecommendationPanel component",
        "Build panel for displaying recommendation and reasoning",
        [
            "Create src/components/reports/financial/RecommendationPanel.tsx",
            "Display recommendation badge (Strong Buy, Buy, etc.)",
            "Show confidence level indicator",
            "List key factors in recommendation",
            "Display action items",
            "Style with appropriate colors",
            "Write component tests"
        ])

    insert_feature(conn, 144, "Phase 8E: Financial UI",
        "Create InvestmentScenarioToggle component",
        "Allow switching between flip and rental analysis",
        [
            "Create src/components/reports/financial/InvestmentScenarioToggle.tsx",
            "Toggle between Flip and Rental scenarios",
            "Show relevant metrics for selected scenario",
            "Update all dependent components",
            "Persist preference",
            "Write component tests"
        ])

    insert_feature(conn, 145, "Phase 8E: Financial UI",
        "Create FinancialAnalysisPage layout",
        "Build complete financial analysis page",
        [
            "Create src/app/properties/[id]/financials/page.tsx",
            "Layout all financial components",
            "Fetch data using React Query",
            "Add loading and error states",
            "Make responsive for all screens",
            "Add print styles",
            "Write integration tests"
        ])

    print(f"[OK] Created {conn.execute('SELECT COUNT(*) FROM features').fetchone()[0]} features")

def main():
    """Main entry point."""
    # Remove existing database
    if DB_PATH.exists():
        DB_PATH.unlink()
        print(f"[REMOVED] Removed existing database: {DB_PATH}")

    # Create and populate database
    conn = create_database()
    print(f"[CREATED] Created database: {DB_PATH}")

    populate_features(conn)

    # Print summary
    cursor = conn.cursor()
    categories = cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM features
        GROUP BY category
        ORDER BY MIN(priority)
    """).fetchall()

    print("\n[SUMMARY] Features by Category:")
    for category, count in categories:
        print(f"   {category}: {count} features")

    total = cursor.execute("SELECT COUNT(*) FROM features").fetchone()[0]
    print(f"\n[OK] Total: {total} features ready for autocoder")

    conn.close()

if __name__ == "__main__":
    main()
