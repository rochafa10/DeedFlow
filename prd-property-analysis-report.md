# Product Requirements Document (PRD)
## Tax Deed Property Analysis Report System

**Version:** 1.0  
**Date:** January 12, 2026  
**Author:** Fabricio (Sr. Regional Manager, Tesla Supply Chain Operations)  
**Reference:** Cérebro do Rei dos Flips Report System

---

## 1. Executive Summary

### 1.1 Purpose
Build a comprehensive property analysis report system for tax deed investments that generates professional, shareable reports with investment scoring, risk analysis, financial projections, and market comparables.

### 1.2 Target Users
- Tax deed investors evaluating properties
- Investment partners reviewing shared deals
- Due diligence teams analyzing opportunities

### 1.3 Key Value Proposition
- Automated property analysis with 125-point scoring system
- Risk assessment (flood, earthquake, wildfire, hurricane)
- Financial analysis with ROI/margin calculations
- Comparable sales analysis
- Shareable reports via unique URLs with token authentication

---

## 2. System Architecture

### 2.1 Tech Stack Requirements

```
Frontend:
├── React 18+ with TypeScript
├── Tailwind CSS for styling
├── Recharts for data visualization
├── Leaflet/MapBox for maps
└── PDF generation (react-pdf or html2pdf)

Backend:
├── Node.js/Express or Supabase Edge Functions
├── Supabase PostgreSQL database
├── PostgREST API
└── Authentication via Supabase Auth

External APIs:
├── Property Data APIs
├── FEMA Flood Zone API
├── USGS Earthquake API
├── NASA FIRMS (Fire data)
├── Open-Elevation API
├── Census Bureau API
├── Weather API
├── Google Maps/Places API
└── Real Estate APIs (Realtor.com, Zillow)
```

### 2.2 Database Schema

```sql
-- Core Tables

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  address TEXT NOT NULL,
  city TEXT,
  county TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  lot_size_acres DECIMAL(10, 4),
  asking_price DECIMAL(12, 2),
  fair_market_value DECIMAL(12, 2),
  strategy TEXT DEFAULT 'flip', -- 'flip', 'hold', 'develop'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE property_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  -- Scoring
  total_score INTEGER, -- 0-125
  location_score INTEGER, -- 0-25
  risk_score INTEGER, -- 0-25
  financial_score INTEGER, -- 0-25
  market_score INTEGER, -- 0-25
  profit_score INTEGER, -- 0-25
  recommendation TEXT, -- 'STRONG_BUY', 'BUY', 'CAUTION', 'NO_BUY'
  
  -- Risk Analysis
  fema_zone TEXT,
  flood_risk_level TEXT,
  earthquake_risk_level TEXT,
  wildfire_risk_level TEXT,
  hurricane_risk_level TEXT,
  insurance_risk_score INTEGER, -- 0-100
  
  -- Financial Analysis
  closing_costs DECIMAL(12, 2),
  selling_costs DECIMAL(12, 2),
  total_investment DECIMAL(12, 2),
  net_profit DECIMAL(12, 2),
  roi_percentage DECIMAL(6, 2),
  margin_percentage DECIMAL(6, 2),
  price_per_acre DECIMAL(12, 2),
  
  -- Terrain Analysis
  elevation_ft INTEGER,
  slope_percentage DECIMAL(5, 2),
  slope_classification TEXT,
  
  -- Location Context
  amenities_json JSONB, -- schools, hospitals, commerce, etc.
  accessibility_json JSONB, -- distances to key locations
  climate_json JSONB, -- weather data
  
  -- Demographics
  demographics_json JSONB,
  
  -- Comparables
  comparables_json JSONB,
  
  -- Market Analysis
  market_trend TEXT, -- 'up', 'down', 'stable'
  market_outlook TEXT,
  market_insights_json JSONB,
  
  -- Zoning
  zoning_info_json JSONB,
  
  -- Insurance Estimates
  insurance_estimates_json JSONB,
  
  -- Strengths & Concerns
  strengths_json JSONB,
  concerns_json JSONB,
  
  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  report_version INTEGER DEFAULT 1
);

CREATE TABLE report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES property_reports(id) ON DELETE CASCADE,
  share_token UUID DEFAULT gen_random_uuid() UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comparable_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES property_reports(id) ON DELETE CASCADE,
  address TEXT,
  city TEXT,
  state TEXT,
  lot_size_acres DECIMAL(10, 4),
  sale_price DECIMAL(12, 2),
  sale_date DATE,
  price_per_acre DECIMAL(12, 2),
  distance_miles DECIMAL(6, 2),
  days_on_market INTEGER,
  property_type TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_properties_user ON properties(user_id);
CREATE INDEX idx_reports_property ON property_reports(property_id);
CREATE INDEX idx_shares_token ON report_shares(share_token);
CREATE INDEX idx_comparables_report ON comparable_sales(report_id);
```

