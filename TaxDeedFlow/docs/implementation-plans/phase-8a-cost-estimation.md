# Phase 8a: Cost Estimation Engine

## Overview

The Cost Estimation Engine provides accurate cost calculations for tax deed property investments. This module handles acquisition costs, renovation/repair estimation, holding costs, and selling costs with regional adjustments for all 50 U.S. states.

## Dependencies

- Phase 1: Database Schema (property_reports table)
- Phase 2: API Integration (for property data)
- Phase 6: Scoring Algorithm (cost estimates feed into financial scores)

## Key Features

1. **Acquisition Cost Calculation** - Purchase price, closing costs, transfer taxes, auction fees
2. **Renovation Cost Estimation** - Scope-based rehab estimates with regional multipliers
3. **Holding Cost Calculation** - Monthly carrying costs during renovation/sale period
4. **Selling Cost Calculation** - Agent commissions, closing costs, staging/marketing
5. **Regional Multipliers** - Labor and material cost adjustments for all 50 states + metros

---

## Type Definitions

### Cost Breakdown Interfaces

```typescript
// src/lib/analysis/financial/costTypes.ts

export interface CostBreakdown {
  // Acquisition Costs
  acquisition: {
    purchasePrice: number;          // Expected bid/purchase price
    closingCosts: number;           // Title, recording, legal fees
    transferTaxes: number;          // State/local transfer taxes
    auctionFees: number;            // Buyer's premium, registration
    totalAcquisition: number;
  };

  // Rehabilitation Costs
  rehab: {
    estimatedTotal: number;
    breakdown: RehabBreakdown;
    contingency: number;            // 10-20% buffer
    confidence: 'low' | 'medium' | 'high';
  };

  // Holding Costs
  holding: {
    monthlyTotal: number;
    projectedMonths: number;
    breakdown: HoldingBreakdown;
    totalHolding: number;
  };

  // Selling Costs
  selling: {
    agentCommission: number;        // 5-6% of sale price
    closingCosts: number;
    stagingMarketing: number;
    totalSelling: number;
  };

  // Total Investment
  totalInvestment: number;
}

export interface RehabBreakdown {
  roof: number;
  hvac: number;
  electrical: number;
  plumbing: number;
  foundation: number;
  interior: number;                 // Paint, flooring, fixtures
  exterior: number;                 // Siding, windows, landscaping
  kitchen: number;
  bathrooms: number;
  other: number;
  laborMultiplier: number;          // Regional labor cost factor
}

export interface HoldingBreakdown {
  propertyTaxes: number;
  insurance: number;
  utilities: number;
  loanInterest: number;             // If financing
  hoa: number;
  maintenance: number;
}

export interface RehabEstimateInput {
  property: PropertyData;
  regridData?: RegridData;
  condition?: 'excellent' | 'good' | 'fair' | 'poor' | 'distressed';
  scope?: 'cosmetic' | 'moderate' | 'major' | 'gut';
}

export interface PropertyData {
  sqft?: number;
  yearBuilt?: number;
  state?: string;
  city?: string;
  annualTaxes?: number;
}

export interface RegridData {
  building_sqft?: number;
  year_built?: number;
}
```

---

## Regional Multipliers Configuration

Regional cost multipliers account for labor and material cost variations across the United States. Each state has a base multiplier, with metro-level overrides for major cities.

### Complete 50-State Configuration

