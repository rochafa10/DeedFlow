# Environmental Risk Assessor - Skill

## Overview
Methodologies for identifying and assessing environmental hazards including flood zones, contamination, wetlands, and hazardous materials.

## Flood Risk Assessment

### **FEMA Flood Zone Research**

**How to Access FEMA Maps:**
```
Primary: https://msc.fema.gov/portal/home
Alternative: Search "[County] FEMA flood map"
Local: Many counties have GIS systems with flood layers
```

**Flood Zone Classifications:**
```javascript
const FEMA_FLOOD_ZONES = {
  'Zone X': {
    risk_level: 'MINIMAL',
    description: 'Outside 500-year floodplain',
    insurance_required: false,
    annual_insurance_cost: 0,
    recommendation: 'APPROVE ✅',
    buyer_impact: 'No impact on financing or insurance'
  },
  
  'Zone A/AE': {
    risk_level: 'HIGH',
    description: '1% annual chance flood (100-year floodplain)',
    insurance_required: true,
    annual_insurance_cost: 1500,
    ten_year_cost: 15000,
    value_impact: -0.20, // 20% reduction
    recommendation: 'CAUTION ⚠️',
    buyer_impact: 'Lender requires flood insurance, reduces buyer pool'
  },
  
  'Zone AH': {
    risk_level: 'HIGH',
    description: 'Shallow flooding (1-3 feet)',
    insurance_required: true,
    annual_insurance_cost: 1800,
    value_impact: -0.25,
    recommendation: 'CAUTION ⚠️'
  },
  
  'Zone V/VE': {
    risk_level: 'EXTREME',
    description: 'Coastal high hazard with wave action',
    insurance_required: true,
    annual_insurance_cost: 5000,
    ten_year_cost: 50000,
    value_impact: -0.40, // 40% reduction
    recommendation: 'REJECT ❌',
    buyer_impact: 'Very expensive insurance, very limited buyer pool'
  }
};
```

**Flood Insurance Cost Calculator:**
```javascript
function calculateFloodInsurance(zone, property_value, elevation_vs_base) {
  const base_cost = {
    'X': 0,
    'A': 1500,
    'AE': 1500,
    'AH': 1800,
    'V': 5000,
    'VE': 5000
  };
  
  let cost = base_cost[zone] || 0;
  
  // Elevation adjustments (if known)
  if (elevation_vs_base < 0) {
    cost *= 1.5; // 50% more if below base flood elevation
  } else if (elevation_vs_base > 2) {
    cost *= 0.7; // 30% discount if 2+ feet above
  }
  
  // Property value factor
  if (property_value > 250000) {
    cost *= 1.2;
  }
  
  return Math.round(cost);
}
```

**Flood Impact Analysis:**
```javascript
function analyzeFloodImpact(zone, property_value) {
  const zone_data = FEMA_FLOOD_ZONES[zone];
  const value_reduction = property_value * (zone_data.value_impact || 0);
  
  return {
    annual_insurance: zone_data.annual_insurance_cost,
    ten_year_insurance: zone_data.annual_insurance_cost * 10,
    value_reduction_dollars: Math.abs(value_reduction),
    value_reduction_percent: (zone_data.value_impact || 0) * 100,
    adjusted_property_value: property_value + value_reduction,
    recommendation: zone_data.recommendation,
    buyer_impact: zone_data.buyer_impact
  };
}
```

## Contamination Risk Assessment

### **EPA Superfund Sites**

**How to Search:**
```
Primary: https://www.epa.gov/superfund/search-superfund-sites-where-you-live
Alternative: Search "[County] [State] superfund sites"
GIS: EPA's EJSCREEN tool
```

