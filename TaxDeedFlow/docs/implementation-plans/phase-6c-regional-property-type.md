# Phase 6C - Regional & Property Type Adjustments

## Overview

Phase 6C implements regional market adjustments and property type-specific scoring to provide more accurate investment scores based on geographic and property characteristics. These adjustments fine-tune the base scoring algorithm to account for local market conditions, state-specific risks, and the unique valuation needs of different property types.

---

## Regional Market Adjustments

### State-Level Adjustments Configuration

```typescript
// src/lib/analysis/scoring/regionalAdjustments.ts

/**
 * Regional adjustment configuration
 * Adjusts scores based on state/metro-level market characteristics
 */
export const REGIONAL_ADJUSTMENTS: Record<string, RegionalAdjustment> = {
  // High-appreciation states
  'FL': {
    state: 'FL',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.1,
        reason: 'Florida historically shows strong appreciation',
      },
      {
        category: 'risk',
        component: 'hurricane_risk',
        factor: 0.8, // Lower score (more risk)
        reason: 'High hurricane exposure in Florida',
      },
      {
        category: 'risk',
        component: 'flood_risk',
        factor: 0.9,
        reason: 'Elevated flood risk in Florida',
      },
    ],
  },

  'TX': {
    state: 'TX',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.1,
        reason: 'Strong population growth in Texas',
      },
      {
        category: 'financial',
        component: 'tax_to_value_ratio',
        factor: 0.9, // Higher taxes relative to value
        reason: 'Texas has higher property tax rates',
      },
    ],
  },

  'CA': {
    state: 'CA',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.15,
        reason: 'California premium market appreciation',
      },
      {
        category: 'risk',
        component: 'earthquake_risk',
        factor: 0.7,
        reason: 'Significant earthquake risk in California',
      },
      {
        category: 'risk',
        component: 'wildfire_risk',
        factor: 0.8,
        reason: 'Elevated wildfire risk in California',
      },
      {
        category: 'profit',
        component: 'rent_potential',
        factor: 1.1,
        reason: 'Strong rental market in California',
      },
    ],
  },

  'PA': {
    state: 'PA',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 0.95,
        reason: 'Moderate appreciation in Pennsylvania',
      },
      {
        category: 'financial',
        component: 'rehab_costs',
        factor: 0.9, // Lower rehab costs
        reason: 'Lower labor costs in Pennsylvania',
      },
    ],
  },

  'AZ': {
    state: 'AZ',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.15,
        reason: 'Strong migration and demand in Arizona',
      },
      {
        category: 'risk',
        component: 'wildfire_risk',
        factor: 0.85,
        reason: 'Wildfire risk in Arizona desert areas',
      },
    ],
  },

  'GA': {
    state: 'GA',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.1,
        reason: 'Strong population growth in Georgia metro areas',
      },
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.05,
        reason: 'Moderate-strong appreciation in Georgia',
      },
      {
        category: 'risk',
        component: 'foreclosure_process',
        factor: 0.95,
        reason: 'Judicial foreclosure state - longer process',
      },
    ],
  },

  'NC': {
    state: 'NC',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.1,
        reason: 'Growing market with Research Triangle and Charlotte',
      },
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.08,
        reason: 'Strong appreciation in North Carolina metros',
      },
      {
        category: 'financial',
        component: 'upset_bid_process',
        factor: 0.9,
        reason: 'NC upset bid process allows overbidding - more competition',
      },
    ],
  },

  'OH': {
    state: 'OH',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 0.9,
        reason: 'Moderate appreciation in Ohio markets',
      },
      {
        category: 'financial',
        component: 'tax_lien_interest',
        factor: 1.1,
        reason: 'Tax lien certificates offer 18% interest in Ohio',
      },
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 1.1,
        reason: 'Favorable rent-to-price ratios in Ohio',
      },
    ],
  },

  'MI': {
    state: 'MI',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 0.85,
        reason: 'Lower appreciation outside Detroit metro',
      },
      {
        category: 'financial',
        component: 'rehab_costs',
        factor: 0.85,
        reason: 'Lower labor and material costs in Michigan',
      },
      {
        category: 'risk',
        component: 'vacancy_risk',
        factor: 0.9,
        reason: 'Higher vacancy rates in some Michigan areas',
      },
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 1.15,
        reason: 'Strong cash flow potential in Michigan',
      },
    ],
  },

  'NV': {
    state: 'NV',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.1,
        reason: 'Strong demand in Las Vegas metro',
      },
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.1,
        reason: 'Strong appreciation in Nevada markets',
      },
      {
        category: 'risk',
        component: 'market_volatility',
        factor: 0.85,
        reason: 'Nevada market can be volatile',
      },
    ],
  },

  'CO': {
    state: 'CO',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.15,
        reason: 'Strong population growth in Colorado',
      },
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.1,
        reason: 'Strong appreciation in Denver metro',
      },
      {
        category: 'financial',
        component: 'tax_lien_interest',
        factor: 1.05,
        reason: 'Tax lien state with competitive interest rates',
      },
      {
        category: 'risk',
        component: 'wildfire_risk',
        factor: 0.85,
        reason: 'Wildfire risk in mountain areas',
      },
    ],
  },
};
```

### State Adjustment Summary Table