---

## 3. Feature Specifications

### 3.1 Report Sections

#### Section 1: Executive Summary Header
```
┌─────────────────────────────────────────────────────┐
│  PROPERTY ANALYSIS REPORT                           │
│  ─────────────────────────                          │
│  Generated on [DATE] at [TIME]                      │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  EXECUTIVE SUMMARY                            │   │
│  │  Score: 97/125                                │   │
│  │  Recommendation: BUY ████████████████████     │   │
│  │  Investment Quality: Good                     │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Scoring Guide:                                     │
│  112+ pts = STRONG BUY | 94+ = BUY | 75+ = CAUTION │
└─────────────────────────────────────────────────────┘
```

**Data Requirements:**
- Total score (0-125)
- Recommendation badge with color coding
- Scoring breakdown reference

#### Section 2: Strengths & Concerns
```typescript
interface StrengthsConcerns {
  strengths: string[];  // Max 5 items
  concerns: string[];   // Max 5 items
}

// Example:
{
  strengths: [
    "Excellent profit margin of 48.6%",
    "Excellent projected ROI of 94.4%",
    "Minimal flood risk zone (Zone X)"
  ],
  concerns: [
    "Verify local regulations before purchase",
    "Perform physical property inspection"
  ]
}
```

#### Section 3: Property Data Card
```typescript
interface PropertyData {
  askingPrice: number;
  fairMarketValue: number;
  lotSizeAcres: number;
  exitStrategy: 'Flip' | 'Hold' | 'Develop';
  fmvDiscount: number;  // Calculated percentage
}

// Display Elements:
// - Price with dollar formatting
// - FMV with comparison indicator
// - Lot size in acres
// - Strategy badge
// - Discount percentage with color (green = good)
```

#### Section 4: Property Visualization
```typescript
interface PropertyMaps {
  satelliteMapUrl: string;  // Google/MapBox satellite
  streetMapUrl: string;     // Standard street map
  coordinates: {
    lat: number;
    lng: number;
  };
}

// Requirements:
// - 2-column layout
// - Satellite view (left)
// - Street map view (right)
// - Property marker/pin
// - Zoom level appropriate for lot size
```

#### Section 5: Location Details
```typescript
interface LocationDetails {
  fullAddress: string;
  city: string;
  county: string;
  state: string;
  zipCode: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}
```

#### Section 6: Location Context (Proximity Analysis)
```typescript
interface ProximityAnalysis {
  radius: number; // in km (default 10)
  amenities: {
    schools: number;
    healthcare: number;
    commerce: number;
    restaurants: number;
    leisure: number;
    publicTransport: number;
    emergencyServices: number;
    total: number;
  };
  accessibility: {
    cityCenter: { distance: string; time: string };
    hospital: { distance: string; time: string };
    airport: { distance: string; time: string };
  };
  terrain: {
    elevation: { feet: number; meters: number };
  };
  climate: {
    currentTemp: number;
    humidity: number;
    avgHigh: number;
    avgLow: number;
  };
}
```