**Proximity Risk Matrix:**
```javascript
const SUPERFUND_PROXIMITY_RISK = {
  on_site: {
    distance: 0,
    risk_level: 'CATASTROPHIC',
    recommendation: 'REJECT IMMEDIATELY ❌',
    value_impact: -1.0, // Property worthless
    reason: 'Direct environmental liability - could cost millions',
    action: 'DO NOT BID UNDER ANY CIRCUMSTANCES'
  },
  
  within_1000_feet: {
    distance_range: [0.01, 0.19],
    risk_level: 'CRITICAL',
    recommendation: 'REJECT ❌',
    value_impact: -0.40,
    reason: 'Contamination plume risk, stigma, disclosure required',
    action: 'Phase I ESA required, likely shows contamination'
  },
  
  quarter_mile: {
    distance_range: [0.20, 0.25],
    risk_level: 'HIGH',
    recommendation: 'REJECT ❌',
    value_impact: -0.30,
    reason: 'Proximity stigma, potential contamination migration'
  },
  
  half_mile: {
    distance_range: [0.26, 0.50],
    risk_level: 'MODERATE',
    recommendation: 'CAUTION ⚠️',
    value_impact: -0.20,
    reason: 'Disclosure required, buyer concerns'
  },
  
  one_mile: {
    distance_range: [0.51, 1.0],
    risk_level: 'LOW',
    recommendation: 'CAUTION ⚠️',
    value_impact: -0.07,
    reason: 'Minimal risk but disclosure recommended'
  },
  
  over_one_mile: {
    distance_range: [1.01, Infinity],
    risk_level: 'MINIMAL',
    recommendation: 'APPROVE ✅',
    value_impact: 0,
    reason: 'Safe distance'
  }
};
```

### **State Contamination Databases**

**Pennsylvania:**
```
Website: www.dep.pa.gov
Databases:
- Storage Tank Database (USTs, ASTs)
- Brownfields Sites
- Hazardous Sites Cleanup Act Sites
- Act 2 Sites

Search: By address, parcel, or owner name
```

**Florida:**
```
Website: floridadep.gov
Databases:
- Contaminated Site Database
- Petroleum Contamination Sites
- Drycleaning Solvent Cleanup Program

Search: By address or site name
```

**Texas:**
```
Website: tceq.texas.gov
Databases:
- Contaminated Sites Database
- Leaking Petroleum Storage Tanks
- State Superfund Sites

Search: By county or address
```

### **Historical Use Research**

**High-Risk Property Uses:**
```javascript
const HIGH_RISK_HISTORICAL_USES = {
  gas_station: {
    contamination_risk: 'HIGH',
    common_contaminants: ['Benzene', 'MTBE', 'Lead'],
    cleanup_cost: '$50,000 - $500,000',
    investigation_cost: '$5,000 - $15,000',
    recommendation: 'REJECT unless proven clean with Phase I/II ESA',
    persistence: 'Contamination lasts decades'
  },
  
  dry_cleaner: {
    contamination_risk: 'VERY HIGH',
    common_contaminants: ['PCE', 'TCE', 'Perchloroethylene'],
    cleanup_cost: '$100,000 - $1,000,000+',
    investigation_cost: '$10,000 - $25,000',
    recommendation: 'REJECT - nearly always contaminated',
    persistence: 'Contamination persists for 50+ years',
    migration: 'Contaminants migrate through groundwater'
  },
  
  auto_repair: {
    contamination_risk: 'MODERATE-HIGH',
    common_contaminants: ['Oil', 'Grease', 'Solvents', 'Heavy metals'],
    cleanup_cost: '$25,000 - $150,000',
    investigation_cost: '$5,000 - $10,000',
    recommendation: 'CAUTION - investigate thoroughly'
  },
  
  industrial_manufacturing: {
    contamination_risk: 'HIGH',
    common_contaminants: 'Varies by industry',
    cleanup_cost: '$50,000 - $500,000+',
    investigation_cost: '$10,000 - $30,000',
    recommendation: 'REJECT without Phase I ESA'
  },
  
  printing_facility: {
    contamination_risk: 'MODERATE',
    common_contaminants: ['Solvents', 'Inks', 'Heavy metals'],
    cleanup_cost: '$20,000 - $100,000',
    recommendation: 'CAUTION - investigate'
  },
  
  railroad_property: {
    contamination_risk: 'MODERATE-HIGH',
    common_contaminants: ['Creosote', 'Heavy metals', 'PCBs'],
    cleanup_cost: '$30,000 - $200,000',
    recommendation: 'CAUTION'
  }
};
```

**How to Research Historical Use:**
```
1. Sanborn Fire Insurance Maps (historical)
2. City directories (old phone books)
3. Aerial photo timeline (Google Earth)
4. County assessor historical records
5. Old newspaper archives
6. Talk to neighbors/old-timers
```

## Wetlands Assessment

### **US Fish & Wildlife Wetlands Mapper**

**How to Access:**
```
Website: https://www.fws.gov/wetlands/data/mapper.html
Method: Enter address or click map location
Layers: Toggle wetlands layers on/off
```

