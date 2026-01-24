# Scoring Categories Reference Guide

**Tax Deed Flow - 125-Point Investment Scoring System**

Version 1.0.0 | Last Updated: January 2026

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Location Category (25 points)](#location-category-25-points)
3. [Risk Category (25 points)](#risk-category-25-points)
4. [Financial Category (25 points)](#financial-category-25-points)
5. [Market Category (25 points)](#market-category-25-points)
6. [Profit Category (25 points)](#profit-category-25-points)
7. [Regional Adjustments](#regional-adjustments)
8. [Property Type Considerations](#property-type-considerations)
9. [Grade System](#grade-system)
10. [Missing Data Handling](#missing-data-handling)

---

## System Overview

The **125-Point Investment Scoring System** evaluates tax deed properties across **5 equally-weighted categories**, each worth **25 points**. Each category contains **5 components** worth **5 points each**.

### Scoring Structure

```
Total Score: 125 points
├── Location (25 points)
│   ├── Walkability (5 points)
│   ├── Crime Safety (5 points)
│   ├── School Quality (5 points)
│   ├── Nearby Amenities (5 points)
│   └── Transit Access (5 points)
│
├── Risk (25 points)
│   ├── Flood Zone (5 points)
│   ├── Environmental Hazards (5 points)
│   ├── Structural Risk (5 points)
│   ├── Title Issues (5 points)
│   └── Zoning Compliance (5 points)
│
├── Financial (25 points)
│   ├── Tax Efficiency (5 points)
│   ├── Lien Complexity (5 points)
│   ├── Assessment Ratio (5 points)
│   ├── Redemption Risk (5 points)
│   └── Holding Costs (5 points)
│
├── Market (25 points)
│   ├── Days on Market (5 points)
│   ├── Price Trend (5 points)
│   ├── Inventory Level (5 points)
│   ├── Absorption Rate (5 points)
│   └── Competition Level (5 points)
│
└── Profit (25 points)
    ├── ROI Potential (5 points)
    ├── Cash Flow (5 points)
    ├── Equity Margin (5 points)
    ├── Exit Options (5 points)
    └── Time to Profit (5 points)
```

### Key Principles

- **Equal Weighting**: Each category represents 20% of the total score
- **Component Independence**: Each component is scored independently using specific formulas
- **Normalization**: Raw values are normalized to a 0-5 scale
- **Regional Adjustments**: State and metro-specific multipliers account for local market conditions
- **Missing Data Handling**: Sophisticated strategies for incomplete data (see [Missing Data Handling](#missing-data-handling))
- **Confidence Tracking**: Every score includes a confidence level (0-100%)

---

## Location Category (25 points)

**Purpose**: Evaluates neighborhood quality, accessibility, and amenities that affect property desirability and resale value.

**Weight**: 20% of total score (25 of 125 points)

### Components

#### 1. Walkability (5 points)

**What it measures**: How easy it is to accomplish errands on foot.

**Data Source**: WalkScore.com API

**Scoring Formula**:
```
Raw Value: Walk Score (0-100)
Normalized: (Walk Score / 100) × 5
Score Range: 0-5 points
```

**Interpretation**:
- **90-100** (4.5-5.0 pts): Walker's Paradise - daily errands do not require a car
- **70-89** (3.5-4.4 pts): Very Walkable - most errands can be accomplished on foot
- **50-69** (2.5-3.4 pts): Somewhat Walkable - some errands can be accomplished on foot
- **25-49** (1.25-2.4 pts): Car-Dependent - most errands require a car
- **0-24** (0-1.24 pts): Very Car-Dependent - almost all errands require a car

**Example**:
```
Property: 123 Main St, Philadelphia, PA
Walk Score: 82
Calculation: (82 / 100) × 5 = 4.1 points
Rating: Very Walkable
```

**Missing Data Strategy**: Default to neutral (2.5 points) with 20% confidence penalty

---

#### 2. Crime Safety (5 points)

**What it measures**: Neighborhood safety based on crime statistics (inverted - lower crime = higher score).

**Data Sources**: FBI Crime Statistics, Local Police Departments, CrimeGrade.org

**Scoring Formula**:
```
Raw Value: Crime Index (0-100, higher = more crime)
Inverted: 100 - Crime Index
Normalized: ((100 - Crime Index) / 100) × 5
Score Range: 0-5 points
```

**Interpretation**:
- **Crime Index 0-20** (4.0-5.0 pts): Very Safe
- **Crime Index 21-40** (3.0-3.9 pts): Above Average Safety
- **Crime Index 41-60** (2.0-2.9 pts): Average Safety
- **Crime Index 61-80** (1.0-1.9 pts): Below Average Safety
- **Crime Index 81-100** (0-0.9 pts): High Crime Area

**Example**:
```
Property: 456 Oak Ave, Blair County, PA
Crime Index: 35 (lower than national average)
Calculation: ((100 - 35) / 100) × 5 = 3.25 points
Rating: Above Average Safety
```

**Missing Data Strategy**: Default to conservative (1.5 points) with 25% confidence penalty (safety is critical)

---

#### 3. School Quality (5 points)

**What it measures**: Quality of nearby schools, affecting family appeal and resale value.

**Data Sources**: GreatSchools.org, Niche.com

**Scoring Formula**:
```
Raw Value: School Rating (1-10 scale)
Normalized: ((Rating - 1) / 9) × 5
Score Range: 0-5 points
```

**Interpretation**:
- **Rating 9-10** (4.4-5.0 pts): Excellent Schools
- **Rating 7-8** (3.3-4.3 pts): Good Schools
- **Rating 5-6** (2.2-3.2 pts): Average Schools
- **Rating 3-4** (1.1-2.1 pts): Below Average Schools
- **Rating 1-2** (0-1.0 pts): Poor Schools

**Example**:
```
Property: 789 Elm St, State College, PA
Overall School Rating: 8
Calculation: ((8 - 1) / 9) × 5 = 3.89 points
Rating: Good Schools
```

**Missing Data Strategy**: Default to neutral (2.5 points) with 15% confidence penalty

---

#### 4. Nearby Amenities (5 points)

**What it measures**: Quality and quantity of restaurants, shopping, parks, and services nearby.

**Data Source**: Google Places API, Yelp Fusion API

**Scoring Formula**:
```
Amenity Score = (
  (Restaurants within 1 mile × 1.0) +
  (Grocery stores within 1 mile × 2.0) +
  (Parks within 1 mile × 1.5) +
  (Hospitals within 5 miles × 1.0) +
  (Shopping centers within 2 miles × 1.0)
) / 20

Normalized: (Amenity Score / 100) × 5
Score Range: 0-5 points
```

**Interpretation**:
- **Score 80-100** (4.0-5.0 pts): Exceptional Amenities
- **Score 60-79** (3.0-3.9 pts): Good Amenities
- **Score 40-59** (2.0-2.9 pts): Average Amenities
- **Score 20-39** (1.0-1.9 pts): Limited Amenities
- **Score 0-19** (0-0.9 pts): Few Amenities

**Example**:
```
Property: 321 Pine Rd, Altoona, PA
Restaurants: 15 (15 pts)
Grocery: 3 (6 pts)
Parks: 4 (6 pts)
Hospitals: 2 (2 pts)
Shopping: 5 (5 pts)
Total: 34 points
Amenity Score: 34/20 = 1.7 (capped at 1.0) = 100
Calculation: (100 / 100) × 5 = 5.0 points
Rating: Exceptional Amenities
```

**Missing Data Strategy**: Estimate from peer properties with 10% confidence penalty

---

#### 5. Transit Access (5 points)

**What it measures**: Quality and availability of public transportation.

**Data Source**: WalkScore.com (Transit Score)

**Scoring Formula**:
```
Raw Value: Transit Score (0-100)
Normalized: (Transit Score / 100) × 5
Score Range: 0-5 points
```

**Interpretation**:
- **90-100** (4.5-5.0 pts): Excellent Transit - convenient for most trips
- **70-89** (3.5-4.4 pts): Good Transit - many transit options
- **50-69** (2.5-3.4 pts): Some Transit - a few transit options
- **25-49** (1.25-2.4 pts): Minimal Transit - limited transit options
- **0-24** (0-1.24 pts): No Transit - virtually no public transportation

**Example**:
```
Property: 555 Market St, Pittsburgh, PA
Transit Score: 68
Calculation: (68 / 100) × 5 = 3.4 points
Rating: Some Transit
```

**Missing Data Strategy**: Default to neutral (2.5 points) with 15% confidence penalty

---

### Location Category Example

**Property**: 123 Main St, State College, PA

| Component | Raw Value | Score | Weight |
|-----------|-----------|-------|--------|
| Walkability | Walk Score: 75 | 3.75 | 5 pts |
| Crime Safety | Crime Index: 28 | 3.60 | 5 pts |
| School Quality | Rating: 8/10 | 3.89 | 5 pts |
| Nearby Amenities | Amenity Score: 72 | 3.60 | 5 pts |
| Transit Access | Transit Score: 55 | 2.75 | 5 pts |
| **Total** | | **17.59** | **25 pts** |

**Category Score**: 17.59 / 25 (70.4%)
**Grade**: B
**Confidence**: 85% (all data sources available)

---

## Risk Category (25 points)

**Purpose**: Evaluates natural hazards, environmental concerns, and legal risks that could impact investment viability.

**Weight**: 20% of total score (25 of 125 points)

### Components

#### 1. Flood Zone (5 points)

**What it measures**: FEMA flood zone classification and associated insurance requirements.

**Data Source**: FEMA National Flood Hazard Layer

**Scoring Formula**:
```
Flood Zone Scoring:
- Zone X (Minimal Risk): 5.0 points
- Zone B/C (Moderate Risk): 3.5 points
- Zone A/AE (High Risk - 100-year flood): 1.5 points
- Zone V/VE (Coastal High Risk): 0.5 points

Additional Penalties:
- Flood insurance required: -0.5 points
- Base flood elevation > property elevation: -1.0 points
```

**Interpretation**:
- **5.0 pts**: Minimal flood risk, no insurance required
- **3.5 pts**: Moderate risk, insurance may be recommended
- **1.5 pts**: High risk, flood insurance required, adds to holding costs
- **0.5 pts**: Extreme risk, high insurance costs, limited financing options

**Example**:
```
Property: 789 River Rd, Harrisburg, PA
Flood Zone: AE (100-year floodplain)
Insurance Required: Yes
Base Flood Elevation: 2 ft above property
Calculation: 1.5 pts - 0.5 pts = 1.0 points
Rating: High Flood Risk (significant concern)
```

**Missing Data Strategy**: Default to conservative (1.5 points) with 30% confidence penalty

---

#### 2. Environmental Hazards (5 points)

**What it measures**: Proximity to EPA Superfund sites, brownfields, and air quality concerns.

**Data Sources**: EPA Envirofacts, Air Quality Index

**Scoring Formula**:
```
Hazard Score = 5.0 - (
  (Superfund sites within 1 mile × 1.5) +
  (Brownfield sites within 0.5 mile × 1.0) +
  (AQI penalty if AQI > 100: (AQI - 100) / 50)
)

Minimum: 0 points
Maximum: 5 points
```

**Interpretation**:
- **4.5-5.0 pts**: No environmental concerns
- **3.0-4.4 pts**: Minor concerns, manageable
- **2.0-2.9 pts**: Moderate concerns, due diligence required
- **1.0-1.9 pts**: Significant concerns, may affect resale
- **0-0.9 pts**: Major environmental hazards, avoid investment

**Example**:
```
Property: 222 Industrial Blvd, Johnstown, PA
Superfund Sites (1 mi): 1
Brownfield Sites (0.5 mi): 2
Air Quality Index: 85 (good)
Calculation: 5.0 - (1 × 1.5 + 2 × 1.0 + 0) = 5.0 - 3.5 = 1.5 points
Rating: Significant Environmental Concerns
```

**Missing Data Strategy**: Default to optimistic (3.5 points) with 10% confidence penalty (most areas are clean)

---

#### 3. Structural Risk (5 points)

**What it measures**: Earthquake, wildfire, hurricane, and terrain slope risks.

**Data Sources**: USGS Seismic Hazard Maps, NOAA Hurricane Risk, Regrid Terrain Data

**Scoring Formula**:
```
Natural Hazard Score = Average of:
- Earthquake Risk: (100 - Seismic Hazard Index) / 20
- Wildfire Risk: (100 - Wildfire Hazard Index) / 20
- Hurricane Risk: (100 - Hurricane Risk Index) / 20
- Terrain Slope: min(Slope × 0.1, 1.0) (penalty for steep slopes)

Score Range: 0-5 points
```

**Regional Adjustments**:
- **California**: Earthquake risk × 0.7 (high seismic activity)
- **Florida**: Hurricane risk × 0.8 (frequent hurricanes)
- **Arizona**: Wildfire risk × 0.85 (elevated wildfire zones)

**Example**:
```
Property: 444 Hill Dr, Blair County, PA
Earthquake Risk Index: 15 (low) → (100-15)/20 = 4.25
Wildfire Risk Index: 10 (minimal) → (100-10)/20 = 4.50
Hurricane Risk Index: 5 (minimal) → (100-5)/20 = 4.75
Terrain Slope: 8% → 8 × 0.1 = 0.8
Average: (4.25 + 4.50 + 4.75 - 0.8) / 4 = 3.18 points
Rating: Low Structural Risk
```

**Missing Data Strategy**: Default to optimistic (3.5 points) with 10% confidence penalty

---

#### 4. Title Issues (5 points)

**What it measures**: Complexity and risk of title defects, liens, and ownership clarity.

**Data Sources**: County Recorder, Title Search Reports

**Scoring Formula**:
```
Title Clarity Score = 5.0 - (
  (Number of liens × 0.5) +
  (Tax lien age > 3 years: 0.5) +
  (Ownership disputes: 1.5) +
  (Easement complications: 0.5) +
  (Redemption period remaining > 6 months: 0.5)
)

Minimum: 0 points
Maximum: 5 points
```

**Interpretation**:
- **4.5-5.0 pts**: Clean title, minimal risk
- **3.0-4.4 pts**: Minor title issues, easily resolved
- **2.0-2.9 pts**: Moderate title concerns, legal review needed
- **1.0-1.9 pts**: Significant title problems, high legal costs
- **0-0.9 pts**: Major title defects, avoid unless deeply discounted

**Example**:
```
Property: 111 County Rd, Centre County, PA
Liens: 2 (tax + municipal utility)
Tax Lien Age: 2 years
Ownership Disputes: None
Easements: Standard utility easement
Redemption Period: 9 months remaining
Calculation: 5.0 - (2×0.5 + 0 + 0 + 0.5 + 0.5) = 5.0 - 2.0 = 3.0 points
Rating: Moderate Title Concerns
```

**Missing Data Strategy**: Default to conservative (1.5 points) with 40% confidence penalty (title issues are common in tax deeds)

---

#### 5. Zoning Compliance (5 points)

**What it measures**: Current zoning status, permitted uses, and compliance with local ordinances.

**Data Sources**: County Zoning Office, Municipal Planning Department

**Scoring Formula**:
```
Zoning Score = 5.0 - (
  (Non-conforming use: 1.5) +
  (Zoning violations: 1.0 each) +
  (Restrictive zoning reducing use: 1.0) +
  (Pending rezoning uncertainty: 0.5)
)

Bonus:
  (Flexible zoning allowing multiple uses: +0.5)

Minimum: 0 points
Maximum: 5 points
```

**Interpretation**:
- **4.5-5.0 pts**: Compliant, flexible zoning
- **3.0-4.4 pts**: Compliant, standard zoning
- **2.0-2.9 pts**: Minor violations or restrictive zoning
- **1.0-1.9 pts**: Significant zoning issues
- **0-0.9 pts**: Major non-compliance, re-zoning required

**Example**:
```
Property: 888 Commercial Dr, Huntingdon County, PA
Current Zoning: C-1 (Commercial)
Use: Retail (permitted)
Violations: None
Flexibility: Allows retail, office, residential (mixed-use)
Calculation: 5.0 - 0 + 0.5 (flexibility bonus) = 5.0 points (capped)
Rating: Excellent Zoning Compliance
```

**Missing Data Strategy**: Default to conservative (1.5 points) with 35% confidence penalty

---

### Risk Category Example

**Property**: 456 Valley View Ln, Bedford County, PA

| Component | Raw Data | Score | Weight |
|-----------|----------|-------|--------|
| Flood Zone | Zone X (Minimal) | 5.0 | 5 pts |
| Environmental Hazards | No sites nearby, AQI 72 | 5.0 | 5 pts |
| Structural Risk | Low earthquake/wildfire/hurricane, 5% slope | 4.2 | 5 pts |
| Title Issues | 1 lien, clean title otherwise | 4.0 | 5 pts |
| Zoning Compliance | Compliant residential, no violations | 5.0 | 5 pts |
| **Total** | | **23.2** | **25 pts** |

**Category Score**: 23.2 / 25 (92.8%)
**Grade**: A
**Confidence**: 75% (some estimated data for structural risk)

---

## Financial Category (25 points)

**Purpose**: Evaluates tax efficiency, lien exposure, and holding costs that impact investment returns.

**Weight**: 20% of total score (25 of 125 points)

### Components

#### 1. Tax Efficiency (5 points)

**What it measures**: Ratio of tax debt to property value (lower = better deal).

**Data Sources**: County Tax Records, Assessed Value, Market Value Estimates

**Scoring Formula**:
```
Tax-to-Value Ratio = Total Debt / Assessed Value

Score:
- Ratio < 5%: 5.0 points (excellent)
- Ratio 5-10%: 4.0 points (good)
- Ratio 10-20%: 3.0 points (average)
- Ratio 20-30%: 2.0 points (below average)
- Ratio 30-50%: 1.0 points (poor)
- Ratio > 50%: 0.5 points (very poor)
```

**Interpretation**:
- **< 5%**: Deeply discounted property, high equity margin
- **5-10%**: Good value, solid equity position
- **10-20%**: Fair value, moderate equity
- **20-30%**: Limited equity, higher risk
- **> 30%**: Minimal equity, avoid unless property has other strong merits

**Example**:
```
Property: 777 Oak St, Blair County, PA
Total Debt: $8,500
Assessed Value: $95,000
Ratio: $8,500 / $95,000 = 8.95%
Score: 4.0 points (Good)
```

**Missing Data Strategy**: **Requires data** (cannot score without debt and value) - 50% confidence penalty

---

#### 2. Lien Complexity (5 points)

**What it measures**: Number and types of liens affecting the property.

**Data Sources**: County Recorder, Title Search

**Scoring Formula**:
```
Lien Score = 5.0 - (
  (Tax liens × 0.3) +
  (Municipal liens × 0.4) +
  (Mortgage liens × 0.5) +
  (Mechanic liens × 0.6) +
  (Federal liens × 1.0)
)

Minimum: 0 points
Maximum: 5 points
```

**Interpretation**:
- **5.0 pts**: Clean title, no liens beyond tax debt
- **3.5-4.9 pts**: 1-2 simple liens, easily resolvable
- **2.0-3.4 pts**: Multiple liens, moderate complexity
- **1.0-1.9 pts**: Complex lien situation, legal assistance needed
- **0-0.9 pts**: Severe lien issues, may exceed property value

**Example**:
```
Property: 333 Maple Ave, Centre County, PA
Tax Liens: 2 (2021, 2022)
Municipal Lien: 1 (water/sewer)
Mortgage: None (foreclosed)
Mechanic Lien: None
Federal Lien: None
Calculation: 5.0 - (2×0.3 + 1×0.4 + 0 + 0 + 0) = 5.0 - 1.0 = 4.0 points
Rating: Simple Liens, Manageable
```

**Missing Data Strategy**: Default to conservative (1.5 points) with 35% confidence penalty

---

#### 3. Assessment Ratio (5 points)

**What it measures**: Accuracy of assessed value vs. true market value.

**Data Sources**: County Assessment, Comparable Sales, Zillow/Redfin Estimates

**Scoring Formula**:
```
Assessment Ratio = Assessed Value / Market Value

Score:
- Ratio 80-100%: 5.0 points (accurately assessed)
- Ratio 70-79%: 4.0 points (slightly under-assessed)
- Ratio 60-69%: 3.0 points (moderately under-assessed)
- Ratio 50-59%: 2.0 points (significantly under-assessed)
- Ratio < 50% or > 100%: 1.0 points (severely inaccurate)
```

**Interpretation**:
- **80-100%**: Reliable value estimate, low reassessment risk
- **70-79%**: Slightly conservative, minor upside potential
- **60-69%**: Possible reassessment, plan for tax increase
- **< 60%**: High reassessment risk, factor into holding costs

**Example**:
```
Property: 999 Pine Ln, Huntingdon County, PA
Assessed Value: $72,000
Market Value (comps): $85,000
Ratio: $72,000 / $85,000 = 84.7%
Score: 5.0 points (Accurately Assessed)
```

**Missing Data Strategy**: Skip component if no comparable sales data - 25% confidence penalty

---

#### 4. Redemption Risk (5 points)

**What it measures**: Likelihood that the property owner will redeem before transfer.

**Data Sources**: State Redemption Laws, Property History, Owner Contact Attempts

**Scoring Formula**:
```
Redemption Risk Score = 5.0 - (
  (Owner occupied: 1.5) +
  (Property value > $150k: 1.0) +
  (Redemption period > 6 months: 0.5) +
  (Owner has responded to contact: 1.0) +
  (Recent payment history: 0.5)
)

Minimum: 0 points
Maximum: 5 points
```

**State Adjustments**:
- **Pennsylvania**: Upset sales (low risk), Judicial sales (moderate risk), Repository sales (very low risk)
- **Florida**: No redemption period after sale (5.0 points)
- **Texas**: 6-month redemption (apply standard formula)

**Example**:
```
Property: 666 Birch Rd, Blair County, PA (Repository Sale)
Owner Occupied: No (vacant 3+ years)
Value: $68,000
Redemption Period: None (repository sale)
Owner Contact: None
Payment History: None in 4 years
Calculation: 5.0 - 0 = 5.0 points
Rating: No Redemption Risk
```

**Missing Data Strategy**: Default to conservative (1.5 points) with 30% confidence penalty

---

#### 5. Holding Costs (5 points)

**What it measures**: Annual costs to maintain property until resale.

**Data Sources**: County Tax Rate, HOA Records, Insurance Quotes, Utilities

**Scoring Formula**:
```
Annual Holding Costs =
  Property Taxes +
  Insurance +
  HOA Fees +
  Basic Utilities +
  Maintenance (2% of value)

Holding Cost Ratio = Annual Costs / Assessed Value

Score:
- Ratio < 3%: 5.0 points (low holding costs)
- Ratio 3-5%: 4.0 points (average)
- Ratio 5-7%: 3.0 points (above average)
- Ratio 7-10%: 2.0 points (high)
- Ratio > 10%: 1.0 points (very high)
```

**Example**:
```
Property: 222 Elm St, Centre County, PA
Assessed Value: $90,000
Property Taxes: $2,200/year
Insurance: $800/year
HOA: $0
Utilities: $600/year (vacant)
Maintenance: $1,800/year (2% of value)
Total Annual: $5,400
Ratio: $5,400 / $90,000 = 6.0%
Score: 3.0 points (Above Average Holding Costs)
```

**Missing Data Strategy**: Estimate from peer properties - 30% confidence penalty

---

### Financial Category Example

**Property**: 555 Washington St, Bedford County, PA

| Component | Raw Data | Score | Weight |
|-----------|----------|-------|--------|
| Tax Efficiency | 7.5% ratio | 4.0 | 5 pts |
| Lien Complexity | 2 tax liens only | 4.4 | 5 pts |
| Assessment Ratio | 88% (accurate) | 5.0 | 5 pts |
| Redemption Risk | Repository sale, vacant | 5.0 | 5 pts |
| Holding Costs | 4.2% ratio | 4.0 | 5 pts |
| **Total** | | **22.4** | **25 pts** |

**Category Score**: 22.4 / 25 (89.6%)
**Grade**: A-
**Confidence**: 80% (some estimates for holding costs)

---

## Market Category (25 points)

**Purpose**: Evaluates local supply/demand dynamics, price trends, and competition affecting resale potential.

**Weight**: 20% of total score (25 of 125 points)

### Components

#### 1. Days on Market (5 points)

**What it measures**: How quickly comparable properties are selling.

**Data Sources**: MLS Data, Zillow, Realtor.com

**Scoring Formula**:
```
Median Days on Market (comparable properties):

Score:
- DOM < 30 days: 5.0 points (hot market)
- DOM 30-60 days: 4.0 points (strong market)
- DOM 60-90 days: 3.0 points (balanced market)
- DOM 90-120 days: 2.0 points (slow market)
- DOM > 120 days: 1.0 points (very slow market)
```

**Interpretation**:
- **< 30 days**: High demand, quick resale likely
- **30-60 days**: Good market, plan 2-3 month resale timeline
- **60-90 days**: Typical market, plan 3-4 month timeline
- **> 90 days**: Slow market, may need pricing flexibility or extended holding period

**Example**:
```
Property: 123 Main St, State College, PA
Comparable Sales (last 6 months): 18 properties
Median DOM: 42 days
Score: 4.0 points (Strong Market)
```

**Missing Data Strategy**: Default to neutral (2.5 points) with 20% confidence penalty

---

#### 2. Price Trend (5 points)

**What it measures**: Year-over-year price appreciation in the local market.

**Data Sources**: Zillow Home Value Index, Redfin Market Data, County Records

**Scoring Formula**:
```
YoY Price Change Percentage:

Score:
- Appreciation > 8%: 5.0 points (strong growth)
- Appreciation 4-8%: 4.0 points (healthy growth)
- Appreciation 0-4%: 3.0 points (stable)
- Depreciation 0-4%: 2.0 points (declining)
- Depreciation > 4%: 1.0 points (weak market)
```

**Regional Adjustments**:
- **Florida**: × 1.1 (strong appreciation trend)
- **California**: × 1.15 (historically strong appreciation)
- **Pennsylvania**: × 0.95 (moderate appreciation)

**Example**:
```
Property: 789 College Ave, Centre County, PA
2023 Median: $185,000
2024 Median: $195,500
YoY Change: ($195,500 - $185,000) / $185,000 = 5.68%
Regional Adjustment: 5.68% × 0.95 = 5.40%
Score: 4.0 points (Healthy Growth)
```

**Missing Data Strategy**: Default to neutral (2.5 points) with 25% confidence penalty

---

#### 3. Inventory Level (5 points)

**What it measures**: Housing supply relative to historical norms.

**Data Sources**: MLS Data, Realtor.com Inventory Reports

**Scoring Formula**:
```
Months of Supply = Active Listings / Average Monthly Sales

Score:
- < 3 months: 5.0 points (low inventory, seller's market)
- 3-4 months: 4.0 points (below average inventory)
- 4-6 months: 3.0 points (balanced market)
- 6-9 months: 2.0 points (high inventory)
- > 9 months: 1.0 points (excess inventory, buyer's market)
```

**Interpretation**:
- **< 3 months**: Seller's market, likely multiple offers
- **3-4 months**: Favorable for sellers
- **4-6 months**: Balanced, typical negotiation
- **> 6 months**: Buyer's market, longer holding times

**Example**:
```
Property: 444 Park Dr, Altoona, PA
Active Listings: 85
Monthly Sales: 22
Months of Supply: 85 / 22 = 3.86 months
Score: 4.0 points (Below Average Inventory - Good)
```

**Missing Data Strategy**: Default to neutral (2.5 points) with 20% confidence penalty

---

#### 4. Absorption Rate (5 points)

**What it measures**: Speed at which inventory is being absorbed by buyers.

**Data Sources**: MLS, County Deeds, Market Reports

**Scoring Formula**:
```
Absorption Rate = (Sales / Listings) × 100

Score:
- Rate > 25%: 5.0 points (rapid absorption)
- Rate 20-25%: 4.0 points (strong absorption)
- Rate 15-20%: 3.0 points (moderate absorption)
- Rate 10-15%: 2.0 points (slow absorption)
- Rate < 10%: 1.0 points (very slow absorption)
```

**Example**:
```
Property: 888 Chestnut St, Johnstown, PA
Monthly Sales: 18
Active Listings: 95
Absorption Rate: (18 / 95) × 100 = 18.95%
Score: 3.0 points (Moderate Absorption)
```

**Missing Data Strategy**: Default to neutral (2.5 points) with 20% confidence penalty

---

#### 5. Competition Level (5 points)

**What it measures**: Number of similar tax deed properties available.

**Data Sources**: Upcoming Auction Listings, County Tax Claim Bureau

**Scoring Formula**:
```
Competition Score = 5.0 - (
  (Similar properties in same auction × 0.3) +
  (Similar properties in county pipeline × 0.1) +
  (Recent unsold properties × 0.2)
)

Minimum: 1.0 points
Maximum: 5.0 points
```

**Interpretation**:
- **5.0 pts**: Unique property, low competition
- **3.5-4.9 pts**: Some competition, manageable
- **2.0-3.4 pts**: Moderate competition, strategic bidding needed
- **1.0-1.9 pts**: High competition, may drive up price

**Example**:
```
Property: 111 Spruce Ln, Bedford County, PA
Similar in Auction: 3
Similar in Pipeline: 8
Recent Unsold: 1
Calculation: 5.0 - (3×0.3 + 8×0.1 + 1×0.2) = 5.0 - 1.9 = 3.1 points
Rating: Moderate Competition
```

**Missing Data Strategy**: Default to conservative (1.5 points) with 15% confidence penalty (assume competition)

---

### Market Category Example

**Property**: 777 Liberty St, Centre County, PA

| Component | Raw Data | Score | Weight |
|-----------|----------|-------|--------|
| Days on Market | 38 days median | 4.0 | 5 pts |
| Price Trend | +6.2% YoY | 4.0 | 5 pts |
| Inventory Level | 3.4 months supply | 4.0 | 5 pts |
| Absorption Rate | 22% | 4.0 | 5 pts |
| Competition Level | 2 similar properties | 4.4 | 5 pts |
| **Total** | | **20.4** | **25 pts** |

**Category Score**: 20.4 / 25 (81.6%)
**Grade**: A-
**Confidence**: 70% (some MLS data estimated)

---

## Profit Category (25 points)

**Purpose**: Evaluates ROI potential, cash flow opportunities, and exit strategy viability.

**Weight**: 20% of total score (25 of 125 points)

### Components

#### 1. ROI Potential (5 points)

**What it measures**: Projected return on investment at resale.

**Data Sources**: Market Value, Rehab Estimates, Total Acquisition Cost

**Scoring Formula**:
```
ROI = ((Market Value - Total Cost) / Total Cost) × 100

Total Cost = Purchase Price + Closing + Liens + Rehab + Holding

Score:
- ROI > 50%: 5.0 points (excellent)
- ROI 30-50%: 4.0 points (very good)
- ROI 15-30%: 3.0 points (good)
- ROI 5-15%: 2.0 points (marginal)
- ROI < 5%: 1.0 points (poor)
```

**Interpretation**:
- **> 50%**: Exceptional deal, strong profit margin
- **30-50%**: Solid investment, typical tax deed returns
- **15-30%**: Acceptable return, competitive with alternatives
- **< 15%**: Below target, high risk for limited reward

**Example**:
```
Property: 555 Oak Ridge Dr, Blair County, PA
Market Value: $105,000
Purchase Price: $8,500 (at auction)
Closing Costs: $1,200
Outstanding Liens: $0
Rehab Estimate: $22,000
Holding Costs (6 mo): $3,500
Total Cost: $35,200
ROI: (($105,000 - $35,200) / $35,200) × 100 = 198%
Score: 5.0 points (Excellent)

Note: Capped at 5.0, but this shows exceptional potential
```

**Missing Data Strategy**: **Requires data** (cannot calculate without value and costs) - 50% confidence penalty

---

#### 2. Cash Flow (5 points)

**What it measures**: Potential monthly rental income if held as investment property.

**Data Sources**: Rental Comps (Zillow, Rentometer), Property Condition, Market Rent

**Scoring Formula**:
```
Monthly Cash Flow = Gross Rent - (Mortgage + Taxes + Insurance + Maintenance + Vacancy Reserve)

Cash-on-Cash Return = (Annual Cash Flow / Cash Invested) × 100

Score:
- CoC > 12%: 5.0 points (excellent cash flow)
- CoC 8-12%: 4.0 points (good cash flow)
- CoC 4-8%: 3.0 points (moderate cash flow)
- CoC 0-4%: 2.0 points (minimal cash flow)
- CoC < 0%: 1.0 points (negative cash flow)
```

**Example**:
```
Property: 333 Rental Ave, Altoona, PA
Market Rent: $950/month
Annual Gross: $11,400

Annual Expenses:
- Property Taxes: $2,200
- Insurance: $900
- Maintenance (10%): $1,140
- Vacancy (5%): $570
Total Expenses: $4,810

Annual Cash Flow: $11,400 - $4,810 = $6,590
Cash Invested: $35,000 (all-cash purchase)
CoC Return: ($6,590 / $35,000) × 100 = 18.83%
Score: 5.0 points (Excellent Cash Flow)
```

**Missing Data Strategy**: Skip component if no rental data available - 30% confidence penalty

---

#### 3. Equity Margin (5 points)

**What it measures**: Built-in equity as percentage of market value.

**Data Sources**: Market Value, Total Acquisition Cost

**Scoring Formula**:
```
Equity Margin = ((Market Value - Total Cost) / Market Value) × 100

Score:
- Margin > 60%: 5.0 points (exceptional equity)
- Margin 40-60%: 4.0 points (strong equity)
- Margin 20-40%: 3.0 points (good equity)
- Margin 10-20%: 2.0 points (moderate equity)
- Margin < 10%: 1.0 points (minimal equity)
```

**Interpretation**:
- **> 60%**: Deep discount, significant safety buffer
- **40-60%**: Strong position, room for market fluctuation
- **20-40%**: Decent equity, standard rehab/flip margin
- **< 20%**: Thin margin, vulnerable to cost overruns

**Example**:
```
Property: 999 Valley Dr, Huntingdon County, PA
Market Value: $92,000
Total Cost: $28,500
Equity Margin: (($92,000 - $28,500) / $92,000) × 100 = 69.02%
Score: 5.0 points (Exceptional Equity)
```

**Missing Data Strategy**: **Requires data** (cannot calculate without value and costs) - 50% confidence penalty

---

#### 4. Exit Options (5 points)

**What it measures**: Flexibility of exit strategies (flip, rental, wholesale, etc.).

**Data Sources**: Market Conditions, Property Characteristics, Buyer Demand

**Scoring Formula**:
```
Exit Viability Score:

Assess each exit strategy:
- Retail Flip: Market demand, DOM, condition requirements
- Wholesale: Investor demand, deal quality
- Rental: Rental market, cash flow potential
- Lease-Option: Tenant quality, market strength
- Land Bank: Long-term hold viability

Score = Number of viable exits (1 point each, max 5)
```

**Interpretation**:
- **5 pts**: Maximum flexibility, multiple strong exit paths
- **3-4 pts**: Good options, 3-4 viable strategies
- **2 pts**: Limited options, 1-2 viable paths
- **1 pt**: Single viable exit, higher risk

**Example**:
```
Property: 444 Investment Ln, Centre County, PA
Retail Flip: ✓ (Strong buyer market, good condition)
Wholesale: ✓ (30%+ ROI, attractive to investors)
Rental: ✓ (Strong rental market, positive cash flow)
Lease-Option: ✓ (Good area, tenant demand)
Land Bank: ✗ (Property taxes too high for long hold)

Score: 4.0 points (Good Exit Flexibility)
```

**Missing Data Strategy**: Default to conservative (2.0 points) with 25% confidence penalty

---

#### 5. Time to Profit (5 points)

**What it measures**: Estimated time from acquisition to profitable exit.

**Data Sources**: Rehab Timeline, Market DOM, Rental Absorption

**Scoring Formula**:
```
Time to Profit (months):

For Flip Strategy:
Total Time = Closing (1 mo) + Rehab + Listing + Sale (DOM) + Final Closing (1 mo)

For Rental Strategy:
Total Time = Closing (1 mo) + Rehab + Tenant Search + Lease-up

Score:
- < 3 months: 5.0 points (very fast)
- 3-6 months: 4.0 points (fast)
- 6-9 months: 3.0 points (moderate)
- 9-12 months: 2.0 points (slow)
- > 12 months: 1.0 points (very slow)
```

**Example**:
```
Property: 222 Quick Sale Dr, Blair County, PA
Strategy: Flip

Timeline:
- Closing: 1 month
- Rehab (cosmetic): 2 months
- Listing to Sale: 1.5 months (market DOM: 45 days)
- Final Closing: 1 month
Total: 5.5 months

Score: 4.0 points (Fast Turnaround)
```

**Missing Data Strategy**: Estimate from property type and market - 30% confidence penalty

---

### Profit Category Example

**Property**: 888 Profit Pl, Bedford County, PA

| Component | Raw Data | Score | Weight |
|-----------|----------|-------|--------|
| ROI Potential | 165% ROI | 5.0 | 5 pts |
| Cash Flow | 14% CoC return | 5.0 | 5 pts |
| Equity Margin | 62% equity | 5.0 | 5 pts |
| Exit Options | 4 viable exits | 4.0 | 5 pts |
| Time to Profit | 6 months (flip) | 3.0 | 5 pts |
| **Total** | | **22.0** | **25 pts** |

**Category Score**: 22.0 / 25 (88.0%)
**Grade**: A-
**Confidence**: 75% (some rehab/timeline estimates)

---

## Regional Adjustments

Certain states have unique market conditions, regulations, and risk profiles that require score adjustments.

### State-Level Adjustments

#### Florida (FL)

| Category | Component | Factor | Reason |
|----------|-----------|--------|--------|
| Market | Appreciation Rate | × 1.1 | Strong population growth, no state income tax |
| Risk | Hurricane Risk | × 0.8 | Elevated hurricane risk, insurance costs |
| Risk | Flood Risk | × 0.9 | Coastal and low-lying flood zones |
| Profit | Rent Potential | × 1.1 | Strong rental demand (tourism, retirees) |

#### Texas (TX)

| Category | Component | Factor | Reason |
|----------|-----------|--------|--------|
| Market | Demand | × 1.1 | Business-friendly, job growth |
| Financial | Tax Efficiency | × 0.9 | High property taxes (no income tax) |

#### California (CA)

| Category | Component | Factor | Reason |
|----------|-----------|--------|--------|
| Market | Appreciation Rate | × 1.15 | Historical strong appreciation |
| Risk | Earthquake Risk | × 0.7 | High seismic activity |
| Risk | Wildfire Risk | × 0.8 | Elevated wildfire zones |
| Profit | Rent Potential | × 1.1 | High rental demand, strong market |

#### Pennsylvania (PA)

| Category | Component | Factor | Reason |
|----------|-----------|--------|--------|
| Market | Appreciation Rate | × 0.95 | Moderate appreciation, slower than national avg |
| Financial | Rehab Costs | × 0.9 | Lower construction costs than coastal states |

#### Arizona (AZ)

| Category | Component | Factor | Reason |
|----------|-----------|--------|--------|
| Market | Demand | × 1.15 | Strong migration, retirement destination |
| Risk | Wildfire Risk | × 0.85 | Desert and forest wildfire risk |

#### Georgia (GA)

| Category | Component | Factor | Reason |
|----------|-----------|--------|--------|
| Market | Appreciation Rate | × 1.05 | Growing metro areas (Atlanta) |
| Financial | Tax Efficiency | × 0.95 | Moderate property taxes |

### Metro-Level Adjustments

For properties in major metropolitan areas, additional adjustments may apply:

#### High-Growth Metros (Austin, Miami, Phoenix, etc.)

- **Market Demand**: × 1.2
- **Competition Level**: × 0.9 (higher competition)
- **Appreciation Rate**: × 1.15

#### Declining Population Metros (Rust Belt cities)

- **Market Demand**: × 0.85
- **Days on Market**: × 0.9 (slower sales)
- **Appreciation Rate**: × 0.8

---

## Property Type Considerations

Different property types have different scoring profiles and investment strategies.

### Single-Family Residential

**Typical Strong Scores**:
- Location (high walkability/schools matter)
- Profit (strong resale market)
- Market (highest liquidity)

**Typical Weak Scores**:
- Profit - Cash Flow (lower rental yields than multi-family)

**Adjustments**:
- School Quality: × 1.2 (critical for families)
- Exit Options: +1.0 points (most liquid property type)

---

### Multi-Family Residential

**Typical Strong Scores**:
- Profit - Cash Flow (higher rental income)
- Exit Options (investor demand)

**Typical Weak Scores**:
- Rehab Costs (more units = higher costs)
- Risk - Title Issues (complex ownership history)

**Adjustments**:
- Cash Flow: × 1.3 (multiple rent streams)
- Lien Complexity: × 0.9 (often more liens)

---

### Vacant Land

**Typical Strong Scores**:
- Holding Costs (low taxes, no structure)
- Risk - Structural (no building issues)

**Typical Weak Scores**:
- Profit - ROI (longer development timeline)
- Market - Days on Market (slower to sell)

**Adjustments**:
- Time to Profit: × 0.7 (longer development)
- Zoning Compliance: × 1.2 (critical for land)

---

### Commercial

**Typical Strong Scores**:
- Profit - Cash Flow (higher rents)
- Exit Options (multiple use cases)

**Typical Weak Scores**:
- Market - Days on Market (smaller buyer pool)
- Location - School Quality (irrelevant)

**Adjustments**:
- School Quality: Skip component
- Cash Flow: × 1.5 (commercial rents)
- Days on Market: × 0.8 (longer sales cycles)

---

## Grade System

The final score (0-125) is converted to a letter grade for easy interpretation.

### Grade Thresholds

| Grade | Percentage Range | Points Range | Investment Quality | Recommendation |
|-------|-----------------|--------------|-------------------|----------------|
| **A+** | 95.0-100% | 119-125 pts | **Exceptional** | Strong buy - excellent across all categories |
| **A** | 87.0-94.9% | 109-118 pts | **Excellent** | Strong fundamentals, minimal concerns |
| **A-** | 80.0-86.9% | 100-108 pts | **Very Good** | Solid opportunity with few weaknesses |
| **B+** | 75.0-79.9% | 94-99 pts | **Good** | Good investment, some areas need attention |
| **B** | 67.0-74.9% | 84-93 pts | **Above Average** | Solid opportunity with minor concerns |
| **B-** | 60.0-66.9% | 75-83 pts | **Acceptable** | Proceed with standard due diligence |
| **C+** | 55.0-59.9% | 69-74 pts | **Average** | Borderline - evaluate strengths/weaknesses |
| **C** | 47.0-54.9% | 59-68 pts | **Below Average** | Proceed with caution, deep dive required |
| **C-** | 40.0-46.9% | 50-58 pts | **Marginal** | Significant concerns, extra diligence needed |
| **D+** | 35.0-39.9% | 44-49 pts | **Poor** | Multiple red flags, not recommended |
| **D** | 27.0-34.9% | 34-43 pts | **Very Poor** | Significant risks across categories |
| **D-** | 20.0-26.9% | 25-33 pts | **High Risk** | Not recommended for typical investors |
| **F** | 0.0-19.9% | 0-24 pts | **Unacceptable** | Do not invest - critical issues identified |

### Grade Modifiers

Within each grade level, the position determines the modifier:

- **Top 25%** of range: **+** modifier (e.g., A+)
- **Middle 50%** of range: **No modifier** (e.g., A)
- **Bottom 25%** of range: **-** modifier (e.g., A-)

**Example**:
```
A Grade Range: 100-112 points (13-point range)
- A+: 110-112 (top 25%)
- A: 104-109 (middle 50%)
- A-: 100-103 (bottom 25%)
```

---

## Missing Data Handling

When data is unavailable, the system applies intelligent defaults based on component characteristics.

### Missing Data Strategies

#### 1. Default Neutral (2.5 / 5.0 points)

Used when: Component is not critical, and neutral assumption is reasonable.

**Components**:
- Walkability
- School Quality
- Transit Access
- Appreciation Rate
- Days on Market
- Inventory Level
- Demand

**Confidence Penalty**: 15-25%

---

#### 2. Default Conservative (1.5 / 5.0 points)

Used when: Missing data represents potential risk, and conservative assumption protects investor.

**Components**:
- Crime Safety (safety concern)
- Flood Risk (insurance/damage risk)
- Property Condition (tax deeds often need work)
- Lien Exposure (unknown liens risky)
- Title Clarity (common issues in tax deeds)
- Zoning Compliance (violations possible)
- Redemption Risk (owner may redeem)
- Competition Level (assume competition exists)

**Confidence Penalty**: 25-40%

---

#### 3. Default Optimistic (3.5 / 5.0 points)

Used when: Most properties do NOT have this issue, and optimistic assumption is statistically justified.

**Components**:
- Earthquake Risk (most areas low seismic activity)
- Wildfire Risk (most areas not in wildfire zones)
- Hurricane Risk (most US not hurricane-prone)
- Terrain Slope (most properties buildable)

**Confidence Penalty**: 10-15%

---

#### 4. Estimate from Peers

Used when: Component value can be reliably estimated from similar properties in the area.

**Components**:
- Amenities (geographic clustering)
- Rehab Costs (property-type consistency)

**Methodology**:
1. Find peer properties (same county, similar value range, same property type)
2. Calculate weighted average of peer scores
3. Apply confidence penalty based on peer count

**Confidence Penalty**: 10-30% (depending on peer count)

---

#### 5. Skip Component

Used when: Component cannot be scored without data, but other components can still provide value.

**Components**:
- Value Accuracy (requires comparable sales)
- Cash Flow (requires rental market data)
- Resale Value (requires comparables)
- Rent Potential (requires rental data)

**Behavior**: Component is excluded, and score is calculated from remaining 4 components in that category (each worth 6.25 points instead of 5).

---

#### 6. Require Data (Cannot Score)

Used when: Component is absolutely critical to investment decision.

**Components**:
- Tax Efficiency (need debt and value)
- ROI Potential (need value and costs)
- Profit Margin (need value and costs)

**Behavior**: If data is missing, the entire category score receives a 50% confidence penalty, and the component scores 0 points.

---

### Confidence Tracking

Every score includes a **Confidence Level** (0-100%) that indicates data quality:

| Confidence | Label | Meaning |
|------------|-------|---------|
| **90-100%** | Very High | All data available from reliable sources |
| **75-89%** | High | Most data available, minor estimates |
| **50-74%** | Moderate | Mix of actual and estimated data |
| **25-49%** | Low | Significant data gaps, many defaults used |
| **0-24%** | Very Low | Critical data missing, score unreliable |

**Confidence Formula**:
```
Base Confidence: 100%
- Missing critical data: -50% penalty
- Missing optional data: -25% penalty
- Using default values: Apply component-specific penalty
- Estimated from peers: -10% to -30% (based on peer count)
- Old data (> 1 year): -10% penalty

Final Confidence = max(0, Base - Total Penalties)
```

---

## Usage Examples

### Example 1: Excellent Deal (Grade A)

**Property**: 123 Investment St, State College, PA

| Category | Score | Max | % |
|----------|-------|-----|---|
| Location | 17.5 | 25 | 70% |
| Risk | 23.0 | 25 | 92% |
| Financial | 22.5 | 25 | 90% |
| Market | 20.0 | 25 | 80% |
| Profit | 22.0 | 25 | 88% |
| **Total** | **105.0** | **125** | **84%** |

**Grade**: A
**Confidence**: 85% (High)
**Recommendation**: Excellent investment opportunity. Strong across all categories with minimal risks identified.

---

### Example 2: Marginal Deal (Grade C)

**Property**: 456 Risky Ln, Rural County, PA

| Category | Score | Max | % |
|----------|-------|-----|---|
| Location | 12.0 | 25 | 48% |
| Risk | 15.0 | 25 | 60% |
| Financial | 18.0 | 25 | 72% |
| Market | 10.5 | 25 | 42% |
| Profit | 14.0 | 25 | 56% |
| **Total** | **69.5** | **125** | **55.6%** |

**Grade**: C+
**Confidence**: 60% (Moderate)
**Recommendation**: Below average opportunity. Weak location and market scores. Only proceed if deeply discounted or compensating factors exist (e.g., unique land development potential).

---

### Example 3: Avoid (Grade F)

**Property**: 789 Problem Ave, Distressed City, PA

| Category | Score | Max | % |
|----------|-------|-----|---|
| Location | 8.0 | 25 | 32% |
| Risk | 6.5 | 25 | 26% |
| Financial | 5.0 | 25 | 20% |
| Market | 4.5 | 25 | 18% |
| Profit | 2.0 | 25 | 8% |
| **Total** | **26.0** | **125** | **20.8%** |

**Grade**: D-
**Confidence**: 70% (Moderate - clear data shows major problems)
**Recommendation**: Do not invest. Multiple critical issues: high crime, environmental hazards, negative cash flow potential, extremely slow market.

---

## Conclusion

The **125-Point Investment Scoring System** provides a comprehensive, data-driven framework for evaluating tax deed properties. By breaking down the analysis into 25 discrete components across 5 categories, investors can:

✅ **Identify top opportunities** with objective criteria
✅ **Understand trade-offs** between categories (e.g., great location but weak financials)
✅ **Track confidence** in each score based on data availability
✅ **Compare properties** across different markets and property types
✅ **Make informed decisions** backed by quantifiable metrics

### Key Takeaways

1. **No single category dominates** - all 5 are equally weighted at 20%
2. **Context matters** - regional adjustments and property types affect scores
3. **Data quality is transparent** - confidence levels show reliability
4. **Missing data is handled intelligently** - defaults protect investors when data is unavailable
5. **Grades simplify decisions** - letter grades provide at-a-glance assessment

For detailed implementation, see the scoring algorithm source code at:
- `/TaxDeedFlow/src/lib/scoring/categories/` - Category calculators
- `/TaxDeedFlow/src/lib/scoring/adjustments/` - Regional and property-type adjustments
- `/TaxDeedFlow/src/lib/scoring/utils/` - Missing data handling and normalization

---

**Version**: 1.0.0
**Last Updated**: January 2026
**Author**: Tax Deed Flow Development Team