**API Sources:**
- Google Places API for amenities
- Google Distance Matrix for accessibility
- Open-Elevation API for terrain
- OpenWeather API for climate

#### Section 7: Slope Analysis
```typescript
interface SlopeAnalysis {
  averageSlope: number;  // percentage
  classification: 'Flat' | 'Minimal' | 'Moderate' | 'Steep' | 'Extreme';
  samplePoints: number;
  sampleRadius: number;  // meters
  centralElevation: { meters: number; feet: number };
  distribution: {
    flat: number;      // 0-0.5%
    minimal: number;   // 0.5-5%
    moderate: number;  // 5-10%
    steep: number;     // 10-15%
    extreme: number;   // 15%+
  };
}

// Classification impacts:
// - Extreme (15%+): -6 pts from risk score
// - Steep (10-15%): -4 pts from risk score
// - Moderate (5-10%): -2 pts from risk score
```

#### Section 8: Insurance Risk Analysis
```typescript
interface InsuranceRiskAnalysis {
  overallRiskScore: number;  // 0-100
  totalAnnualCost: number;
  monthlyPayment: number;
  
  risks: {
    flood: {
      femaZone: string;
      riskLevel: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
      insuranceRequired: boolean;
      annualPremium: number;
    };
    earthquake: {
      riskLevel: string;
      eventsLast10Years: number;
      maxMagnitude: number;
      annualPremium: number;
    };
    wildfire: {
      riskLevel: string;
      fireDetections: number;
      detectionPeriod: string;
      annualPremium: number;
    };
    hurricane: {
      riskLevel: string;
      zone: string;
      stormSurgeRisk: boolean;
      annualPremium: number;
      season: string;
    };
  };
}
```

**API Sources:**
- FEMA NFHL API for flood zones
- USGS Earthquake Hazards API
- NASA FIRMS API for wildfire
- NOAA Hurricane data

#### Section 9: Financial Analysis
```typescript
interface FinancialAnalysis {
  metrics: {
    netROI: number;
    netProfit: number;
    margin: number;
    pricePerAcre: number;
  };
  
  breakdown: {
    purchasePrice: number;
    closingCosts: number;      // Default 3%
    sellingCosts: number;       // Default 6%
    totalInvestment: number;
    arv: number;                // After Repair Value / FMV
    netProfit: number;
  };
  
  charts: {
    investmentComparison: 'bar'; // Purchase vs ARV vs Profit
    costBreakdown: 'pie';         // Purchase vs Closing vs Selling
  };
}

// Formulas:
// closingCosts = purchasePrice * 0.03
// sellingCosts = arv * 0.06
// totalInvestment = purchasePrice + closingCosts
// netProfit = arv - totalInvestment - sellingCosts
// netROI = (netProfit / totalInvestment) * 100
// margin = (netProfit / arv) * 100
```

#### Section 10: Comparable Sales Analysis
```typescript
interface ComparablesAnalysis {
  summary: {
    totalProperties: number;
    source: string;
    searchRadius: string;
    searchPeriod: string;
    sizeFilter: string;  // e.g., "±50% (0.54 - 1.62 acres)"
  };
  
  statistics: {
    averagePrice: number;
    averagePricePerAcre: number;
    averageDistance: number | null;
    priceRange: { min: number; max: number };
  };
  
  comparables: Array<{
    index: number;
    city: string;
    address: string;
    propertyType: string;
    lotSizeAcres: number;
    distance: number | null;
    salePrice: number;
    saleDate: string;
    pricePerAcre: number;
    sqft: number | null;
    bedsBaths: string;
    daysOnMarket: number;
    detailsUrl: string;
  }>;
}
```

**API Source:** 
- Realtor.com via RapidAPI
- Zillow Bridge API