| State | Category | Component | Factor | Impact |
|-------|----------|-----------|--------|--------|
| **FL** | market | appreciation_rate | 1.1 | +10% boost |
| **FL** | risk | hurricane_risk | 0.8 | -20% penalty |
| **FL** | risk | flood_risk | 0.9 | -10% penalty |
| **TX** | market | demand | 1.1 | +10% boost |
| **TX** | financial | tax_to_value_ratio | 0.9 | -10% penalty |
| **CA** | market | appreciation_rate | 1.15 | +15% boost |
| **CA** | risk | earthquake_risk | 0.7 | -30% penalty |
| **CA** | risk | wildfire_risk | 0.8 | -20% penalty |
| **CA** | profit | rent_potential | 1.1 | +10% boost |
| **PA** | market | appreciation_rate | 0.95 | -5% adjustment |
| **PA** | financial | rehab_costs | 0.9 | +10% (lower costs) |
| **AZ** | market | demand | 1.15 | +15% boost |
| **AZ** | risk | wildfire_risk | 0.85 | -15% penalty |
| **GA** | market | demand | 1.1 | +10% boost |
| **GA** | market | appreciation_rate | 1.05 | +5% boost |
| **GA** | risk | foreclosure_process | 0.95 | -5% penalty |
| **NC** | market | demand | 1.1 | +10% boost |
| **NC** | market | appreciation_rate | 1.08 | +8% boost |
| **NC** | financial | upset_bid_process | 0.9 | -10% penalty |
| **OH** | market | appreciation_rate | 0.9 | -10% adjustment |
| **OH** | financial | tax_lien_interest | 1.1 | +10% boost |
| **OH** | profit | cash_flow | 1.1 | +10% boost |
| **MI** | market | appreciation_rate | 0.85 | -15% adjustment |
| **MI** | financial | rehab_costs | 0.85 | +15% (lower costs) |
| **MI** | risk | vacancy_risk | 0.9 | -10% penalty |
| **MI** | profit | cash_flow | 1.15 | +15% boost |
| **NV** | market | demand | 1.1 | +10% boost |
| **NV** | market | appreciation_rate | 1.1 | +10% boost |
| **NV** | risk | market_volatility | 0.85 | -15% penalty |
| **CO** | market | demand | 1.15 | +15% boost |
| **CO** | market | appreciation_rate | 1.1 | +10% boost |
| **CO** | financial | tax_lien_interest | 1.05 | +5% boost |
| **CO** | risk | wildfire_risk | 0.85 | -15% penalty |

---

## Metro-Level Adjustments

Metro-level adjustments override state-level adjustments for the same component, providing more granular market-specific scoring.

```typescript
/**
 * Metro-level adjustments (override state-level)
 */
export const METRO_ADJUSTMENTS: Record<string, RegionalAdjustment> = {
  'Miami-Fort Lauderdale-FL': {
    state: 'FL',
    metro: 'Miami-Fort Lauderdale',
    adjustments: [
      {
        category: 'market',
        component: 'competition',
        factor: 0.8, // Higher competition = lower score
        reason: 'High investor competition in Miami metro',
      },
      {
        category: 'profit',
        component: 'rent_potential',
        factor: 1.15,
        reason: 'Premium rental market in Miami',
      },
    ],
  },

  'Austin-TX': {
    state: 'TX',
    metro: 'Austin',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.2,
        reason: 'Exceptional growth market in Austin',
      },
      {
        category: 'market',
        component: 'competition',
        factor: 0.75,
        reason: 'Very high competition in Austin market',
      },
    ],
  },

  'Pittsburgh-PA': {
    state: 'PA',
    metro: 'Pittsburgh',
    adjustments: [
      {
        category: 'market',
        component: 'competition',
        factor: 1.1,
        reason: 'Lower competition in Pittsburgh market',
      },
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 1.1,
        reason: 'Favorable rent-to-price ratios',
      },
    ],
  },

  'Tampa-FL': {
    state: 'FL',
    metro: 'Tampa',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.15,
        reason: 'Strong appreciation in Tampa Bay area',
      },
      {
        category: 'market',
        component: 'competition',
        factor: 0.85,
        reason: 'Growing investor interest in Tampa',
      },
    ],
  },

  'Orlando-FL': {
    state: 'FL',
    metro: 'Orlando',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.15,
        reason: 'Strong tourism and population growth in Orlando',
      },
      {
        category: 'profit',
        component: 'rent_potential',
        factor: 1.1,
        reason: 'Strong short-term rental market',
      },
    ],
  },

  'Jacksonville-FL': {
    state: 'FL',
    metro: 'Jacksonville',
    adjustments: [
      {
        category: 'market',
        component: 'competition',
        factor: 1.05,
        reason: 'Moderate competition in Jacksonville',
      },
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 1.1,
        reason: 'Better cash flow ratios than South Florida',
      },
    ],
  },

  'Houston-TX': {
    state: 'TX',
    metro: 'Houston',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.1,
        reason: 'Strong job market in Houston',
      },
      {
        category: 'risk',
        component: 'flood_risk',
        factor: 0.8,
        reason: 'Significant flood risk in Houston area',
      },
    ],
  },

  'Dallas-TX': {
    state: 'TX',
    metro: 'Dallas',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.15,
        reason: 'Strong appreciation in Dallas-Fort Worth',
      },
      {
        category: 'market',
        component: 'competition',
        factor: 0.8,
        reason: 'High investor competition in Dallas',
      },
    ],
  },

  'San Antonio-TX': {
    state: 'TX',
    metro: 'San Antonio',
    adjustments: [
      {
        category: 'market',
        component: 'competition',
        factor: 1.05,
        reason: 'Lower competition than Houston/Dallas',
      },
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 1.1,
        reason: 'Better cash flow than other Texas metros',
      },
    ],
  },

  'Los Angeles-CA': {
    state: 'CA',
    metro: 'Los Angeles',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.2,
        reason: 'Premium LA market appreciation',
      },
      {
        category: 'market',
        component: 'competition',
        factor: 0.7,
        reason: 'Extremely high competition in LA',
      },
      {
        category: 'profit',
        component: 'rent_potential',
        factor: 1.15,
        reason: 'Strong rental demand in LA',
      },
    ],
  },

  'San Diego-CA': {
    state: 'CA',
    metro: 'San Diego',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.15,
        reason: 'Strong appreciation in San Diego',
      },
      {
        category: 'market',
        component: 'competition',
        factor: 0.75,
        reason: 'High competition in San Diego market',
      },
    ],
  },

  'Sacramento-CA': {
    state: 'CA',
    metro: 'Sacramento',
    adjustments: [
      {
        category: 'market',
        component: 'competition',
        factor: 0.9,
        reason: 'Moderate competition compared to Bay Area',
      },
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 1.05,
        reason: 'Better cash flow than coastal California',
      },
    ],
  },

  'Philadelphia-PA': {
    state: 'PA',
    metro: 'Philadelphia',
    adjustments: [
      {
        category: 'market',
        component: 'competition',
        factor: 0.9,
        reason: 'Moderate investor competition',
      },
      {
        category: 'financial',
        component: 'tax_to_value_ratio',
        factor: 0.85,
        reason: 'Higher property taxes in Philadelphia',
      },
      {
        category: 'profit',
        component: 'rent_potential',
        factor: 1.1,
        reason: 'Strong rental market in Philadelphia',
      },
    ],
  },

  'Atlanta-GA': {
    state: 'GA',
    metro: 'Atlanta',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.15,
        reason: 'Strong appreciation in Atlanta metro',
      },
      {
        category: 'market',
        component: 'competition',
        factor: 0.8,
        reason: 'High investor competition in Atlanta',
      },
      {
        category: 'market',
        component: 'demand',
        factor: 1.15,
        reason: 'Major job growth hub',
      },
    ],
  },

  'Las Vegas-NV': {
    state: 'NV',
    metro: 'Las Vegas',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.15,
        reason: 'Strong appreciation in Las Vegas',
      },
      {
        category: 'risk',
        component: 'market_volatility',
        factor: 0.8,
        reason: 'Las Vegas market can be volatile',
      },
      {
        category: 'profit',
        component: 'rent_potential',
        factor: 1.1,
        reason: 'Strong rental demand in Las Vegas',
      },
    ],
  },

  'Denver-CO': {
    state: 'CO',
    metro: 'Denver',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.2,
        reason: 'Premium appreciation in Denver metro',
      },
      {
        category: 'market',
        component: 'competition',
        factor: 0.75,
        reason: 'Very high competition in Denver',
      },
      {
        category: 'market',
        component: 'demand',
        factor: 1.2,
        reason: 'Strong population and job growth',
      },
    ],
  },

  'Detroit-MI': {
    state: 'MI',
    metro: 'Detroit',
    adjustments: [
      {
        category: 'market',
        component: 'competition',
        factor: 1.1,
        reason: 'Lower competition in Detroit market',
      },
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 1.2,
        reason: 'Excellent cash flow potential',
      },
      {
        category: 'risk',
        component: 'vacancy_risk',
        factor: 0.85,
        reason: 'Higher vacancy risk in some Detroit areas',
      },
    ],
  },

  'Phoenix-AZ': {
    state: 'AZ',
    metro: 'Phoenix',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.2,
        reason: 'Strong appreciation in Phoenix metro',
      },
      {
        category: 'market',
        component: 'competition',
        factor: 0.8,
        reason: 'High investor competition in Phoenix',
      },
    ],
  },
};
```