```typescript
// src/lib/analysis/financial/regionalMultipliers.ts

interface RegionalMultiplier {
  stateBase: number;
  metros: Record<string, number>;
}

export const REGIONAL_MULTIPLIERS: Record<string, RegionalMultiplier> = {
  // ============================================
  // NORTHEAST REGION
  // ============================================
  'PA': {
    stateBase: 0.95,
    metros: {
      'Philadelphia': 1.10,
      'Pittsburgh': 0.90,
      'Allentown': 0.95,
      'Harrisburg': 0.88,
      'Scranton': 0.82,
      'Reading': 0.90,
      'Erie': 0.85,
      'default': 0.95,
    }
  },
  'NY': {
    stateBase: 1.25,
    metros: {
      'New York City': 1.55,
      'Manhattan': 1.75,
      'Brooklyn': 1.45,
      'Queens': 1.40,
      'Bronx': 1.35,
      'Staten Island': 1.30,
      'Buffalo': 0.95,
      'Rochester': 0.92,
      'Syracuse': 0.90,
      'Albany': 1.00,
      'Yonkers': 1.35,
      'default': 1.25,
    }
  },
  'NJ': {
    stateBase: 1.15,
    metros: {
      'Newark': 1.20,
      'Jersey City': 1.30,
      'Trenton': 1.00,
      'Atlantic City': 1.05,
      'Paterson': 1.15,
      'Edison': 1.20,
      'default': 1.15,
    }
  },
  'MA': {
    stateBase: 1.20,
    metros: {
      'Boston': 1.40,
      'Cambridge': 1.45,
      'Worcester': 1.05,
      'Springfield': 0.95,
      'Lowell': 1.10,
      'default': 1.20,
    }
  },
  'CT': {
    stateBase: 1.15,
    metros: {
      'Hartford': 1.10,
      'New Haven': 1.15,
      'Stamford': 1.35,
      'Bridgeport': 1.10,
      'Waterbury': 1.00,
      'default': 1.15,
    }
  },
  'RI': {
    stateBase: 1.10,
    metros: {
      'Providence': 1.12,
      'Warwick': 1.08,
      'default': 1.10,
    }
  },
  'VT': {
    stateBase: 1.05,
    metros: {
      'Burlington': 1.10,
      'default': 1.05,
    }
  },
  'NH': {
    stateBase: 1.08,
    metros: {
      'Manchester': 1.10,
      'Nashua': 1.12,
      'default': 1.08,
    }
  },
  'ME': {
    stateBase: 0.98,
    metros: {
      'Portland': 1.10,
      'Bangor': 0.95,
      'default': 0.98,
    }
  },
  'DE': {
    stateBase: 1.00,
    metros: {
      'Wilmington': 1.05,
      'Dover': 0.95,
      'default': 1.00,
    }
  },
  'MD': {
    stateBase: 1.12,
    metros: {
      'Baltimore': 1.08,
      'Bethesda': 1.35,
      'Silver Spring': 1.25,
      'Rockville': 1.28,
      'Frederick': 1.05,
      'default': 1.12,
    }
  },
  'DC': {
    stateBase: 1.35,
    metros: {
      'Washington': 1.35,
      'default': 1.35,
    }
  },

  // ============================================
  // SOUTHEAST REGION
  // ============================================
  'FL': {
    stateBase: 1.00,
    metros: {
      'Miami': 1.18,
      'Fort Lauderdale': 1.12,
      'Tampa': 1.00,
      'Orlando': 0.98,
      'Jacksonville': 0.92,
      'West Palm Beach': 1.15,
      'Naples': 1.20,
      'Sarasota': 1.05,
      'St. Petersburg': 0.98,
      'Tallahassee': 0.88,
      'default': 1.00,
    }
  },
  'GA': {
    stateBase: 0.90,
    metros: {
      'Atlanta': 1.02,
      'Savannah': 0.92,
      'Augusta': 0.85,
      'Macon': 0.82,
      'Columbus': 0.85,
      'default': 0.90,
    }
  },
  'NC': {
    stateBase: 0.88,
    metros: {
      'Charlotte': 0.98,
      'Raleigh': 0.95,
      'Durham': 0.95,
      'Asheville': 1.00,
      'Greensboro': 0.88,
      'Winston-Salem': 0.85,
      'default': 0.88,
    }
  },
  'SC': {
    stateBase: 0.85,
    metros: {
      'Charleston': 1.00,
      'Columbia': 0.85,
      'Greenville': 0.88,
      'Myrtle Beach': 0.90,
      'default': 0.85,
    }
  },
  'VA': {
    stateBase: 1.00,
    metros: {
      'Northern Virginia': 1.25,
      'Arlington': 1.30,
      'Alexandria': 1.28,
      'Richmond': 0.95,
      'Virginia Beach': 0.92,
      'Norfolk': 0.90,
      'Charlottesville': 1.00,
      'default': 1.00,
    }
  },
  'WV': {
    stateBase: 0.78,
    metros: {
      'Charleston': 0.80,
      'Huntington': 0.76,
      'Morgantown': 0.82,
      'default': 0.78,
    }
  },
  'KY': {
    stateBase: 0.82,
    metros: {
      'Louisville': 0.88,
      'Lexington': 0.85,
      'Bowling Green': 0.80,
      'default': 0.82,
    }
  },
  'TN': {
    stateBase: 0.88,
    metros: {
      'Nashville': 1.00,
      'Memphis': 0.85,
      'Knoxville': 0.85,
      'Chattanooga': 0.88,
      'Franklin': 1.02,
      'default': 0.88,
    }
  },
  'AL': {
    stateBase: 0.80,
    metros: {
      'Birmingham': 0.85,
      'Huntsville': 0.88,
      'Mobile': 0.78,
      'Montgomery': 0.78,
      'default': 0.80,
    }
  },
  'MS': {
    stateBase: 0.75,
    metros: {
      'Jackson': 0.78,
      'Gulfport': 0.76,
      'default': 0.75,
    }
  },
  'LA': {
    stateBase: 0.85,
    metros: {
      'New Orleans': 0.95,
      'Baton Rouge': 0.85,
      'Shreveport': 0.80,
      'default': 0.85,
    }
  },
  'AR': {
    stateBase: 0.78,
    metros: {
      'Little Rock': 0.82,
      'Fayetteville': 0.85,
      'default': 0.78,
    }
  },

  // ============================================
  // MIDWEST REGION
  // ============================================
  'OH': {
    stateBase: 0.85,
    metros: {
      'Columbus': 0.92,
      'Cleveland': 0.88,
      'Cincinnati': 0.90,
      'Toledo': 0.82,
      'Akron': 0.85,
      'Dayton': 0.82,
      'default': 0.85,
    }
  },
  'MI': {
    stateBase: 0.88,
    metros: {
      'Detroit': 0.92,
      'Grand Rapids': 0.88,
      'Ann Arbor': 1.05,
      'Lansing': 0.85,
      'Flint': 0.78,
      'default': 0.88,
    }
  },
  'IL': {
    stateBase: 1.00,
    metros: {
      'Chicago': 1.15,
      'Naperville': 1.10,
      'Springfield': 0.85,
      'Peoria': 0.82,
      'Rockford': 0.88,
      'default': 1.00,
    }
  },
  'IN': {
    stateBase: 0.82,
    metros: {
      'Indianapolis': 0.88,
      'Fort Wayne': 0.80,
      'Evansville': 0.78,
      'South Bend': 0.82,
      'default': 0.82,
    }
  },
  'WI': {
    stateBase: 0.92,
    metros: {
      'Milwaukee': 0.98,
      'Madison': 1.00,
      'Green Bay': 0.88,
      'Kenosha': 0.95,
      'default': 0.92,
    }
  },
  'MN': {
    stateBase: 1.00,
    metros: {
      'Minneapolis': 1.08,
      'St. Paul': 1.05,
      'Rochester': 0.98,
      'Duluth': 0.92,
      'default': 1.00,
    }
  },
  'IA': {
    stateBase: 0.85,
    metros: {
      'Des Moines': 0.90,
      'Cedar Rapids': 0.85,
      'Iowa City': 0.88,
      'default': 0.85,
    }
  },
  'MO': {
    stateBase: 0.85,
    metros: {
      'St. Louis': 0.92,
      'Kansas City': 0.90,
      'Springfield': 0.80,
      'Columbia': 0.85,
      'default': 0.85,
    }
  },
  'KS': {
    stateBase: 0.82,
    metros: {
      'Kansas City': 0.88,
      'Wichita': 0.80,
      'Overland Park': 0.90,
      'default': 0.82,
    }
  },
  'NE': {
    stateBase: 0.85,
    metros: {
      'Omaha': 0.90,
      'Lincoln': 0.88,
      'default': 0.85,
    }
  },
  'SD': {
    stateBase: 0.82,
    metros: {
      'Sioux Falls': 0.88,
      'Rapid City': 0.85,
      'default': 0.82,
    }
  },
  'ND': {
    stateBase: 0.85,
    metros: {
      'Fargo': 0.90,
      'Bismarck': 0.85,
      'default': 0.85,
    }
  },

  // ============================================
  // SOUTHWEST REGION
  // ============================================
  'TX': {
    stateBase: 0.92,
    metros: {
      'Austin': 1.08,
      'Dallas': 1.00,
      'Houston': 0.95,
      'San Antonio': 0.88,
      'Fort Worth': 0.95,
      'El Paso': 0.82,
      'Plano': 1.02,
      'Arlington': 0.95,
      'Corpus Christi': 0.85,
      'default': 0.92,
    }
  },
  'AZ': {
    stateBase: 0.95,
    metros: {
      'Phoenix': 1.00,
      'Scottsdale': 1.15,
      'Tucson': 0.88,
      'Mesa': 0.95,
      'Chandler': 1.00,
      'Gilbert': 1.02,
      'default': 0.95,
    }
  },
  'NV': {
    stateBase: 1.05,
    metros: {
      'Las Vegas': 1.05,
      'Reno': 1.10,
      'Henderson': 1.05,
      'default': 1.05,
    }
  },
  'NM': {
    stateBase: 0.88,
    metros: {
      'Albuquerque': 0.92,
      'Santa Fe': 1.10,
      'Las Cruces': 0.82,
      'default': 0.88,
    }
  },
  'OK': {
    stateBase: 0.78,
    metros: {
      'Oklahoma City': 0.82,
      'Tulsa': 0.80,
      'Norman': 0.82,
      'default': 0.78,
    }
  },

  // ============================================
  // WEST REGION
  // ============================================
  'CA': {
    stateBase: 1.35,
    metros: {
      'San Francisco': 1.65,
      'San Jose': 1.55,
      'Los Angeles': 1.40,
      'San Diego': 1.35,
      'Sacramento': 1.20,
      'Oakland': 1.45,
      'Fresno': 1.05,
      'Irvine': 1.40,
      'Long Beach': 1.35,
      'Pasadena': 1.38,
      'Santa Barbara': 1.45,
      'default': 1.35,
    }
  },
  'WA': {
    stateBase: 1.15,
    metros: {
      'Seattle': 1.35,
      'Bellevue': 1.40,
      'Tacoma': 1.10,
      'Spokane': 0.98,
      'Vancouver': 1.15,
      'default': 1.15,
    }
  },
  'OR': {
    stateBase: 1.10,
    metros: {
      'Portland': 1.18,
      'Eugene': 1.05,
      'Salem': 1.00,
      'Bend': 1.15,
      'default': 1.10,
    }
  },
  'CO': {
    stateBase: 1.05,
    metros: {
      'Denver': 1.15,
      'Boulder': 1.25,
      'Colorado Springs': 1.00,
      'Fort Collins': 1.08,
      'Aurora': 1.10,
      'default': 1.05,
    }
  },
  'UT': {
    stateBase: 1.00,
    metros: {
      'Salt Lake City': 1.08,
      'Provo': 1.00,
      'Ogden': 0.95,
      'Park City': 1.30,
      'default': 1.00,
    }
  },
  'ID': {
    stateBase: 0.95,
    metros: {
      'Boise': 1.05,
      'Idaho Falls': 0.90,
      'default': 0.95,
    }
  },
  'MT': {
    stateBase: 0.92,
    metros: {
      'Billings': 0.95,
      'Missoula': 1.00,
      'Bozeman': 1.10,
      'default': 0.92,
    }
  },
  'WY': {
    stateBase: 0.90,
    metros: {
      'Cheyenne': 0.92,
      'Casper': 0.90,
      'Jackson': 1.35,
      'default': 0.90,
    }
  },
  'AK': {
    stateBase: 1.35,
    metros: {
      'Anchorage': 1.35,
      'Fairbanks': 1.40,
      'Juneau': 1.45,
      'default': 1.35,
    }
  },
  'HI': {
    stateBase: 1.50,
    metros: {
      'Honolulu': 1.55,
      'Maui': 1.60,
      'default': 1.50,
    }
  },
};

// Helper function to get regional multiplier
export function getRegionalMultiplier(state: string, city?: string): number {
  const stateData = REGIONAL_MULTIPLIERS[state];
  if (!stateData) return 1.0;

  if (city && stateData.metros[city]) {
    return stateData.metros[city];
  }
  return stateData.stateBase;
}
```