#### Section 11: Investment Score Breakdown
```typescript
interface InvestmentScore {
  totalScore: number;  // 0-125
  maxScore: 125;
  
  categories: {
    location: {
      score: number;     // 0-25
      factors: ['population', 'medianIncome', 'avgPropertyValue'];
    };
    risk: {
      score: number;     // 0-25
      factors: ['femaZone', 'slope'];
      // Zone X = 25pts, Zone A = 10pts, Zone V = 0pts
    };
    financial: {
      score: number;     // 0-25
      factors: ['roi'];
      // ROI >50% = 25pts, 30-50% = 20pts, 15-30% = 15pts
    };
    market: {
      score: number;     // 0-25
      factors: ['priceVsAverage'];
    };
    profit: {
      score: number;     // 0-25
      factors: ['margin'];
      // >40% = 25pts, 30-40% = 20pts, 20-30% = 15pts, 10-20% = 10pts
    };
  };
}
```

#### Section 12: Demographics (Census Data)
```typescript
interface Demographics {
  population: {
    total: number;
  };
  economy: {
    medianIncome: number;
    medianAge: number;
    unemploymentRate: number;
  };
  realEstate: {
    medianHomeValue: number;
    medianGrossRent: number;
    totalUnits: number;
    vacancyRate: number;
  };
  education: {
    bachelorsOrHigher: number;  // percentage
    avgCommuteTime: number;      // minutes
    recentConstruction: number;  // percentage built since 2010
  };
}
```

**API Source:** Census Bureau API (ACS 5-year estimates)

#### Section 13: FEMA Flood Zone Map
```typescript
interface FEMAFloodMap {
  mapImageUrl: string;  // FEMA MapServer export
  mapError: boolean;
  
  details: {
    femaZone: string;
    riskLevel: string;
    bfe: number | null;  // Base Flood Elevation
    insuranceRequired: boolean;
    sfha: boolean;       // Special Flood Hazard Area
  };
  
  legend: {
    zoneX: 'Minimal risk';
    zoneA: 'Moderate/high risk';
    zoneV: 'Very high risk (coastal)';
  };
}

// FEMA Map URL Template:
// https://hazards.fema.gov/gis/nfhl/services/public/NFHL/MapServer/export
// ?bbox={west},{south},{east},{north}
// &size=800,600
// &format=png32
// &transparent=true
// &layers=show:28
// &bboxSR=4326
// &imageSR=4326
// &f=image
```

#### Section 14: Zoning Information
```typescript
interface ZoningInfo {
  summary: string;  // AI-generated summary of local zoning
  zones: Array<{
    code: string;
    name: string;
    description: string;
    allowedUses: string[];
  }>;
  source: string;  // County Land Development Code
}
```

**Data Source:** Perplexity AI or custom scraping

#### Section 15: Market Analysis
```typescript
interface MarketAnalysis {
  trend12Month: 'up' | 'down' | 'stable';
  outlook: 'STRONG' | 'MODERATE' | 'WEAK';
  
  insights: Array<{
    number: number;
    text: string;
  }>;
}
```

**Data Source:** AI analysis of market data

#### Section 16: Legal Disclaimer
```typescript
const DISCLAIMER = `
This report was automatically generated based on public data from 
multiple external sources and is for INFORMATIONAL AND EDUCATIONAL 
PURPOSES ONLY. The information presented DOES NOT CONSTITUTE 
FINANCIAL, LEGAL, OR REAL ESTATE ADVICE and must be MANDATORILY 
verified and confirmed by specialized professionals (brokers, 
lawyers, accountants, inspectors) before any investment decision 
or real estate transaction.
`;
```

---

## 4. Scoring Algorithm

### 4.1 Total Score Calculation (0-125 points)