**Wetlands Impact Matrix:**
```javascript
function assessWetlandsImpact(percentage_of_lot) {
  if (percentage_of_lot === 0) {
    return {
      impact_level: 'NONE',
      value_impact: 0,
      buildable_area: 100,
      recommendation: 'APPROVE ✅',
      restrictions: 'None'
    };
  }
  
  if (percentage_of_lot > 75) {
    return {
      impact_level: 'SEVERE',
      value_impact: -0.70,
      buildable_area: 25,
      recommendation: 'REJECT ❌',
      restrictions: 'Property mostly unbuildable, permits nearly impossible'
    };
  }
  
  if (percentage_of_lot > 50) {
    return {
      impact_level: 'MAJOR',
      value_impact: -0.40,
      buildable_area: 50,
      recommendation: 'REJECT ❌',
      restrictions: 'Majority wetlands, very limited development'
    };
  }
  
  if (percentage_of_lot > 25) {
    return {
      impact_level: 'MODERATE',
      value_impact: -0.20,
      buildable_area: 75,
      recommendation: 'CAUTION ⚠️',
      restrictions: 'Significant wetlands, permits required for any work'
    };
  }
  
  if (percentage_of_lot > 10) {
    return {
      impact_level: 'MINOR',
      value_impact: -0.10,
      buildable_area: 90,
      recommendation: 'APPROVE with disclosure',
      restrictions: 'Some restrictions, manageable'
    };
  }
  
  return {
    impact_level: 'MINIMAL',
    value_impact: -0.05,
    buildable_area: 95,
    recommendation: 'APPROVE ✅',
    restrictions: 'Minor wetlands, minimal impact'
  };
}
```

## Hazardous Materials Assessment

### **Lead Paint (Pre-1978 Homes)**

```javascript
function assessLeadPaintRisk(year_built) {
  if (year_built >= 1978) {
    return {
      risk: 'NONE',
      present: false,
      testing_cost: 0,
      abatement_cost: 0,
      disclosure_required: false,
      total_cost: 0
    };
  }
  
  // Lead paint banned in 1978
  const likelihood_by_decade = {
    pre_1950: 0.87,  // 87% chance
    1950s: 0.69,     // 69% chance
    1960s: 0.55,     // 55% chance
    1970s: 0.24      // 24% chance
  };
  
  let likelihood;
  if (year_built < 1950) likelihood = likelihood_by_decade.pre_1950;
  else if (year_built < 1960) likelihood = likelihood_by_decade['1950s'];
  else if (year_built < 1970) likelihood = likelihood_by_decade['1960s'];
  else likelihood = likelihood_by_decade['1970s'];
  
  return {
    risk: 'PRESENT',
    likelihood: likelihood,
    likelihood_percent: (likelihood * 100).toFixed(0) + '%',
    testing_cost: 400,
    abatement_cost_if_found: 12000,
    expected_cost: year_built < 1960 ? 10000 : 5000, // Budget amount
    disclosure_required: true,
    regulations: 'EPA Lead-Based Paint Disclosure required',
    recommendation: year_built < 1950 ? 
      'Budget $10K for testing and potential abatement' :
      'Disclosure required, testing optional but recommended'
  };
}
```

### **Asbestos (1920-1980)**

```javascript
function assessAsbestosRisk(year_built) {
  if (year_built < 1920 || year_built > 1990) {
    return {
      risk: 'LOW',
      testing_cost: 0,
      removal_cost: 0,
      total_cost: 0
    };
  }
  
  return {
    risk: 'MODERATE',
    peak_years: '1920-1980',
    common_locations: [
      'Popcorn ceilings (pre-1980)',
      '9x9 floor tiles',
      'Pipe insulation',
      'Vermiculite insulation',
      'Textured paint',
      'Roofing materials'
    ],
    testing_cost: 600,
    removal_cost_if_found: 20000,
    expected_cost: 15000, // Budget amount
    critical_rule: 'DO NOT DISTURB if present',
    regulations: 'EPA asbestos regulations apply',
    recommendation: 'Budget $600 testing, $20K potential removal if renovation planned'
  };
}
```

### **Radon Assessment**

```javascript
function assessRadonRisk(county, state, has_basement) {
  // Would look up EPA radon zone map
  const radon_zone = lookupEPARadonZone(county, state);
  
  const RADON_ZONES = {
    1: {
      risk: 'HIGH',
      description: 'Predicted average >4 pCi/L',
      testing_cost: 200,
      mitigation_cost: 1500,
      recommendation: has_basement ? 
        'Budget $1,700 (testing + likely mitigation)' :
        'Budget $200 testing (lower risk without basement)',
      total_cost: has_basement ? 1700 : 200
    },
    2: {
      risk: 'MODERATE',
      description: 'Predicted average 2-4 pCi/L',
      testing_cost: 200,
      mitigation_cost: 1500,
      recommendation: 'Testing recommended',
      total_cost: 500 // Budget for testing + possible mitigation
    },
    3: {
      risk: 'LOW',
      description: 'Predicted average <2 pCi/L',
      testing_cost: 200,
      mitigation_cost: 0,
      recommendation: 'Testing optional',
      total_cost: 0
    }
  };
  
  return RADON_ZONES[radon_zone];
}
```