---

## Cost Calculation Functions

### Base Costs Configuration

```typescript
// src/lib/analysis/financial/costEstimator.ts

// Base costs per square foot by renovation scope
const BASE_COSTS_PER_SQFT: Record<string, { low: number; mid: number; high: number }> = {
  cosmetic: { low: 10, mid: 15, high: 25 },      // Paint, carpet, fixtures
  moderate: { low: 25, mid: 40, high: 60 },      // + Kitchen/bath updates
  major: { low: 50, mid: 75, high: 100 },        // + Systems, structural
  gut: { low: 80, mid: 120, high: 175 },         // Complete renovation
};

// State transfer tax rates
const TRANSFER_TAX_RATES: Record<string, number> = {
  'PA': 0.02,    // 2% (1% state + 1% local typical)
  'FL': 0.007,   // 0.7%
  'TX': 0,       // No transfer tax
  'CA': 0.0011,  // $1.10 per $1000
  'NY': 0.004,   // 0.4%
  'NJ': 0.01,    // 1%
  'MD': 0.01,    // 1%
  'VA': 0.002,   // 0.2%
  'GA': 0.001,   // 0.1%
  'NC': 0.002,   // 0.2%
  // Default to 1% for unlisted states
};
```

### Rehab Cost Estimator

```typescript
export function estimateRehabCosts(input: RehabEstimateInput): CostBreakdown['rehab'] {
  const { property, regridData, condition = 'fair', scope = 'moderate' } = input;

  const sqft = regridData?.building_sqft || property.sqft || 1500;
  const yearBuilt = regridData?.year_built || property.yearBuilt || 1970;
  const state = property.state || 'PA';
  const city = property.city;

  // Get regional multiplier (with metro-level granularity)
  const regionalMultiplier = getRegionalMultiplier(state, city);

  // Age-based adjustment
  const age = new Date().getFullYear() - yearBuilt;
  const ageMultiplier = age > 50 ? 1.3 : age > 30 ? 1.15 : age > 15 ? 1.0 : 0.9;

  // Condition-based adjustment
  const conditionMultiplier = {
    'excellent': 0.5,
    'good': 0.7,
    'fair': 1.0,
    'poor': 1.3,
    'distressed': 1.6,
  }[condition] || 1.0;

  // Get base cost range
  const baseCosts = BASE_COSTS_PER_SQFT[scope];

  // Calculate total estimate
  const costPerSqft = baseCosts.mid * regionalMultiplier * ageMultiplier * conditionMultiplier;
  const baseTotal = sqft * costPerSqft;

  // Calculate breakdown
  const breakdown = calculateRehabBreakdown(baseTotal, scope, yearBuilt);

  // Add contingency (10% for cosmetic, 15% for moderate, 20% for major/gut)
  const contingencyRate = scope === 'cosmetic' ? 0.10 : scope === 'moderate' ? 0.15 : 0.20;
  const contingency = baseTotal * contingencyRate;

  return {
    estimatedTotal: baseTotal + contingency,
    breakdown: {
      ...breakdown,
      laborMultiplier: regionalMultiplier,
    },
    contingency,
    confidence: determineRehabConfidence(regridData, condition),
  };
}

function calculateRehabBreakdown(
  total: number,
  scope: string,
  yearBuilt: number
): Omit<RehabBreakdown, 'laborMultiplier'> {
  const age = new Date().getFullYear() - yearBuilt;

  // Percentage allocations by scope
  const allocations: Record<string, Record<string, number>> = {
    cosmetic: {
      roof: 0,
      hvac: 0,
      electrical: 0,
      plumbing: 0,
      foundation: 0,
      interior: 0.60,
      exterior: 0.15,
      kitchen: 0.15,
      bathrooms: 0.10,
      other: 0,
    },
    moderate: {
      roof: age > 25 ? 0.12 : 0,
      hvac: age > 20 ? 0.10 : 0,
      electrical: 0.05,
      plumbing: 0.05,
      foundation: 0,
      interior: 0.30,
      exterior: 0.10,
      kitchen: 0.18,
      bathrooms: 0.10,
      other: 0,
    },
    major: {
      roof: 0.12,
      hvac: 0.12,
      electrical: 0.10,
      plumbing: 0.10,
      foundation: 0.05,
      interior: 0.20,
      exterior: 0.08,
      kitchen: 0.15,
      bathrooms: 0.08,
      other: 0,
    },
    gut: {
      roof: 0.10,
      hvac: 0.10,
      electrical: 0.12,
      plumbing: 0.12,
      foundation: 0.08,
      interior: 0.18,
      exterior: 0.08,
      kitchen: 0.12,
      bathrooms: 0.10,
      other: 0,
    },
  };

  const alloc = allocations[scope] || allocations.moderate;

  return {
    roof: total * alloc.roof,
    hvac: total * alloc.hvac,
    electrical: total * alloc.electrical,
    plumbing: total * alloc.plumbing,
    foundation: total * alloc.foundation,
    interior: total * alloc.interior,
    exterior: total * alloc.exterior,
    kitchen: total * alloc.kitchen,
    bathrooms: total * alloc.bathrooms,
    other: total * alloc.other,
  };
}

function determineRehabConfidence(
  regridData?: RegridData,
  condition?: string
): 'low' | 'medium' | 'high' {
  if (!regridData) return 'low';
  if (!regridData.building_sqft || !regridData.year_built) return 'low';
  if (condition === 'distressed' || condition === 'poor') return 'medium';
  return 'medium'; // Would be 'high' only with actual inspection data
}
```