```typescript
function calculateInvestmentScore(data: PropertyAnalysis): ScoreResult {
  const scores = {
    location: calculateLocationScore(data.demographics),
    risk: calculateRiskScore(data.femaZone, data.slope),
    financial: calculateFinancialScore(data.roi),
    market: calculateMarketScore(data.price, data.comparables),
    profit: calculateProfitScore(data.margin)
  };
  
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  
  return {
    total,
    categories: scores,
    recommendation: getRecommendation(total)
  };
}

// Location Score (0-25)
function calculateLocationScore(demographics: Demographics): number {
  let score = 0;
  
  // Population factor
  if (demographics.population > 50000) score += 8;
  else if (demographics.population > 20000) score += 6;
  else if (demographics.population > 5000) score += 4;
  else score += 2;
  
  // Median income factor
  if (demographics.medianIncome > 75000) score += 9;
  else if (demographics.medianIncome > 50000) score += 7;
  else if (demographics.medianIncome > 35000) score += 5;
  else score += 3;
  
  // Property value factor
  if (demographics.medianHomeValue > 250000) score += 8;
  else if (demographics.medianHomeValue > 150000) score += 6;
  else if (demographics.medianHomeValue > 75000) score += 4;
  else score += 2;
  
  return Math.min(score, 25);
}

// Risk Score (0-25)
function calculateRiskScore(femaZone: string, slopePercent: number): number {
  let score = 0;
  
  // FEMA Zone
  switch (femaZone.toUpperCase()) {
    case 'X': score += 25; break;
    case 'B': case 'C': score += 20; break;
    case 'A': case 'AE': case 'AH': case 'AO': score += 10; break;
    case 'V': case 'VE': score += 0; break;
    default: score += 15;
  }
  
  // Slope penalty
  if (slopePercent >= 15) score -= 6;       // Extreme
  else if (slopePercent >= 10) score -= 4;  // Steep
  else if (slopePercent >= 5) score -= 2;   // Moderate
  
  return Math.max(score, 0);
}

// Financial Score (0-25)
function calculateFinancialScore(roi: number): number {
  if (roi >= 50) return 25;
  if (roi >= 30) return 20;
  if (roi >= 15) return 15;
  if (roi >= 5) return 10;
  return 5;
}

// Market Score (0-25)
function calculateMarketScore(price: number, comparables: Comparable[]): number {
  const avgPrice = comparables.reduce((sum, c) => sum + c.salePrice, 0) / comparables.length;
  const discount = ((avgPrice - price) / avgPrice) * 100;
  
  if (discount >= 40) return 25;
  if (discount >= 30) return 20;
  if (discount >= 20) return 15;
  if (discount >= 10) return 10;
  if (discount >= 0) return 5;
  return 0;
}

// Profit Score (0-25)
function calculateProfitScore(margin: number): number {
  if (margin >= 40) return 25;
  if (margin >= 30) return 20;
  if (margin >= 20) return 15;
  if (margin >= 10) return 10;
  return 5;
}

// Recommendation
function getRecommendation(totalScore: number): Recommendation {
  if (totalScore >= 112) return { text: 'STRONG BUY', color: 'green', quality: 'Excellent Investment' };
  if (totalScore >= 94) return { text: 'BUY', color: 'green', quality: 'Good Investment' };
  if (totalScore >= 75) return { text: 'CAUTION', color: 'yellow', quality: 'Proceed with Caution' };
  return { text: 'NO BUY', color: 'red', quality: 'Not Recommended' };
}
```

---

## 5. API Integration Specifications

### 5.1 Required External APIs

| API | Purpose | Rate Limit | Cost |
|-----|---------|------------|------|
| Google Maps Platform | Geocoding, Places, Distance Matrix | 25k/day free | $0.005/request after |
| Google Street View | Property photos | 25k/day free | $7/1000 after |
| FEMA NFHL | Flood zone data | Unlimited | Free |
| USGS Earthquake | Seismic risk | Unlimited | Free |
| NASA FIRMS | Wildfire data | 100k/day | Free |
| Open-Elevation | Terrain data | 1000/day free | Free |
| Census Bureau | Demographics | Unlimited | Free |
| OpenWeather | Climate data | 1000/day | Free tier |
| Realtor.com (RapidAPI) | Comparable sales | Varies | ~$50/month |
| Zillow Bridge | Property values | Varies | ~$30/month |
| Perplexity AI | Market research | Varies | ~$20/month |

### 5.2 API Implementation Examples

