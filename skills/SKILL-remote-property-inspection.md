# Remote Property Inspection - Skill

## Overview
Methodologies for assessing property condition remotely using visual data sources to estimate repair costs without physical property access.

## Visual Data Sources

### **1. Google Street View**

**How to Access:**
```
Method 1: Direct Google Maps
- Go to maps.google.com
- Enter full property address
- Click yellow person icon (Pegman)
- Drag onto street near property
- Use arrows to navigate

Method 2: Search
- Google: "google street view [address]"
- Click first result
```

**What You Can Assess:**
```javascript
const STREET_VIEW_ASSESSMENT = {
  roof: {
    color: 'Dark = old, Light = newer',
    shape: 'Sagging = critical issue',
    damage: 'Missing shingles, tarps visible'
  },
  
  siding: {
    type: 'Vinyl, wood, brick, stucco',
    condition: 'Peeling, cracking, fading',
    repairs: 'Patches visible'
  },
  
  windows: {
    boarded: 'CRITICAL RED FLAG - long-term vacant',
    broken: 'Vandalism or neglect',
    age: 'Original vs replacement'
  },
  
  landscaping: {
    maintained: 'Occupied or recently vacated',
    overgrown: 'Vacant 3+ months',
    extreme: 'Vacant 12+ months'
  },
  
  general: {
    curb_appeal: 'Overall first impression',
    neighborhood: 'Condition of nearby properties',
    street_condition: 'Paved, maintained'
  }
};
```

**Timeline Feature:**
```
- Click clock icon in Street View
- See property in different years
- Compare condition over time
- Identify deterioration timeline
```

### **2. Bing Bird's Eye View (Aerial)**

**How to Access:**
```
- Go to bing.com/maps
- Enter address
- Click "Bird's eye" button (top right)
- Rotate view using arrows
```

**Advantages Over Street View:**
```javascript
const AERIAL_ADVANTAGES = {
  roof: {
    full_surface: 'See entire roof, not just front',
    patches: 'Different colored shingles visible',
    structural: 'Sagging visible from above',
    ventilation: 'Check vent condition'
  },
  
  backyard: {
    pool: 'Liability + $2K-5K annual maintenance',
    deck: 'Assess condition from above',
    patio: 'Cracking, condition',
    landscaping: 'Full lot view'
  },
  
  lot_features: {
    outbuildings: 'Sheds, garages, barns',
    trees: 'Proximity to house, condition',
    drainage: 'Low spots, water pooling',
    parking: 'Driveway, garage access'
  }
};
```

### **3. Past Listing Photos**

**Where to Find:**
```
Zillow.com:
- Search address
- Click "See all photos"
- Check "Price History" for old listings

Realtor.com:
- Search address
- View photo history
- Check archived listings

Redfin.com:
- Search address
- "Property History" section
- View past listing photos
```

**What Photos Reveal:**
```javascript
const LISTING_PHOTO_ANALYSIS = {
  kitchen: {
    cabinets: '1970s wood vs modern shaker',
    countertops: 'Laminate vs granite vs quartz',
    appliances: 'Age and style',
    flooring: 'Linoleum vs tile vs hardwood',
    update_level: 'Original, dated, modern'
  },
  
  bathrooms: {
    fixtures: '1950s pink tile vs modern',
    vanity: 'Pedestal vs modern cabinet',
    tub_shower: 'Original cast iron vs modern',
    tile: 'Condition and style',
    update_level: 'Original, dated, modern'
  },
  
  general: {
    flooring: 'Carpet, hardwood, tile condition',
    paint: 'Colors indicate age',
    fixtures: 'Doorknobs, light switches',
    overall_cleanliness: 'Maintained vs neglected'
  }
};
```

**Photo Limitations:**
```
⚠️ Photos may be 2-10 years old
⚠️ Professional staging hides flaws
⚠️ Wide angle lenses distort
⚠️ Perfect lighting conceals issues
✅ Use as baseline only
✅ Assume condition has declined
```

### **4. County Assessor Photos**

**How to Access:**
```
- Search: "[County] property assessor"
- Enter parcel ID or address
- Look for "Photos" or "Images" tab
- Download all available photos
```

**Value of Assessor Photos:**
```javascript
const ASSESSOR_PHOTO_VALUE = {
  authenticity: 'Not staged, honest view',
  age: 'Usually 3-10 years old',
  coverage: 'Front, rear, sometimes interior',
  quality: 'Low resolution but informative',
  
  what_they_show: [
    'Actual condition at time of assessment',
    'Sometimes interior shots',
    'Overall property state',
    'Baseline for comparison'
  ],
  
  limitations: [
    'Often outdated',
    'Low quality images',
    'Limited angles',
    'Rare interior shots'
  ]
};
```

## Component-Based Condition Assessment

### **Roof Assessment**