### Acquisition Cost Calculator

```typescript
export function calculateAcquisitionCosts(
  purchasePrice: number,
  state: string,
  auctionType: 'tax_deed' | 'tax_lien' | 'foreclosure' | 'traditional'
): CostBreakdown['acquisition'] {
  // Get transfer tax rate (default to 1% if not listed)
  const transferRate = TRANSFER_TAX_RATES[state] || 0.01;
  const transferTaxes = purchasePrice * transferRate;

  // Closing costs (title search, recording, legal fees)
  // Minimum $2,500 or 2% of purchase price
  const closingCosts = Math.max(2500, purchasePrice * 0.02);

  // Auction fees based on auction type
  let auctionFees = 0;
  if (auctionType === 'tax_deed' || auctionType === 'tax_lien') {
    auctionFees = purchasePrice * 0.05; // 5% buyer's premium typical
  } else if (auctionType === 'foreclosure') {
    auctionFees = purchasePrice * 0.03; // 3% typical
  }
  // Traditional sales typically have no buyer auction fees

  const totalAcquisition = purchasePrice + closingCosts + transferTaxes + auctionFees;

  return {
    purchasePrice,
    closingCosts,
    transferTaxes,
    auctionFees,
    totalAcquisition,
  };
}
```

### Holding Cost Calculator