```typescript
// FEMA Flood Zone Query
async function getFEMAFloodZone(lat: number, lng: number): Promise<FEMAData> {
  const url = `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query`;
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    f: 'json'
  });
  
  const response = await fetch(`${url}?${params}`);
  const data = await response.json();
  
  return {
    zone: data.features[0]?.attributes?.FLD_ZONE || 'X',
    sfha: data.features[0]?.attributes?.SFHA_TF === 'T',
    bfe: data.features[0]?.attributes?.STATIC_BFE
  };
}

// USGS Earthquake Query
async function getEarthquakeRisk(lat: number, lng: number): Promise<EarthquakeData> {
  const endTime = new Date().toISOString();
  const startTime = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString();
  
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query`;
  const params = new URLSearchParams({
    format: 'geojson',
    latitude: lat.toString(),
    longitude: lng.toString(),
    maxradiuskm: '100',
    starttime: startTime,
    endtime: endTime,
    minmagnitude: '2.5'
  });
  
  const response = await fetch(`${url}?${params}`);
  const data = await response.json();
  
  const events = data.features;
  const maxMagnitude = Math.max(...events.map((e: any) => e.properties.mag), 0);
  
  return {
    count: events.length,
    maxMagnitude,
    riskLevel: events.length > 50 ? 'High' : events.length > 10 ? 'Moderate' : 'Low'
  };
}

// NASA FIRMS Wildfire Query
async function getWildfireRisk(lat: number, lng: number): Promise<WildfireData> {
  const apiKey = process.env.NASA_FIRMS_API_KEY;
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/${lat - 0.5},${lng - 0.5},${lat + 0.5},${lng + 0.5}/1/365`;
  
  const response = await fetch(url);
  const csvData = await response.text();
  const fires = csvData.split('\n').length - 2; // Subtract header and empty line
  
  return {
    detections: fires,
    period: 'Last 365 days',
    riskLevel: fires > 50 ? 'High' : fires > 10 ? 'Moderate' : 'Low'
  };
}

// Census Bureau Query
async function getCensusData(lat: number, lng: number): Promise<CensusData> {
  // First, get the FIPS code for the location
  const geoUrl = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates`;
  const geoParams = new URLSearchParams({
    x: lng.toString(),
    y: lat.toString(),
    benchmark: 'Public_AR_Current',
    vintage: 'Current_Current',
    format: 'json'
  });
  
  const geoResponse = await fetch(`${geoUrl}?${geoParams}`);
  const geoData = await geoResponse.json();
  const tract = geoData.result.geographies['Census Tracts'][0];
  const state = tract.STATE;
  const county = tract.COUNTY;
  const tractCode = tract.TRACT;
  
  // Then query ACS data
  const acsUrl = `https://api.census.gov/data/2022/acs/acs5`;
  const variables = [
    'B01003_001E', // Population
    'B19013_001E', // Median household income
    'B01002_001E', // Median age
    'B25077_001E', // Median home value
    'B25064_001E', // Median gross rent
    'B25001_001E', // Total housing units
    'B25002_003E'  // Vacant units
  ].join(',');
  
  const acsParams = new URLSearchParams({
    get: variables,
    for: `tract:${tractCode}`,
    in: `state:${state}%20county:${county}`,
    key: process.env.CENSUS_API_KEY
  });
  
  const acsResponse = await fetch(`${acsUrl}?${acsParams}`);
  const acsData = await acsResponse.json();
  
  return parseCensusResponse(acsData);
}
```

---

## 6. User Interface Specifications

### 6.1 Report Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [← Back to Chat]                         [Save PDF] [Share] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │        🔗 SHARED REPORT BANNER (if shared)          │    │
│  │  This report was shared with you.                   │    │
│  │  Create an account to generate your own reports.    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║         PROPERTY ANALYSIS REPORT                      ║  │
│  ║         Generated: [DATE] at [TIME]                   ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                             │
│  ┌─ Executive Summary ───────────────────────────────────┐  │
│  │  [97/125]  [BUY BADGE]  Good Investment               │  │
│  │                                                       │  │
│  │  Scoring Guide: 112+ STRONG BUY | 94+ BUY | ...       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Strengths ─────────┐  ┌─ Concerns ─────────────────┐   │
│  │ ✓ Point 1           │  │ ⚠ Point 1                  │   │
│  │ ✓ Point 2           │  │ ⚠ Point 2                  │   │
│  │ ✓ Point 3           │  │                            │   │
│  └─────────────────────┘  └────────────────────────────┘   │
│                                                             │
│  [Continue scrolling for all 16 sections...]                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Color Scheme

```typescript
const colors = {
  // Background
  background: {
    primary: '#0f1419',    // Dark navy
    secondary: '#1a2332',  // Slightly lighter
    card: '#1e2d3d',       // Card background
  },
  
  // Text
  text: {
    primary: '#ffffff',
    secondary: '#9ca3af',
    muted: '#6b7280',
  },
  
  // Accent
  accent: {
    gold: '#f59e0b',       // Headers, scores
    green: '#10b981',      // Positive indicators
    red: '#ef4444',        // Negative indicators
    yellow: '#fbbf24',     // Warnings
    blue: '#3b82f6',       // Links
  },
  
  // Score colors
  score: {
    strongBuy: '#10b981',  // Green
    buy: '#22c55e',        // Light green
    caution: '#fbbf24',    // Yellow
    noBuy: '#ef4444',      // Red
  },
  
  // Risk levels
  risk: {
    minimal: '#10b981',
    low: '#22c55e',
    moderate: '#fbbf24',
    high: '#f97316',
    veryHigh: '#ef4444',
  }
};
```

### 6.3 Responsive Design

```typescript
const breakpoints = {
  mobile: '640px',   // Single column
  tablet: '768px',   // 2 columns where appropriate
  desktop: '1024px', // Full layout
  wide: '1280px',    // Extra padding
};