### Metro Adjustment Summary Table

| Metro | State | Category | Component | Factor | Impact |
|-------|-------|----------|-----------|--------|--------|
| **Miami-Fort Lauderdale** | FL | market | competition | 0.8 | -20% penalty |
| **Miami-Fort Lauderdale** | FL | profit | rent_potential | 1.15 | +15% boost |
| **Tampa** | FL | market | appreciation_rate | 1.15 | +15% boost |
| **Tampa** | FL | market | competition | 0.85 | -15% penalty |
| **Orlando** | FL | market | demand | 1.15 | +15% boost |
| **Orlando** | FL | profit | rent_potential | 1.1 | +10% boost |
| **Jacksonville** | FL | market | competition | 1.05 | +5% boost |
| **Jacksonville** | FL | profit | cash_flow | 1.1 | +10% boost |
| **Houston** | TX | market | demand | 1.1 | +10% boost |
| **Houston** | TX | risk | flood_risk | 0.8 | -20% penalty |
| **Dallas** | TX | market | appreciation_rate | 1.15 | +15% boost |
| **Dallas** | TX | market | competition | 0.8 | -20% penalty |
| **Austin** | TX | market | appreciation_rate | 1.2 | +20% boost |
| **Austin** | TX | market | competition | 0.75 | -25% penalty |
| **San Antonio** | TX | market | competition | 1.05 | +5% boost |
| **San Antonio** | TX | profit | cash_flow | 1.1 | +10% boost |
| **Los Angeles** | CA | market | appreciation_rate | 1.2 | +20% boost |
| **Los Angeles** | CA | market | competition | 0.7 | -30% penalty |
| **Los Angeles** | CA | profit | rent_potential | 1.15 | +15% boost |
| **San Diego** | CA | market | appreciation_rate | 1.15 | +15% boost |
| **San Diego** | CA | market | competition | 0.75 | -25% penalty |
| **Sacramento** | CA | market | competition | 0.9 | -10% penalty |
| **Sacramento** | CA | profit | cash_flow | 1.05 | +5% boost |
| **Pittsburgh** | PA | market | competition | 1.1 | +10% boost |
| **Pittsburgh** | PA | profit | cash_flow | 1.1 | +10% boost |
| **Philadelphia** | PA | market | competition | 0.9 | -10% penalty |
| **Philadelphia** | PA | financial | tax_to_value_ratio | 0.85 | -15% penalty |
| **Philadelphia** | PA | profit | rent_potential | 1.1 | +10% boost |
| **Atlanta** | GA | market | appreciation_rate | 1.15 | +15% boost |
| **Atlanta** | GA | market | competition | 0.8 | -20% penalty |
| **Atlanta** | GA | market | demand | 1.15 | +15% boost |
| **Las Vegas** | NV | market | appreciation_rate | 1.15 | +15% boost |
| **Las Vegas** | NV | risk | market_volatility | 0.8 | -20% penalty |
| **Las Vegas** | NV | profit | rent_potential | 1.1 | +10% boost |
| **Denver** | CO | market | appreciation_rate | 1.2 | +20% boost |
| **Denver** | CO | market | competition | 0.75 | -25% penalty |
| **Denver** | CO | market | demand | 1.2 | +20% boost |
| **Detroit** | MI | market | competition | 1.1 | +10% boost |
| **Detroit** | MI | profit | cash_flow | 1.2 | +20% boost |
| **Detroit** | MI | risk | vacancy_risk | 0.85 | -15% penalty |
| **Phoenix** | AZ | market | appreciation_rate | 1.2 | +20% boost |
| **Phoenix** | AZ | market | competition | 0.8 | -20% penalty |