```typescript
export function calculateHoldingCosts(
  purchasePrice: number,
  monthlyTaxes: number,
  monthlyInsurance: number,
  projectedMonths: number,
  hasLoan: boolean = false,
  loanAmount: number = 0,
  interestRate: number = 0.08
): CostBreakdown['holding'] {
  // Calculate monthly loan interest (interest-only during holding period)
  const monthlyLoanInterest = hasLoan ? (loanAmount * interestRate) / 12 : 0;

  // Base utility estimate (vacant property - minimal)
  const utilities = 150;

  // Monthly maintenance reserve
  const maintenance = 100;

  const breakdown: HoldingBreakdown = {
    propertyTaxes: monthlyTaxes,
    insurance: monthlyInsurance,
    utilities,
    loanInterest: monthlyLoanInterest,
    hoa: 0, // Would come from property data if available
    maintenance,
  };

  const monthlyTotal = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return {
    monthlyTotal,
    projectedMonths,
    breakdown,
    totalHolding: monthlyTotal * projectedMonths,
  };
}
```

### Selling Cost Calculator

```typescript
export function calculateSellingCosts(
  salePrice: number,
  useAgent: boolean = true
): CostBreakdown['selling'] {
  // Agent commission (6% total - 3% to buyer's agent, 3% to seller's agent)
  const agentCommission = useAgent ? salePrice * 0.06 : 0;

  // Seller closing costs (title insurance, escrow fees, etc.)
  const closingCosts = salePrice * 0.015;

  // Staging and marketing costs
  const stagingMarketing = useAgent ? 2000 : 500;

  return {
    agentCommission,
    closingCosts,
    stagingMarketing,
    totalSelling: agentCommission + closingCosts + stagingMarketing,
  };
}
```