// Mobile adaptations:
// - Stack all sections vertically
// - Collapse multi-column grids
// - Smaller fonts for tables
// - Horizontal scroll for wide tables
// - Touch-friendly buttons
```

---

## 7. Sharing & Authentication

### 7.1 Share Token System

```typescript
// Generate shareable link
async function generateShareLink(reportId: string, userId: string): Promise<ShareLink> {
  const shareToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const { data, error } = await supabase
    .from('report_shares')
    .insert({
      report_id: reportId,
      share_token: shareToken,
      created_by: userId,
      expires_at: expiresAt
    })
    .select()
    .single();
    
  return {
    url: `${BASE_URL}/report/${reportId}?token=${shareToken}`,
    expiresAt,
    shareId: data.id
  };
}

// Validate share token
async function validateShareToken(reportId: string, token: string): Promise<boolean> {
  const { data } = await supabase
    .from('report_shares')
    .select('*')
    .eq('report_id', reportId)
    .eq('share_token', token)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .single();
    
  if (data) {
    // Increment view count
    await supabase
      .from('report_shares')
      .update({ view_count: data.view_count + 1 })
      .eq('id', data.id);
    return true;
  }
  
  return false;
}
```

### 7.2 URL Structure

```
Public Reports (with token):
/report/{reportId}?token={shareToken}

Authenticated Reports:
/dashboard/reports/{reportId}

Report Generation:
/dashboard/analyze?address={encodedAddress}
```

---

## 8. PDF Export

### 8.1 PDF Generation Requirements

```typescript
interface PDFOptions {
  format: 'A4' | 'Letter';
  orientation: 'portrait';
  margin: { top: 20, right: 20, bottom: 20, left: 20 };
  filename: `property-report-${address}-${date}.pdf`;
  