---

## Regional Adjustment Application Function

```typescript
/**
 * Apply regional adjustments to a score
 */
export function applyRegionalAdjustments(
  state: string,
  metro: string | undefined,
  category: string,
  component: string,
  baseScore: number
): { adjustedScore: number; adjustments: ScoreAdjustment[] } {
  const adjustments: ScoreAdjustment[] = [];
  let score = baseScore;

  // Apply state-level adjustments
  const stateAdj = REGIONAL_ADJUSTMENTS[state];
  if (stateAdj) {
    const adj = stateAdj.adjustments.find(
      a => a.category === category && a.component === component
    );
    if (adj) {
      score *= adj.factor;
      adjustments.push({
        type: 'regional',
        factor: adj.factor,
        reason: adj.reason,
        appliedTo: component,
      });
    }
  }

  // Apply metro-level adjustments (override state)
  if (metro) {
    const metroKey = `${metro}-${state}`;
    const metroAdj = METRO_ADJUSTMENTS[metroKey];
    if (metroAdj) {
      const adj = metroAdj.adjustments.find(
        a => a.category === category && a.component === component
      );
      if (adj) {
        // Metro overrides state for same component
        const stateAdjForComponent = adjustments.find(a => a.appliedTo === component);
        if (stateAdjForComponent) {
          // Undo state adjustment, apply metro
          score = (score / stateAdjForComponent.factor) * adj.factor;
          adjustments.pop();
        } else {
          score *= adj.factor;
        }
        adjustments.push({
          type: 'regional',
          factor: adj.factor,
          reason: adj.reason,
          appliedTo: component,
        });
      }
    }
  }

  // Clamp score to valid range
  const adjustedScore = Math.max(0, Math.min(5, score));

  return { adjustedScore, adjustments };
}
```

---

## Metro Detection Function

The metro detection function determines which metropolitan area a property belongs to based on coordinates and/or county/state information.