### Complete Cost Breakdown Calculator

```typescript
export function calculateTotalCosts(
  purchasePrice: number,
  property: PropertyData,
  regridData?: RegridData,
  options: {
    rehabScope?: 'cosmetic' | 'moderate' | 'major' | 'gut';
    propertyCondition?: 'excellent' | 'good' | 'fair' | 'poor' | 'distressed';
    holdingMonths?: number;
    useFinancing?: boolean;
    auctionType?: 'tax_deed' | 'tax_lien' | 'foreclosure' | 'traditional';
    estimatedARV?: number;
  } = {}
): CostBreakdown {
  const {
    rehabScope = 'moderate',
    propertyCondition = 'fair',
    holdingMonths = 6,
    useFinancing = false,
    auctionType = 'tax_deed',
    estimatedARV,
  } = options;

  const state = property.state || 'PA';
  const monthlyTaxes = (property.annualTaxes || 3000) / 12;
  const monthlyInsurance = (estimatedARV || purchasePrice) * 0.005 / 12;

  // Calculate each cost category
  const acquisition = calculateAcquisitionCosts(purchasePrice, state, auctionType);

  const rehab = estimateRehabCosts({
    property,
    regridData,
    condition: propertyCondition,
    scope: rehabScope,
  });

  const holding = calculateHoldingCosts(
    purchasePrice,
    monthlyTaxes,
    monthlyInsurance,
    holdingMonths,
    useFinancing,
    useFinancing ? purchasePrice * 0.7 : 0, // Assume 70% LTV if financing
    0.08 // 8% interest rate default
  );

  // Use estimated ARV for selling cost calculation, or assume 30% appreciation
  const arvForSelling = estimatedARV || purchasePrice * 1.3;
  const selling = calculateSellingCosts(arvForSelling);

  // Calculate total investment
  const totalInvestment =
    acquisition.totalAcquisition +
    rehab.estimatedTotal +
    holding.totalHolding +
    selling.totalSelling;

  return {
    acquisition,
    rehab,
    holding,
    selling,
    totalInvestment,
  };
}
```

---

## UI Components

### Cost Breakdown Display Component