  // Sections to include
  sections: [
    'executiveSummary',
    'propertyData',
    'maps',
    'location',
    'proximityAnalysis',
    'slopeAnalysis',
    'insuranceRisk',
    'financialAnalysis',
    'comparables',
    'investmentScore',
    'demographics',
    'femaMap',
    'zoning',
    'marketAnalysis',
    'disclaimer'
  ];
}
```

### 8.2 Implementation Approach

```typescript
// Using react-pdf or html2pdf.js
async function generatePDF(reportId: string): Promise<Blob> {
  // Option 1: Server-side with Puppeteer
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/report/${reportId}/print`);
  await page.waitForSelector('.report-loaded');
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });
  
  await browser.close();
  return new Blob([pdf], { type: 'application/pdf' });
  
  // Option 2: Client-side with html2pdf
  const element = document.getElementById('report-container');
  const opt = {
    margin: 10,
    filename: 'property-report.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  return html2pdf().set(opt).from(element).outputPdf('blob');
}
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Supabase project and database schema
- [ ] Create authentication flow
- [ ] Build basic report page layout
- [ ] Implement property input form

### Phase 2: Data Integration (Week 3-4)
- [ ] Integrate Google Maps APIs (Geocoding, Places)
- [ ] Implement FEMA flood zone lookup
- [ ] Add USGS earthquake data
- [ ] Integrate NASA FIRMS wildfire data
- [ ] Connect Census Bureau API

### Phase 3: Analysis Engine (Week 5-6)
- [ ] Build scoring algorithm
- [ ] Implement financial calculations
- [ ] Create slope analysis module
- [ ] Develop insurance cost estimator

### Phase 4: Comparables (Week 7)
- [ ] Integrate Realtor.com/Zillow API
- [ ] Build comparable sales display
- [ ] Implement search filters

### Phase 5: Polish & Features (Week 8)
- [ ] PDF export functionality
- [ ] Shareable links with tokens
- [ ] Mobile responsive design
- [ ] Performance optimization

### Phase 6: AI Enhancement (Week 9-10)
- [ ] Zoning analysis via Perplexity
- [ ] Market insights generation
- [ ] Automated strengths/concerns
- [ ] Smart recommendations

---

## 10. Success Metrics

### 10.1 Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| Report Generation Time | < 30 seconds | API response time |
| Data Accuracy | > 95% | Manual verification |
| PDF Export Time | < 10 seconds | Client-side measurement |
| Mobile Usability Score | > 90 | Lighthouse audit |
| API Uptime | > 99.5% | Monitoring tools |

### 10.2 User Success Metrics

| Metric | Target |
|--------|--------|
| Reports Generated/Month | 100+ |
| Share Link Usage | 30%+ of reports shared |
| PDF Downloads | 50%+ of reports |
| Time to Decision | < 5 min per report |

---

## 11. Security Considerations

### 11.1 Data Protection
- All API keys stored in environment variables
- Database Row Level Security (RLS) enabled
- Share tokens are UUID v4 (unpredictable)
- Tokens expire after 30 days
- Rate limiting on API endpoints

### 11.2 Authentication
- Supabase Auth with email/password
- Optional social login (Google)
- Session management with JWT
- Secure cookie handling

---

## 12. Appendix

### A. Sample API Responses

See `/docs/api-samples/` for example responses from each external API.

### B. Component Library

The UI components should be built using:
- Tailwind CSS for styling
- Headless UI for interactions
- Recharts for visualizations
- Lucide React for icons

### C. Error Handling

```typescript
interface APIError {
  code: string;
  message: string;
  source: string;  // Which API failed
  fallback: any;   // Default value to use
}

const errorHandlers = {
  FEMA_UNAVAILABLE: { fallback: { zone: 'UNKNOWN' }, message: 'Flood data temporarily unavailable' },
  CENSUS_RATE_LIMIT: { fallback: null, message: 'Demographics loading slowly' },
  COMPARABLES_EMPTY: { fallback: [], message: 'No comparable sales found in area' }
};
```

---

**Document End**

*This PRD provides the complete specification for building a property analysis report system comparable to Cérebro do Rei dos Flips. Claude Code should use this as the authoritative reference for implementation.*