```typescript
/**
 * Metro area bounding boxes (approximate)
 * Format: { minLat, maxLat, minLng, maxLng }
 */
const METRO_BOUNDARIES: Record<string, {
  state: string;
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  counties: string[];
}> = {
  'Miami-Fort Lauderdale': {
    state: 'FL',
    bounds: { minLat: 25.5, maxLat: 26.5, minLng: -80.5, maxLng: -80.0 },
    counties: ['Miami-Dade', 'Broward', 'Palm Beach'],
  },
  'Tampa': {
    state: 'FL',
    bounds: { minLat: 27.5, maxLat: 28.3, minLng: -82.8, maxLng: -82.0 },
    counties: ['Hillsborough', 'Pinellas', 'Pasco'],
  },
  'Orlando': {
    state: 'FL',
    bounds: { minLat: 28.2, maxLat: 28.8, minLng: -81.7, maxLng: -81.0 },
    counties: ['Orange', 'Seminole', 'Osceola', 'Lake'],
  },
  'Jacksonville': {
    state: 'FL',
    bounds: { minLat: 30.0, maxLat: 30.6, minLng: -82.0, maxLng: -81.3 },
    counties: ['Duval', 'St. Johns', 'Clay', 'Nassau'],
  },
  'Houston': {
    state: 'TX',
    bounds: { minLat: 29.4, maxLat: 30.2, minLng: -95.8, maxLng: -94.8 },
    counties: ['Harris', 'Fort Bend', 'Montgomery', 'Brazoria'],
  },
  'Dallas': {
    state: 'TX',
    bounds: { minLat: 32.5, maxLat: 33.3, minLng: -97.2, maxLng: -96.4 },
    counties: ['Dallas', 'Tarrant', 'Collin', 'Denton'],
  },
  'Austin': {
    state: 'TX',
    bounds: { minLat: 30.0, maxLat: 30.6, minLng: -98.0, maxLng: -97.4 },
    counties: ['Travis', 'Williamson', 'Hays'],
  },
  'San Antonio': {
    state: 'TX',
    bounds: { minLat: 29.2, maxLat: 29.8, minLng: -98.8, maxLng: -98.2 },
    counties: ['Bexar', 'Comal', 'Guadalupe'],
  },
  'Los Angeles': {
    state: 'CA',
    bounds: { minLat: 33.7, maxLat: 34.4, minLng: -118.7, maxLng: -117.7 },
    counties: ['Los Angeles', 'Orange'],
  },
  'San Diego': {
    state: 'CA',
    bounds: { minLat: 32.5, maxLat: 33.3, minLng: -117.4, maxLng: -116.8 },
    counties: ['San Diego'],
  },
  'Sacramento': {
    state: 'CA',
    bounds: { minLat: 38.3, maxLat: 38.9, minLng: -121.7, maxLng: -121.0 },
    counties: ['Sacramento', 'Placer', 'El Dorado', 'Yolo'],
  },
  'Pittsburgh': {
    state: 'PA',
    bounds: { minLat: 40.2, maxLat: 40.7, minLng: -80.3, maxLng: -79.7 },
    counties: ['Allegheny', 'Westmoreland', 'Washington', 'Butler'],
  },
  'Philadelphia': {
    state: 'PA',
    bounds: { minLat: 39.8, maxLat: 40.2, minLng: -75.4, maxLng: -74.9 },
    counties: ['Philadelphia', 'Montgomery', 'Bucks', 'Delaware', 'Chester'],
  },
  'Atlanta': {
    state: 'GA',
    bounds: { minLat: 33.5, maxLat: 34.2, minLng: -84.7, maxLng: -83.9 },
    counties: ['Fulton', 'DeKalb', 'Gwinnett', 'Cobb', 'Clayton'],
  },
  'Las Vegas': {
    state: 'NV',
    bounds: { minLat: 35.9, maxLat: 36.4, minLng: -115.4, maxLng: -114.8 },
    counties: ['Clark'],
  },
  'Denver': {
    state: 'CO',
    bounds: { minLat: 39.5, maxLat: 40.0, minLng: -105.2, maxLng: -104.6 },
    counties: ['Denver', 'Arapahoe', 'Jefferson', 'Adams', 'Douglas'],
  },
  'Detroit': {
    state: 'MI',
    bounds: { minLat: 42.2, maxLat: 42.6, minLng: -83.4, maxLng: -82.8 },
    counties: ['Wayne', 'Oakland', 'Macomb'],
  },
  'Phoenix': {
    state: 'AZ',
    bounds: { minLat: 33.2, maxLat: 33.8, minLng: -112.4, maxLng: -111.6 },
    counties: ['Maricopa'],
  },
};

/**
 * Detect metro area from coordinates and/or county/state
 * @param coordinates - Property latitude and longitude
 * @param county - County name
 * @param state - State code
 * @returns Metro name or null if not in a defined metro area
 */
export function detectMetro(
  coordinates: { lat: number; lng: number } | null,
  county: string,
  state: string
): string | null {
  // First try to match by coordinates (most accurate)
  if (coordinates) {
    for (const [metroName, config] of Object.entries(METRO_BOUNDARIES)) {
      if (config.state !== state) continue;

      const { bounds } = config;
      if (
        coordinates.lat >= bounds.minLat &&
        coordinates.lat <= bounds.maxLat &&
        coordinates.lng >= bounds.minLng &&
        coordinates.lng <= bounds.maxLng
      ) {
        return metroName;
      }
    }
  }

  // Fallback to county matching
  const normalizedCounty = county.replace(/\s+County$/i, '').trim();
  for (const [metroName, config] of Object.entries(METRO_BOUNDARIES)) {
    if (config.state !== state) continue;

    if (config.counties.some(c =>
      c.toLowerCase() === normalizedCounty.toLowerCase()
    )) {
      return metroName;
    }
  }

  return null;
}

/**
 * Get the metro key for METRO_ADJUSTMENTS lookup
 */
export function getMetroKey(metro: string, state: string): string {
  return `${metro}-${state}`;
}
```

### Metro Detection Priority

1. **Coordinate matching** - Most accurate method using bounding boxes
2. **County matching** - Fallback using county-to-metro mapping
3. **Return null** - If no metro match found, state-level adjustments apply

---

## Property Type Detection Logic

```typescript
// src/lib/analysis/scoring/propertyTypeScoring.ts

/**
 * Property type detection from available data
 */
export function detectPropertyType(
  property: PropertyData,
  externalData: ExternalData
): PropertyType {
  // Check explicit property type fields
  if (property.propertyType) {
    return normalizePropertyType(property.propertyType);
  }

  if (externalData.regrid?.propertyType) {
    return normalizePropertyType(externalData.regrid.propertyType);
  }

  // Infer from zoning
  if (property.zoning || externalData.regrid?.zoning) {
    const zoning = (property.zoning || externalData.regrid?.zoning || '').toUpperCase();
    if (zoning.startsWith('R') || zoning.includes('RESIDENTIAL')) {
      return property.units && property.units > 1
        ? 'multi_family_residential'
        : 'single_family_residential';
    }
    if (zoning.startsWith('C') || zoning.includes('COMMERCIAL')) {
      return 'commercial';
    }
    if (zoning.startsWith('I') || zoning.includes('INDUSTRIAL')) {
      return 'industrial';
    }
    if (zoning.includes('AG') || zoning.includes('AGRICULTURAL')) {
      return 'agricultural';
    }
  }

  // Infer from building data
  if (!property.buildingSqft || property.buildingSqft === 0) {
    return 'vacant_land';
  }

  return 'unknown';
}

function normalizePropertyType(type: string): PropertyType {
  const normalized = type.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normalized.includes('singlefamily') || normalized.includes('sfr')) {
    return 'single_family_residential';
  }
  // Check for small multi-family (2-4 units) before general multi-family
  if (normalized.includes('duplex') || normalized.includes('triplex') ||
      normalized.includes('fourplex') || normalized.includes('quadplex') ||
      normalized.includes('2unit') || normalized.includes('3unit') ||
      normalized.includes('4unit') || normalized.includes('24unit')) {
    return 'multi_family_small';
  }
  if (normalized.includes('multifamily') || normalized.includes('apartment') ||
      normalized.includes('5unit') || normalized.includes('multiunit')) {
    return 'multi_family_residential';
  }
  if (normalized.includes('condo') || normalized.includes('condominium')) {
    return 'condo';
  }
  if (normalized.includes('townhouse') || normalized.includes('townhome') ||
      normalized.includes('rowhome') || normalized.includes('rowhouse')) {
    return 'townhouse';
  }
  if (normalized.includes('manufactured') || normalized.includes('mobilehome') ||
      normalized.includes('mobile') || normalized.includes('trailer')) {
    return 'manufactured_home';
  }
  if (normalized.includes('commercial') || normalized.includes('retail') ||
      normalized.includes('office')) {
    return 'commercial';
  }
  if (normalized.includes('industrial') || normalized.includes('warehouse')) {
    return 'industrial';
  }
  if (normalized.includes('land') || normalized.includes('vacant') ||
      normalized.includes('lot')) {
    return 'vacant_land';
  }
  if (normalized.includes('mixed')) {
    return 'mixed_use';
  }
  if (normalized.includes('farm') || normalized.includes('agricultural')) {
    return 'agricultural';
  }

  return 'unknown';
}
```