```typescript
// src/components/analysis/CostBreakdownCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CostBreakdown } from '@/lib/analysis/financial/costTypes';

interface CostBreakdownCardProps {
  costs: CostBreakdown;
  className?: string;
}

export function CostBreakdownCard({ costs, className }: CostBreakdownCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const categories = [
    {
      name: 'Acquisition',
      amount: costs.acquisition.totalAcquisition,
      color: 'bg-blue-500',
    },
    {
      name: 'Rehab',
      amount: costs.rehab.estimatedTotal,
      color: 'bg-orange-500',
    },
    {
      name: 'Holding',
      amount: costs.holding.totalHolding,
      color: 'bg-yellow-500',
    },
    {
      name: 'Selling',
      amount: costs.selling.totalSelling,
      color: 'bg-green-500',
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Total Investment</span>
          <span className="text-2xl font-bold">
            {formatCurrency(costs.totalInvestment)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked bar visualization */}
        <div className="h-4 flex rounded-full overflow-hidden">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className={`${cat.color}`}
              style={{
                width: `${(cat.amount / costs.totalInvestment) * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Category breakdown */}
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                <span className="text-sm">{cat.name}</span>
              </div>
              <span className="font-medium">{formatCurrency(cat.amount)}</span>
            </div>
          ))}
        </div>

        {/* Rehab confidence badge */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Rehab Estimate Confidence
            </span>
            <Badge variant={
              costs.rehab.confidence === 'high' ? 'default' :
              costs.rehab.confidence === 'medium' ? 'secondary' : 'outline'
            }>
              {costs.rehab.confidence}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Rehab Breakdown Detail Component

```typescript
// src/components/analysis/RehabBreakdownCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RehabBreakdown } from '@/lib/analysis/financial/costTypes';

interface RehabBreakdownCardProps {
  breakdown: RehabBreakdown;
  total: number;
  contingency: number;
  className?: string;
}

export function RehabBreakdownCard({
  breakdown,
  total,
  contingency,
  className
}: RehabBreakdownCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const items = [
    { name: 'Roof', amount: breakdown.roof, icon: '🏠' },
    { name: 'HVAC', amount: breakdown.hvac, icon: '❄️' },
    { name: 'Electrical', amount: breakdown.electrical, icon: '⚡' },
    { name: 'Plumbing', amount: breakdown.plumbing, icon: '🚿' },
    { name: 'Foundation', amount: breakdown.foundation, icon: '🧱' },
    { name: 'Interior', amount: breakdown.interior, icon: '🎨' },
    { name: 'Exterior', amount: breakdown.exterior, icon: '🏡' },
    { name: 'Kitchen', amount: breakdown.kitchen, icon: '🍳' },
    { name: 'Bathrooms', amount: breakdown.bathrooms, icon: '🛁' },
    { name: 'Other', amount: breakdown.other, icon: '📦' },
  ].filter(item => item.amount > 0);

  const subtotal = Object.values(breakdown)
    .filter((v): v is number => typeof v === 'number' && v !== breakdown.laborMultiplier)
    .reduce((a, b) => a + b, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Rehab Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Regional multiplier notice */}
        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
          Regional labor multiplier: {breakdown.laborMultiplier.toFixed(2)}x
        </div>

        {/* Line items */}
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{item.icon}</span>
                <span className="text-sm">{item.name}</span>
              </div>
              <span className="font-medium">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>

        {/* Subtotal and contingency */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Contingency</span>
            <span>{formatCurrency(contingency)}</span>
          </div>
          <div className="flex items-center justify-between font-bold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Holding Cost Summary Component

```typescript
// src/components/analysis/HoldingCostCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HoldingBreakdown } from '@/lib/analysis/financial/costTypes';

interface HoldingCostCardProps {
  holding: {
    monthlyTotal: number;
    projectedMonths: number;
    breakdown: HoldingBreakdown;
    totalHolding: number;
  };
  className?: string;
}

export function HoldingCostCard({ holding, className }: HoldingCostCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const items = [
    { name: 'Property Taxes', amount: holding.breakdown.propertyTaxes },
    { name: 'Insurance', amount: holding.breakdown.insurance },
    { name: 'Utilities', amount: holding.breakdown.utilities },
    { name: 'Loan Interest', amount: holding.breakdown.loanInterest },
    { name: 'HOA', amount: holding.breakdown.hoa },
    { name: 'Maintenance', amount: holding.breakdown.maintenance },
  ].filter(item => item.amount > 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Holding Costs</span>
          <span className="text-lg font-normal text-muted-foreground">
            {holding.projectedMonths} months
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monthly breakdown */}
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Monthly Costs</div>
          {items.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <span className="text-sm">{item.name}</span>
              <span className="font-medium">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Monthly Total</span>
            <span className="font-medium">{formatCurrency(holding.monthlyTotal)}</span>
          </div>
          <div className="flex items-center justify-between font-bold text-lg">
            <span>Total Holding ({holding.projectedMonths} mo)</span>
            <span>{formatCurrency(holding.totalHolding)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Testing

### Unit Tests for Cost Calculator

```typescript
// src/lib/analysis/financial/__tests__/costEstimator.test.ts

import { describe, it, expect } from 'vitest';
import {
  estimateRehabCosts,
  calculateAcquisitionCosts,
  calculateHoldingCosts,
  calculateSellingCosts,
  calculateTotalCosts,
  getRegionalMultiplier,
} from '../costEstimator';

describe('Regional Multipliers', () => {
  it('returns state base when city not found', () => {
    const multiplier = getRegionalMultiplier('PA', 'Unknown City');
    expect(multiplier).toBe(0.95);
  });

  it('returns metro multiplier when city found', () => {
    const multiplier = getRegionalMultiplier('PA', 'Philadelphia');
    expect(multiplier).toBe(1.10);
  });

  it('returns 1.0 for unknown state', () => {
    const multiplier = getRegionalMultiplier('XX');
    expect(multiplier).toBe(1.0);
  });
});

describe('Rehab Cost Estimator', () => {
  it('calculates costs for moderate scope', () => {
    const result = estimateRehabCosts({
      property: { sqft: 1500, yearBuilt: 1980, state: 'PA' },
      scope: 'moderate',
    });

    expect(result.estimatedTotal).toBeGreaterThan(0);
    expect(result.confidence).toBeDefined();
    expect(result.breakdown.laborMultiplier).toBe(0.95);
  });

  it('increases costs for older homes', () => {
    const newHome = estimateRehabCosts({
      property: { sqft: 1500, yearBuilt: 2010, state: 'PA' },
      scope: 'moderate',
    });

    const oldHome = estimateRehabCosts({
      property: { sqft: 1500, yearBuilt: 1960, state: 'PA' },
      scope: 'moderate',
    });

    expect(oldHome.estimatedTotal).toBeGreaterThan(newHome.estimatedTotal);
  });
});

describe('Acquisition Costs', () => {
  it('calculates tax deed auction costs', () => {
    const result = calculateAcquisitionCosts(50000, 'PA', 'tax_deed');

    expect(result.purchasePrice).toBe(50000);
    expect(result.auctionFees).toBe(2500); // 5%
    expect(result.transferTaxes).toBe(1000); // 2%
    expect(result.totalAcquisition).toBeGreaterThan(50000);
  });

  it('has no transfer tax for TX', () => {
    const result = calculateAcquisitionCosts(50000, 'TX', 'tax_deed');
    expect(result.transferTaxes).toBe(0);
  });
});

describe('Holding Costs', () => {
  it('calculates monthly and total holding costs', () => {
    const result = calculateHoldingCosts(50000, 250, 100, 6, false, 0, 0.08);

    expect(result.monthlyTotal).toBeGreaterThan(0);
    expect(result.projectedMonths).toBe(6);
    expect(result.totalHolding).toBe(result.monthlyTotal * 6);
  });

  it('includes loan interest when financing', () => {
    const withoutLoan = calculateHoldingCosts(50000, 250, 100, 6, false, 0, 0.08);
    const withLoan = calculateHoldingCosts(50000, 250, 100, 6, true, 35000, 0.08);

    expect(withLoan.monthlyTotal).toBeGreaterThan(withoutLoan.monthlyTotal);
  });
});

describe('Total Costs', () => {
  it('calculates complete cost breakdown', () => {
    const result = calculateTotalCosts(
      50000,
      { sqft: 1500, yearBuilt: 1980, state: 'PA', annualTaxes: 3000 },
      undefined,
      {
        rehabScope: 'moderate',
        holdingMonths: 6,
        auctionType: 'tax_deed',
        estimatedARV: 120000,
      }
    );

    expect(result.acquisition.totalAcquisition).toBeGreaterThan(50000);
    expect(result.rehab.estimatedTotal).toBeGreaterThan(0);
    expect(result.holding.totalHolding).toBeGreaterThan(0);
    expect(result.selling.totalSelling).toBeGreaterThan(0);
    expect(result.totalInvestment).toBe(
      result.acquisition.totalAcquisition +
      result.rehab.estimatedTotal +
      result.holding.totalHolding +
      result.selling.totalSelling
    );
  });
});
```

---

## Implementation Checklist

### Phase 8a Tasks

- [ ] Create `src/lib/analysis/financial/costTypes.ts` with all interfaces
- [ ] Create `src/lib/analysis/financial/regionalMultipliers.ts` with 50-state config
- [ ] Create `src/lib/analysis/financial/costEstimator.ts` with calculation functions
- [ ] Create `src/components/analysis/CostBreakdownCard.tsx`
- [ ] Create `src/components/analysis/RehabBreakdownCard.tsx`
- [ ] Create `src/components/analysis/HoldingCostCard.tsx`
- [ ] Write unit tests for all calculation functions
- [ ] Integrate with property detail page

### Estimated Time

- Type definitions: 1 hour
- Regional multipliers: 1 hour
- Cost calculation functions: 3 hours
- UI components: 2 hours
- Testing: 2 hours
- Integration: 1 hour

**Total: ~10 hours**
