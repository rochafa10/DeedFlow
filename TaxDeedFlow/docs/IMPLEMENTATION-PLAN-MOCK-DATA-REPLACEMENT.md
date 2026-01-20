# Tax Deed Flow: Mock Data Replacement Implementation Plan

**Created**: 2026-01-18
**Status**: Ready for execution after agent marketplace installation
**Constraint**: NO LAYOUT CHANGES - only data source replacement

## Overview

Replace hardcoded mock data in the demo report page by **connecting to existing Supabase data**. Layout remains completely unchanged - only data sources change.

**Execution Model**: Parallel tracks with specialized agents. Orchestrator coordinates, does NOT code.

---

## Pre-requisite: Install Skills & Create Agents

### Step 0.1: Install Anthropic Skills
```bash
# Clone skills repository
git clone https://github.com/anthropics/skills
# Or add to project
npm install @anthropics/skills  # if available as package
```

### Step 0.2: Create Specialized Agents

**Create these agent prompt files in `agents/` folder:**

#### Agent: API Developer (`agents/API-DEVELOPER-AGENT.md`)
```markdown
# API Developer Agent
Specializes in creating Next.js API routes with Supabase integration.
- Creates `/api/` endpoints
- Writes Supabase queries
- Handles error responses
- Implements TypeScript types
```

#### Agent: UI Connector (`agents/UI-CONNECTOR-AGENT.md`)
```markdown
# UI Connector Agent
Specializes in connecting data to existing React components.
- Replaces mock data with API calls
- Adds useSWR/fetch hooks
- Implements loading states
- NO layout changes allowed
```

#### Agent: Integration Agent (`agents/INTEGRATION-AGENT.md`)
```markdown
# Integration Agent
Specializes in external API integrations.
- Connects RapidAPI services
- Handles Census/BLS APIs
- Manages API keys and rate limits
- Implements caching
```

---

## Parallel Execution Tracks

### Track A: Supabase API Layer (API Developer Agent)
**Runs in parallel with Track B and C**

| Task | File to Create | Dependencies |
|------|----------------|--------------|
| A1 | `/api/properties/[id]/report/route.ts` | None |
| A2 | `/api/analysis/financial/route.ts` | A1 |
| A3 | `/api/analysis/risk/route.ts` | A1 |

**Agent Assignment**: `tax-deed-coder` or `API-DEVELOPER-AGENT`

---

### Track B: External API Integration (Integration Agent)
**Runs in parallel with Track A and C**

| Task | Endpoint | Dependencies |
|------|----------|--------------|
| B1 | Test `/api/comparables` with RapidAPI | API key verification |
| B2 | Verify Census API integration | Census key in .env |
| B3 | Verify BLS API integration | BLS key in .env |

**Agent Assignment**: `INTEGRATION-AGENT`

---

### Track C: UI Data Connection (UI Connector Agent)
**Runs after Track A completes (depends on APIs)**

| Task | File to Modify | Changes |
|------|----------------|---------|
| C1 | `/report/demo/page.tsx` | Add property selector |
| C2 | `/report/demo/page.tsx` | Replace `samplePropertyDetails` with API |
| C3 | `/report/demo/page.tsx` | Replace `sampleFinancialAnalysis` with API |
| C4 | `/report/demo/page.tsx` | Replace `sampleRiskAssessment` with API |
| C5 | `/report/demo/page.tsx` | Add loading states (Skeleton) |

**Agent Assignment**: `UI-CONNECTOR-AGENT`
**Constraint**: NO LAYOUT CHANGES - only data source replacement

---

### Track D: Code Review (Code Reviewer Agent)
**Runs after each track completes**

| Review | Checks |
|--------|--------|
| D1 | Review Track A APIs for security, TypeScript types |
| D2 | Review Track B integrations for error handling |
| D3 | Review Track C UI changes ensure no layout changes |

**Agent Assignment**: `code-reviewer`

---

## Execution Timeline

```
TIME →
─────────────────────────────────────────────────────────────
Track A (API):     [A1]────[A2]────[A3]────►
Track B (Integ):   [B1]────[B2]────[B3]────►
                                            │
Track C (UI):                               ▼  [C1]─[C2]─[C3]─[C4]─[C5]►
Track D (Review):                 [D1]      │              [D2][D3]►
─────────────────────────────────────────────────────────────
                   ▲              ▲         ▲              ▲
                 START         REVIEW    C STARTS      FINAL REVIEW
```

---

## Existing Data in Supabase (Ready to Use!)

### Tables with Real Data
| Table | Rows | Key Fields |
|-------|------|------------|
| **properties** | 7,375 | parcel_id, address, owner, total_due, sale_type, sale_date |
| **regrid_data** | 106 | lot_size, building_sqft, year_built, beds, baths, zoning, assessed_value, market_value, screenshot_url |
| **counties** | 67 | county_name, state_code |
| **upcoming_sales** | 81 | sale_date, sale_type, platform, deposit_required |
| **documents** | 93 | property lists, PDFs |