### Property Type Detection Priority

1. **Explicit property type** - Check `property.propertyType` field first
2. **Regrid data** - Check `externalData.regrid.propertyType`
3. **Zoning inference** - Parse zoning code for property type hints
4. **Building data inference** - No building sqft suggests vacant land
5. **Default** - Return 'unknown' if detection fails

---

## Property Type Weight Adjustments

Different property types prioritize different scoring components. These weights adjust the importance of each category based on property type.

```typescript
/**
 * Weight adjustments by property type
 * Different property types prioritize different scoring components
 */
export const PROPERTY_TYPE_WEIGHTS: Record<PropertyType, CategoryWeights> = {
  single_family_residential: {
    location: 1.1,  // Slightly more important
    risk: 1.0,
    financial: 1.0,
    market: 1.0,
    profit: 0.9,
  },

  multi_family_residential: {
    location: 0.9,
    risk: 1.0,
    financial: 1.1,  // Cash flow more important
    market: 1.0,
    profit: 1.1,     // Income potential emphasized
  },

  commercial: {
    location: 1.2,   // Location critical for commercial
    risk: 1.0,
    financial: 0.9,
    market: 1.1,
    profit: 0.9,
  },

  industrial: {
    location: 0.8,   // Less important for industrial
    risk: 1.1,
    financial: 1.0,
    market: 1.0,
    profit: 1.0,
  },

  vacant_land: {
    location: 1.2,
    risk: 1.2,       // Environmental risks more critical
    financial: 0.8,  // Less financial data available
    market: 1.0,
    profit: 0.8,     // Harder to project
  },

  mixed_use: {
    location: 1.1,
    risk: 1.0,
    financial: 1.0,
    market: 1.0,
    profit: 1.0,
  },

  agricultural: {
    location: 0.7,   // Less relevant for ag
    risk: 1.3,       // Weather/environmental very important
    financial: 1.0,
    market: 0.8,     // Different market dynamics
    profit: 1.0,
  },

  manufactured_home: {
    location: 1.0,
    risk: 1.1,       // Depreciation risk
    financial: 1.1,  // Cash flow focused
    market: 0.9,     // Limited appreciation
    profit: 1.1,     // Good cash flow potential
  },

  condo: {
    location: 1.2,   // Location very important for condos
    risk: 1.0,
    financial: 0.9,  // HOA fees affect cash flow
    market: 1.1,     // Market appreciation matters
    profit: 0.9,     // Lower profit margins due to fees
  },

  townhouse: {
    location: 1.1,   // Location important
    risk: 1.0,
    financial: 1.0,
    market: 1.0,
    profit: 1.0,     // Balanced investment
  },

  multi_family_small: {
    location: 0.9,   // Less critical than SFR
    risk: 1.0,
    financial: 1.2,  // Cash flow very important
    market: 0.9,
    profit: 1.2,     // Income potential emphasized
  },

  unknown: {
    location: 1.0,
    risk: 1.0,
    financial: 1.0,
    market: 1.0,
    profit: 1.0,
  },
};

interface CategoryWeights {
  location: number;
  risk: number;
  financial: number;
  market: number;
  profit: number;
}
```

### Property Type Weights Summary

| Property Type | Location | Risk | Financial | Market | Profit |
|---------------|----------|------|-----------|--------|--------|
| Single Family Residential | 1.1 | 1.0 | 1.0 | 1.0 | 0.9 |
| Multi Family Residential | 0.9 | 1.0 | 1.1 | 1.0 | 1.1 |
| Commercial | 1.2 | 1.0 | 0.9 | 1.1 | 0.9 |
| Industrial | 0.8 | 1.1 | 1.0 | 1.0 | 1.0 |
| Vacant Land | 1.2 | 1.2 | 0.8 | 1.0 | 0.8 |
| Mixed Use | 1.1 | 1.0 | 1.0 | 1.0 | 1.0 |
| Agricultural | 0.7 | 1.3 | 1.0 | 0.8 | 1.0 |
| Manufactured Home | 1.0 | 1.1 | 1.1 | 0.9 | 1.1 |
| Condo | 1.2 | 1.0 | 0.9 | 1.1 | 0.9 |
| Townhouse | 1.1 | 1.0 | 1.0 | 1.0 | 1.0 |
| Multi Family Small (2-4 units) | 0.9 | 1.0 | 1.2 | 0.9 | 1.2 |
| Unknown | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |

---

## Weight Normalization Function

After applying property type and regional adjustments, weights should be normalized to ensure they sum appropriately and don't cause unexpected score inflation or deflation.