## Environmental Risk Score Calculation

```javascript
function calculateEnvironmentalRiskScore(assessments) {
  let score = 1.0; // Start perfect
  const hazards = [];
  
  // FLOOD (weight: 0.25)
  if (assessments.flood_zone === 'V' || assessments.flood_zone === 'VE') {
    score -= 0.40;
    hazards.push('Extreme flood risk (Zone V)');
  } else if (assessments.flood_zone === 'A' || assessments.flood_zone === 'AE') {
    score -= 0.20;
    hazards.push('High flood risk (Zone A)');
  }
  
  // SUPERFUND (weight: 0.35)
  if (assessments.superfund_distance === 0) {
    score = 0; // Automatic fail
    hazards.push('ON SUPERFUND SITE - CATASTROPHIC');
  } else if (assessments.superfund_distance < 0.25) {
    score -= 0.40;
    hazards.push('Near active Superfund site');
  } else if (assessments.superfund_distance < 0.50) {
    score -= 0.20;
    hazards.push('Within 0.5 mile of Superfund');
  } else if (assessments.superfund_distance < 1.0) {
    score -= 0.10;
    hazards.push('Within 1 mile of Superfund');
  }
  
  // WETLANDS (weight: 0.20)
  if (assessments.wetlands_percentage > 75) {
    score -= 0.40;
    hazards.push('Mostly wetlands (>75%)');
  } else if (assessments.wetlands_percentage > 50) {
    score -= 0.30;
    hazards.push('Majority wetlands (>50%)');
  } else if (assessments.wetlands_percentage > 25) {
    score -= 0.15;
    hazards.push('Significant wetlands (>25%)');
  } else if (assessments.wetlands_percentage > 10) {
    score -= 0.05;
    hazards.push('Minor wetlands');
  }
  
  // HISTORICAL CONTAMINATION (weight: 0.10)
  if (assessments.former_gas_station) {
    score -= 0.20;
    hazards.push('Former gas station');
  } else if (assessments.former_dry_cleaner) {
    score -= 0.30;
    hazards.push('Former dry cleaner (very high risk)');
  } else if (assessments.former_industrial) {
    score -= 0.20;
    hazards.push('Former industrial use');
  }
  
  // LEAD PAINT (weight: 0.05)
  if (assessments.lead_paint_risk && assessments.year_built < 1950) {
    score -= 0.10;
    hazards.push('High lead paint risk (pre-1950)');
  } else if (assessments.lead_paint_risk) {
    score -= 0.05;
    hazards.push('Lead paint era');
  }
  
  // ASBESTOS (weight: 0.03)
  if (assessments.asbestos_risk) {
    score -= 0.05;
    hazards.push('Asbestos era (1920-1980)');
  }
  
  // RADON (weight: 0.02)
  if (assessments.radon_zone === 1 && assessments.has_basement) {
    score -= 0.05;
    hazards.push('High radon zone with basement');
  }
  
  score = Math.max(0, score);
  
  let recommendation;
  if (score === 0) recommendation = 'REJECT';
  else if (score < 0.40) recommendation = 'REJECT';
  else if (score < 0.70) recommendation = 'CAUTION';
  else recommendation = 'APPROVE';
  
  return {
    risk_score: score,
    risk_score_out_of_10: (score * 10).toFixed(1),
    hazards_identified: hazards,
    recommendation
  };
}
```

## Best Practices

**DO:**
✅ Check FEMA flood maps for every property
✅ Search EPA Superfund within 1 mile radius
✅ Research historical property use
✅ Check state contamination databases
✅ Assess wetlands using official mapper
✅ Consider hazmat costs (lead, asbestos, radon)
✅ Budget conservatively for all environmental issues
✅ Disclose all environmental issues to buyers

**DON'T:**
❌ Skip Superfund search (critical!)
❌ Ignore flood zones to save insurance cost
❌ Bid on properties ON Superfund sites
❌ Underestimate wetlands restrictions
❌ Forget about lead paint in pre-1978 homes
❌ Assume environmental issues are minor