**Visual Indicators:**
```javascript
const ROOF_CONDITION = {
  excellent: {
    indicators: ['Uniform dark color', 'Straight lines', 'No visible damage'],
    age: '0-5 years',
    cost: 0,
    action: 'None needed'
  },
  
  good: {
    indicators: ['Slightly faded', 'Even surface', 'Minor wear'],
    age: '5-10 years',
    cost: 2000,
    action: 'Budget for replacement in 5+ years'
  },
  
  fair: {
    indicators: ['Faded gray', 'Some curling', 'Granule loss visible'],
    age: '10-15 years',
    cost: 5000,
    action: 'Replacement within 2-3 years'
  },
  
  poor: {
    indicators: ['Very faded', 'Curling shingles', 'Missing shingles'],
    age: '15-20 years',
    cost: 10000,
    action: 'Needs immediate replacement'
  },
  
  failing: {
    indicators: ['Sagging', 'Blue tarps', 'Major damage visible'],
    age: '20+ years or damaged',
    cost: 15000,
    action: 'Emergency replacement + interior damage'
  }
};
```

**Roof Replacement Costs:**
```javascript
function estimateRoofCost(sqft, stories, complexity) {
  const base_cost_per_sqft = 5; // Average for asphalt shingles
  let total = sqft * base_cost_per_sqft;
  
  // Adjustments
  if (stories === 2) total *= 1.20; // 20% more for 2-story
  if (stories === 3) total *= 1.40; // 40% more for 3-story
  if (complexity === 'high') total *= 1.30; // Multiple peaks, valleys
  
  // Add tear-off
  total += 2000; // Typical tear-off cost
  
  return Math.round(total);
}

// Typical range: $8,000 - $15,000 for average home
```

### **Siding Assessment**

**Siding Types & Costs:**
```javascript
const SIDING_COSTS = {
  vinyl: {
    repair: 500,
    full_replacement: 8000,
    lifespan: '20-30 years',
    indicators: {
      good: 'No fading, no cracks',
      poor: 'Severe fading, cracks, warping'
    }
  },
  
  wood: {
    paint: 4000,
    scrape_and_paint: 6000,
    partial_replacement: 10000,
    full_replacement: 20000,
    lifespan: '15-25 years with maintenance',
    indicators: {
      good: 'Solid paint, no rot',
      poor: 'Peeling paint, visible rot'
    }
  },
  
  brick: {
    tuckpointing: 3000,
    major_repair: 8000,
    lifespan: '100+ years',
    indicators: {
      good: 'Solid mortar, no cracks',
      poor: 'Crumbling mortar, major cracks'
    }
  },
  
  stucco: {
    repair: 2000,
    full_replacement: 15000,
    lifespan: '50+ years',
    indicators: {
      good: 'No cracks, solid',
      poor: 'Cracking, water damage'
    }
  }
};
```

### **Window Assessment**

**Window Condition Matrix:**
```javascript
const WINDOW_ASSESSMENT = {
  boarded: {
    severity: 'CRITICAL',
    indicates: 'Long-term vacancy, vandalism',
    cost: 18000, // Replace all + unknown interior damage
    action: 'MAJOR RED FLAG'
  },
  
  broken: {
    severity: 'HIGH',
    indicates: 'Recent vandalism or storm damage',
    cost: 1000, // Per window to replace
    action: 'Calculate number of broken windows'
  },
  
  original_old: {
    severity: 'MODERATE',
    indicators: ['Wood frames', 'Single pane', 'Visible deterioration'],
    cost: 15000, // Replace all windows (10 typical)
    energy_impact: 'Very poor efficiency',
    action: 'Budget for replacement'
  },
  
  newer_vinyl: {
    severity: 'LOW',
    indicators: ['Vinyl frames', 'Double pane', 'Good condition'],
    cost: 0,
    action: 'No action needed'
  }
};
```

### **HVAC Assessment**

**Cannot See Remotely - Use Age Assumptions:**
```javascript
function estimateHVAC(year_built, visible_exterior_unit) {
  if (visible_exterior_unit === 'new_looking') {
    return { cost: 0, condition: 'likely_good' };
  }
  
  const age = 2025 - year_built;
  
  if (age > 20) {
    return {
      cost: 8000,
      condition: 'likely_needs_replacement',
      reasoning: 'Original system, 20+ years old'
    };
  }
  
  if (age > 15) {
    return {
      cost: 6000,
      condition: 'aging',
      reasoning: 'Assume needs replacement soon'
    };
  }
  
  return {
    cost: 3000, // Contingency
    condition: 'unknown',
    reasoning: 'Budget for potential issues'
  };
}
```

## Condition Scoring System