```typescript
/**
 * Normalize category weights to ensure they sum to a target value
 * This prevents score inflation/deflation when multiple adjustments are applied
 */
export function normalizeWeights(
  weights: CategoryWeights,
  targetSum: number = 5.0
): CategoryWeights {
  const currentSum = weights.location + weights.risk + weights.financial +
                     weights.market + weights.profit;

  if (currentSum === 0) {
    // Avoid division by zero - return equal weights
    const equalWeight = targetSum / 5;
    return {
      location: equalWeight,
      risk: equalWeight,
      financial: equalWeight,
      market: equalWeight,
      profit: equalWeight,
    };
  }

  const scaleFactor = targetSum / currentSum;

  return {
    location: weights.location * scaleFactor,
    risk: weights.risk * scaleFactor,
    financial: weights.financial * scaleFactor,
    market: weights.market * scaleFactor,
    profit: weights.profit * scaleFactor,
  };
}

/**
 * Apply property type weights with normalization
 * Ensures adjusted weights maintain proper proportions
 */
export function getAdjustedWeights(
  propertyType: PropertyType,
  normalize: boolean = true
): CategoryWeights {
  const baseWeights = PROPERTY_TYPE_WEIGHTS[propertyType] || PROPERTY_TYPE_WEIGHTS.unknown;

  if (!normalize) {
    return baseWeights;
  }

  return normalizeWeights(baseWeights);
}

/**
 * Calculate weighted score from category scores and weights
 * Applies normalization to ensure consistent scoring regardless of weight adjustments
 */
export function calculateWeightedScore(
  categoryScores: Record<string, number>,
  weights: CategoryWeights,
  normalize: boolean = true
): number {
  const normalizedWeights = normalize ? normalizeWeights(weights) : weights;

  const weightedSum =
    (categoryScores.location || 0) * normalizedWeights.location +
    (categoryScores.risk || 0) * normalizedWeights.risk +
    (categoryScores.financial || 0) * normalizedWeights.financial +
    (categoryScores.market || 0) * normalizedWeights.market +
    (categoryScores.profit || 0) * normalizedWeights.profit;

  const totalWeight =
    normalizedWeights.location +
    normalizedWeights.risk +
    normalizedWeights.financial +
    normalizedWeights.market +
    normalizedWeights.profit;

  // Return weighted average, clamped to valid range
  const score = weightedSum / totalWeight;
  return Math.max(0, Math.min(5, score));
}
```

### Normalization Benefits

1. **Prevents score inflation** - Multiple adjustments won't push scores above 5
2. **Maintains proportions** - Relative importance of categories is preserved
3. **Consistent scoring** - Different property types produce comparable final scores
4. **Handles edge cases** - Zero weights are handled gracefully

### Example: Weight Normalization in Action

```typescript
// Agricultural property weights (sum = 4.8)
const rawWeights = { location: 0.7, risk: 1.3, financial: 1.0, market: 0.8, profit: 1.0 };

// Normalized to sum = 5.0
const normalizedWeights = normalizeWeights(rawWeights);
// Result: { location: 0.729, risk: 1.354, financial: 1.042, market: 0.833, profit: 1.042 }

// Original proportions maintained:
// location is still ~14% of total weight
// risk is still ~27% of total weight (most important for ag)
```

---

## Component Weight Adjustments by Property Type

Fine-grained adjustments for specific component weights within categories based on property type.

```typescript
/**
 * Component weight adjustments by property type
 */
export function getComponentWeightAdjustment(
  propertyType: PropertyType,
  category: string,
  component: string
): number {
  // Special adjustments for specific property type + component combinations
  const adjustments: Record<string, Record<string, Record<string, number>>> = {
    vacant_land: {
      location: {
        walkability: 0.5,      // Less relevant for land
        transit: 0.5,
        amenities: 0.7,
        schools: 0.3,          // Irrelevant for undeveloped land
      },
      profit: {
        cash_flow: 0.3,        // No immediate cash flow from land
        rent_potential: 0.3,
      },
    },

    commercial: {
      location: {
        schools: 0.3,          // Less relevant for commercial
        walkability: 1.3,      // Foot traffic important
        transit: 1.2,
      },
      profit: {
        rent_potential: 1.2,   // Commercial rent important
      },
    },

    multi_family_residential: {
      profit: {
        cash_flow: 1.3,        // Cash flow very important
        rent_potential: 1.3,
      },
      location: {
        transit: 1.2,          // Tenants value transit
      },
    },

    agricultural: {
      location: {
        walkability: 0.2,
        transit: 0.2,
        amenities: 0.3,
        schools: 0.2,
      },
      risk: {
        flood_risk: 1.3,       // Critical for farms
        wildfire_risk: 1.2,
      },
    },
  };

  return adjustments[propertyType]?.[category]?.[component] ?? 1.0;
}
```

### Component Adjustment Details

#### Vacant Land
| Category | Component | Factor | Reason |
|----------|-----------|--------|--------|
| location | walkability | 0.5 | Less relevant for undeveloped land |
| location | transit | 0.5 | Less relevant for undeveloped land |
| location | amenities | 0.7 | Less relevant for undeveloped land |
| location | schools | 0.3 | Irrelevant for undeveloped land |
| profit | cash_flow | 0.3 | No immediate cash flow from land |
| profit | rent_potential | 0.3 | No immediate rental income |

#### Commercial
| Category | Component | Factor | Reason |
|----------|-----------|--------|--------|
| location | schools | 0.3 | Less relevant for commercial properties |
| location | walkability | 1.3 | Foot traffic important for retail |
| location | transit | 1.2 | Customer/employee access matters |
| profit | rent_potential | 1.2 | Commercial rent is primary income |

#### Multi Family Residential
| Category | Component | Factor | Reason |
|----------|-----------|--------|--------|
| profit | cash_flow | 1.3 | Cash flow is primary investment goal |
| profit | rent_potential | 1.3 | Multiple units = multiple rent streams |
| location | transit | 1.2 | Tenants often rely on public transit |

#### Agricultural
| Category | Component | Factor | Reason |
|----------|-----------|--------|--------|
| location | walkability | 0.2 | Irrelevant for agricultural use |
| location | transit | 0.2 | Irrelevant for agricultural use |
| location | amenities | 0.3 | Less important for farming |
| location | schools | 0.2 | Irrelevant for agricultural use |
| risk | flood_risk | 1.3 | Critical for crop production |
| risk | wildfire_risk | 1.2 | Important for crop/livestock protection |