### Sample Real Data Available
```
Property: 613 18TH ST, Blair County
- parcel_id: 01.06-09..-083.00-000
- sale_type: repository
- sale_date: 2026-03-11
- lot_size: 0.05 acres
- zoning: Add-On
- assessed_value: $1,000
- screenshot_url: https://supabase.../screenshots/...jpg
```

### What's Already Working
- Property details from `properties` + `regrid_data` join
- Regrid screenshots stored in Supabase Storage
- County and sale information
- Maps/Street View (Google API)
- FEMA Flood Zone (working)
- Environmental APIs (working)

---

## Phase 1: Create Property Report API (Supabase → UI)

**Goal**: Single API endpoint to fetch complete property data from Supabase

### 1.1 Create `/api/properties/[id]/report/route.ts`
```typescript
// Fetches property + regrid_data + county + upcoming_sale in one query
const { data } = await supabase
  .from('properties')
  .select(`
    *,
    county:counties(*),
    regrid:regrid_data(*),
    sale:upcoming_sales(*)
  `)
  .eq('id', propertyId)
  .single();

// Transform to match demo page structure
return {
  propertyDetails: {
    parcelId: data.parcel_id,
    address: data.property_address,
    city: data.city,
    county: data.county.county_name,
    state: data.county.state_code,
    ownerName: data.owner_name,
    propertyType: data.regrid?.property_type,
    lotSize: data.regrid?.lot_size_acres,
    yearBuilt: data.regrid?.year_built,
    bedrooms: data.regrid?.bedrooms,
    bathrooms: data.regrid?.bathrooms,
    squareFootage: data.regrid?.building_sqft,
    zoning: data.regrid?.zoning,
    landUse: data.regrid?.land_use,
    assessedValue: data.regrid?.assessed_value,
    marketValue: data.regrid?.market_value
  },
  auctionInfo: {
    saleType: data.sale_type,
    saleDate: data.sale_date,
    totalDue: data.total_due,
    minimumBid: data.minimum_bid
  },
  images: {
    regridScreenshot: data.regrid?.screenshot_url
  }
};
```

### 1.2 Add Property Selector to Demo Page
```typescript
// In demo/page.tsx - add property ID selector (dropdown or URL param)
const [propertyId, setPropertyId] = useState<string | null>(null);
const { data: property } = useSWR(
  propertyId ? `/api/properties/${propertyId}/report` : null
);
```

**Deliverable**: Demo page can load any real property from database

---

## Phase 2: Financial Analysis (Calculated from Real Data)

**Goal**: Calculate investment metrics using Supabase data

### 2.1 Create `/api/analysis/financial/route.ts`
```typescript
// Input: property_id
// Fetch from Supabase:
const property = await getProperty(propertyId);
const regrid = await getRegridData(propertyId);

// Calculate:
const purchasePrice = property.total_due || property.minimum_bid;
const estimatedValue = regrid.market_value || regrid.assessed_value * 1.2;
const repairEstimate = estimateRepairs(regrid.year_built, regrid.building_sqft);

return {
  arv: estimatedValue,
  maxBid: estimatedValue * 0.7 - repairEstimate,
  potentialProfit: estimatedValue - purchasePrice - repairEstimate,
  roi: ((estimatedValue - purchasePrice - repairEstimate) / purchasePrice) * 100,
  costs: {
    acquisition: purchasePrice,
    repairs: repairEstimate,
    holding: calculateHoldingCosts(estimatedValue, 6),
    selling: estimatedValue * 0.08
  }
};
```

**Deliverable**: Financial section shows calculated metrics from real property data

---

## Phase 3: Risk Scoring (From Existing Data)

**Goal**: Generate risk scores from Supabase + existing environmental APIs

### 3.1 Create `/api/analysis/risk/route.ts`
```typescript
// Gather data from Supabase
const regrid = await getRegridData(propertyId);
const property = await getProperty(propertyId);

// Call existing environmental APIs (already working)
const [flood, epa, fire] = await Promise.allSettled([
  fetchFEMAFlood(lat, lng),
  fetchEPAData(lat, lng),
  fetchFireRisk(lat, lng)
]);

// Calculate scores
return {
  overall: calculateOverallScore({
    title: assessTitleRisk(property),
    environmental: assessEnvironmentalRisk(flood, epa, fire),
    market: assessMarketRisk(regrid),
    condition: assessConditionRisk(regrid)
  }),
  categories: { ... },
  redFlags: identifyRedFlags(regrid, property),
  greenFlags: identifyGreenFlags(regrid, property)
};
```

**Deliverable**: Risk section uses real property data + working APIs

---

## Phase 4: Comparables (From RealtyService)

**Goal**: Connect existing RealtyService for comparable sales