```javascript
function calculateConditionScore(observations) {
  let score = 5.0; // Start at average
  
  // ROOF (weight: 30% of total)
  if (observations.roof === 'excellent') score += 2.0;
  else if (observations.roof === 'good') score += 1.0;
  else if (observations.roof === 'fair') score += 0;
  else if (observations.roof === 'poor') score -= 1.5;
  else if (observations.roof === 'failing') score -= 3.0;
  
  // SIDING (weight: 15%)
  if (observations.siding === 'excellent') score += 1.0;
  else if (observations.siding === 'good') score += 0.5;
  else if (observations.siding === 'poor') score -= 1.0;
  else if (observations.siding === 'failing') score -= 1.5;
  
  // WINDOWS (weight: 20%)
  if (observations.windows === 'boarded') score -= 2.0;
  else if (observations.windows === 'broken_multiple') score -= 1.5;
  else if (observations.windows === 'original_old') score -= 1.0;
  else if (observations.windows === 'newer') score += 1.5;
  
  // CRITICAL RED FLAGS (automatic severe penalties)
  if (observations.fire_damage) score -= 5.0;
  if (observations.structural_sagging) score -= 4.0;
  if (observations.foundation_failure) score -= 3.0;
  
  // LANDSCAPING (weight: 5%)
  if (observations.landscaping === 'maintained') score += 0.5;
  else if (observations.landscaping === 'overgrown') score -= 0.5;
  else if (observations.landscaping === 'extreme') score -= 1.0;
  
  // Bound score between 1-10
  score = Math.max(1, Math.min(10, score));
  
  const rating = score >= 9 ? 'excellent' :
                 score >= 7 ? 'good' :
                 score >= 5 ? 'fair' :
                 score >= 3 ? 'poor' : 'very_poor';
  
  return { score, rating };
}
```

## Repair Cost Estimation

### **By Condition Level:**
```javascript
const REPAIR_COSTS_BY_CONDITION = {
  excellent: {
    score_range: [9, 10],
    total_repairs: 5000,
    description: 'Cosmetic only',
    details: 'Paint touch-up, minor landscaping'
  },
  
  good: {
    score_range: [7, 8.9],
    total_repairs: 15000,
    description: 'Minor updates',
    details: 'Paint, flooring, minor kitchen/bath updates'
  },
  
  fair: {
    score_range: [5, 6.9],
    total_repairs: 35000,
    description: 'Moderate rehab',
    details: 'Roof, HVAC, kitchen, bathrooms, flooring, paint'
  },
  
  poor: {
    score_range: [3, 4.9],
    total_repairs: 65000,
    description: 'Major repairs',
    details: 'All systems, full kitchen/bath, structural items'
  },
  
  very_poor: {
    score_range: [1, 2.9],
    total_repairs: 120000,
    description: 'Extensive renovation',
    details: 'Gut renovation, possible structural work'
  }
};
```

### **By Square Footage:**
```javascript
function estimateRepairsBySqft(sqft, condition_rating) {
  const COST_PER_SQFT = {
    excellent: 5,
    good: 15,
    fair: 30,
    poor: 60,
    very_poor: 100
  };
  
  return sqft * COST_PER_SQFT[condition_rating];
}

// Example: 1,500 sqft fair condition = 1,500 × $30 = $45,000
```

## Red Flag Detection

### **CRITICAL (Deal Breakers):**
```javascript
const CRITICAL_RED_FLAGS = {
  fire_damage: {
    indicators: ['Charred siding', 'Black stains', 'Boarded everything'],
    cost: '50K-150K',
    recommendation: 'REJECT'
  },
  
  structural_failure: {
    indicators: ['Sagging roofline', 'Leaning walls', 'Foundation cracks'],
    cost: '30K-100K+',
    recommendation: 'REJECT'
  },
  
  total_collapse: {
    indicators: ['Collapsed sections', 'Caved roof', 'Partial demolition'],
    cost: 'May exceed value',
    recommendation: 'REJECT'
  }
};
```

### **MAJOR (Proceed with Caution):**
```javascript
const MAJOR_RED_FLAGS = {
  boarded_windows: {
    indicates: 'Long-term vacancy, vandalism',
    cost: '10K-15K windows + unknown interior',
    recommendation: 'CAUTION - assume worst case interior'
  },
  
  roof_failure: {
    indicates: 'Water damage inside',
    cost: '10K roof + 10K interior water damage',
    recommendation: 'CAUTION - budget high'
  },
  
  extreme_neglect: {
    indicates: 'Vacant 12+ months',
    cost: '50K+ full renovation',
    recommendation: 'CAUTION - thorough assessment needed'
  }
};
```

## Best Practices

**DO:**
✅ Check all 4 visual sources (Street View, Aerial, Listings, Assessor)
✅ Use Street View timeline to see condition changes
✅ Assume condition has declined since photos
✅ Budget conservatively on repair estimates
✅ Add 15-20% contingency to all estimates
✅ Document every observation with screenshots
✅ Compare to similar properties in area

**DON'T:**
❌ Rely on old listing photos only
❌ Assume interior is better than exterior
❌ Underestimate repair costs
❌ Ignore red flags
❌ Skip the aerial view
❌ Forget to check assessor records