---

## State-Specific Scoring Considerations

### Florida (FL)
- **Strengths**: Strong appreciation, robust rental demand
- **Risks**: Hurricane exposure, flood zones, insurance costs
- **Strategy**: Focus on inland properties, verify flood zone status, factor in insurance premiums

### Texas (TX)
- **Strengths**: Population growth, strong demand, no state income tax
- **Risks**: Higher property taxes, tornado exposure in some areas
- **Strategy**: Account for property tax impact on cash flow, verify tax rates by county

### California (CA)
- **Strengths**: Premium appreciation, strong rental market, diverse economy
- **Risks**: Earthquake zones, wildfire zones, high entry costs
- **Strategy**: Verify earthquake and fire zone status, factor in higher insurance costs

### Pennsylvania (PA)
- **Strengths**: Lower rehab costs, favorable rent-to-price ratios (Pittsburgh), stable markets
- **Risks**: Moderate appreciation, older housing stock requiring more maintenance
- **Strategy**: Focus on cash flow markets, budget for older home maintenance

### Arizona (AZ)
- **Strengths**: Strong migration trends, retirement destination, growing tech sector
- **Risks**: Wildfire exposure, water scarcity concerns
- **Strategy**: Verify water rights for land, check wildfire risk zones

### Georgia (GA)
- **Strengths**: Strong job growth (Atlanta), lower cost of living, business-friendly
- **Risks**: Judicial foreclosure state (longer process), some rural areas declining
- **Strategy**: Focus on Atlanta metro and surrounding growth corridors, account for longer foreclosure timeline

### North Carolina (NC)
- **Strengths**: Research Triangle tech hub, Charlotte financial center, strong population growth
- **Risks**: Upset bid process allows overbidding, increasing competition
- **Strategy**: Understand upset bid rules, focus on emerging suburbs, factor in potential overbids

### Ohio (OH)
- **Strengths**: Tax lien certificates with 18% interest, favorable cash flow markets, lower entry costs
- **Risks**: Moderate appreciation, some declining industrial areas
- **Strategy**: Focus on cash flow in Columbus, Cincinnati, Cleveland suburbs; leverage tax lien interest rates

### Michigan (MI)
- **Strengths**: Excellent cash flow potential, lowest entry prices, property tax foreclosure process
- **Risks**: High vacancy in some areas, older housing stock, Detroit urban challenges
- **Strategy**: Focus on Detroit suburbs and Grand Rapids area, budget heavily for rehab, verify occupancy

### Nevada (NV)
- **Strengths**: Tax deed state with clean title, strong Las Vegas market, no state income tax
- **Risks**: Market volatility, limited water resources, tourism-dependent economy
- **Strategy**: Focus on Las Vegas metro, be prepared for market cycles, verify water/utility access for land

### Colorado (CO)
- **Strengths**: Tax lien state, strong Denver appreciation, outdoor lifestyle attracting population growth
- **Risks**: High competition in Denver, wildfire risk in mountain areas, high entry costs
- **Strategy**: Consider Colorado Springs and Fort Collins for less competition, check fire zones carefully

---

## TypeScript Interfaces

```typescript
interface RegionalAdjustment {
  state: string;
  metro?: string;
  adjustments: AdjustmentConfig[];
}

interface AdjustmentConfig {
  category: string;
  component: string;
  factor: number;
  reason: string;
}

interface ScoreAdjustment {
  type: 'regional' | 'property_type' | 'data_quality';
  factor: number;
  reason: string;
  appliedTo: string;
}

type PropertyType =
  | 'single_family_residential'
  | 'multi_family_residential'
  | 'commercial'
  | 'industrial'
  | 'vacant_land'
  | 'mixed_use'
  | 'agricultural'
  | 'manufactured_home'
  | 'condo'
  | 'townhouse'
  | 'multi_family_small'
  | 'unknown';
```

---

## Integration with Main Scoring Algorithm

The regional and property type adjustments integrate into the main scoring flow:

1. **Property type detection** - Determine property type from available data
2. **Category weight adjustment** - Apply property type weights to category scores
3. **Component weight adjustment** - Apply property type component adjustments
4. **Regional score adjustment** - Apply state-level factors
5. **Metro score adjustment** - Override with metro-level factors if applicable
6. **Final score clamping** - Ensure all adjusted scores remain in valid range (0-5)

```typescript
// Integration example
function calculateAdjustedScore(
  property: PropertyData,
  externalData: ExternalData,
  baseScores: CategoryScores
): AdjustedScores {
  // 1. Detect property type
  const propertyType = detectPropertyType(property, externalData);

  // 2. Get category weights for property type
  const categoryWeights = PROPERTY_TYPE_WEIGHTS[propertyType];

  // 3. Apply adjustments to each category
  const adjustedScores = Object.entries(baseScores).reduce((acc, [category, score]) => {
    // Apply category weight
    let adjustedScore = score * categoryWeights[category];

    // Apply regional adjustments
    const { adjustedScore: regionalScore, adjustments } = applyRegionalAdjustments(
      property.state,
      property.metro,
      category,
      'overall', // or specific component
      adjustedScore
    );

    acc[category] = {
      score: regionalScore,
      adjustments,
    };

    return acc;
  }, {});

  return adjustedScores;
}
```

---

## Testing Considerations

### Regional Adjustment Tests
- Verify state-level factors apply correctly
- Verify metro-level factors override state-level for same component
- Test score clamping at boundaries (0 and 5)
- Test missing state/metro returns unmodified scores

### Property Type Tests
- Test detection from explicit property type field
- Test detection from Regrid data
- Test zoning-based inference
- Test building data inference
- Test unknown type fallback

### Weight Adjustment Tests
- Verify category weights apply per property type
- Verify component weights apply correctly
- Test multiplicative factor combinations
- Verify default weights for unknown types