### 4.1 Verify RapidAPI Key
```
File: .env.local
Check: RAPIDAPI_KEY is set
Test: Call /api/comparables with real coordinates
```

### 4.2 Connect to Demo Page
```typescript
// Get coordinates from regrid_data
const { latitude, longitude } = regrid;

// Call existing comparables API
const comps = await fetch(`/api/comparables?lat=${latitude}&lng=${longitude}`);
```

**Deliverable**: Comparable sales from real market data

---

## Phase 5: Demographics & Market (Existing APIs)

**Goal**: Connect Census + BLS APIs (already configured)

### 5.1 Census Demographics
```typescript
// Already working in /api/report/generate
// Just need to expose to demo page
const demographics = await censusService.getDemographics(lat, lng);
```

### 5.2 Market Data from BLS
```typescript
// BLS API key already in .env.local
const employment = await blsService.getEmploymentData(countyFips);
```

**Deliverable**: Real demographic and market data

---

## Phase 6: Connect Demo Page to All APIs

**Goal**: Replace all mock data objects with API calls

### 6.1 Current Mock Objects to Replace
| Mock Object | Replace With |
|-------------|--------------|
| `samplePropertyDetails` | `/api/properties/[id]/report` |
| `sampleFinancialAnalysis` | `/api/analysis/financial` |
| `sampleRiskAssessment` | `/api/analysis/risk` |
| `sampleComparables` | `/api/comparables` |
| `sampleCategories` (demographics) | `/api/report/generate` |

### 6.2 Data Fetching Pattern
```typescript
// In demo/page.tsx
const { data, isLoading, error } = useSWR(
  propertyId ? `/api/properties/${propertyId}/report` : null
);

// Render with loading states
{isLoading ? <Skeleton /> : <PropertyDetails data={data.propertyDetails} />}
```

**Deliverable**: Demo page uses 100% real data

---

## Implementation Order

| Step | Task | Effort |
|------|------|--------|
| 1 | Create `/api/properties/[id]/report` | 1 hour |
| 2 | Add property selector to demo page | 30 min |
| 3 | Create `/api/analysis/financial` | 1 hour |
| 4 | Create `/api/analysis/risk` | 1.5 hours |
| 5 | Test `/api/comparables` with real data | 30 min |
| 6 | Connect all APIs to demo page | 2 hours |

**Total: ~6.5 hours**

---

## Files to Create

### New API Endpoints
- `TaxDeedFlow/src/app/api/properties/[id]/report/route.ts`
- `TaxDeedFlow/src/app/api/analysis/financial/route.ts`
- `TaxDeedFlow/src/app/api/analysis/risk/route.ts`

### Modify (Data Fetching Only)
- `TaxDeedFlow/src/app/report/demo/page.tsx`
  - Add property selector (dropdown/URL param)
  - Replace mock objects with useSWR calls
  - Add loading states

---

## Success Criteria

- [ ] Property selector allows choosing any property from database
- [ ] Property details come from `properties` + `regrid_data` tables
- [ ] Financial analysis calculated from real values
- [ ] Risk scores generated from real data + APIs
- [ ] Comparables show real nearby sales (when API key works)
- [ ] Demographics show real Census data
- [ ] NO layout changes - only data source changes
- [ ] Loading states while data fetches
- [ ] All code passes code review

---

## Orchestrator Instructions

### You (Orchestrator) Will:
1. Create agent prompt files in `agents/` folder
2. Install skills from https://github.com/anthropics/skills
3. Launch Track A and Track B agents in parallel
4. Monitor progress and handle blockers
5. Launch Track C after A completes
6. Launch Track D (code review) after each track
7. Coordinate handoffs between agents
8. Report final status

### You Will NOT:
- Write implementation code
- Make direct file edits (except agent prompts)
- Bypass the agent workflow

---

## Verification

1. Select a property with complete regrid_data (e.g., Dauphin County property)
2. Verify all sections populate with real data
3. Check console for any API errors
4. Compare values to database records
5. Test with property that has missing data (graceful fallbacks)

---

## Ready to Execute

### Step 1: Install Skills
```bash
git clone https://github.com/anthropics/skills
```

### Step 2: Create Agent Prompts
Create files in `TaxDeedFlow/agents/` folder

### Step 3: Launch Parallel Tracks
```
Track A (API) + Track B (Integration) → Run in parallel
Track C (UI) → Run after A completes
Track D (Review) → Run after each track
```

---

## Resume Instructions

To continue this work in the next session:

1. Read this file: `TaxDeedFlow/docs/IMPLEMENTATION-PLAN-MOCK-DATA-REPLACEMENT.md`
2. Check if agents are installed from marketplace
3. Start with Track A and Track B in parallel
4. Use `tax-deed-coder` agent for API implementation
5. Use `code-reviewer` agent for review
6. Track C depends on Track A completion
