# Title Search Methodology - Skill

## Overview
Comprehensive methodologies for researching property titles, identifying liens, analyzing deed chains, and determining survivability of encumbrances in tax sale contexts.

## Step-by-Step Title Search Process

### **Step 1: Gather Property Information**

**Required Data:**
- Property address
- Parcel ID / Tax ID
- County and state
- Current owner name
- Previous owner names (if known)

### **Step 2: County Recorder Search**

**Access Methods:**
```
Online Portal:
- Search: "[County] county recorder [State]"
- Look for: "Property Search", "Document Search", "Deed Search"
- Example: "Blair County Recorder Pennsylvania"

In-Person:
- Visit county courthouse
- Request: "Deed records for parcel [ID]"
- Fees: $1-5 per page (typical)
```

**What to Request:**
1. Current deed
2. All deeds in last 30 years (full chain)
3. All recorded liens
4. All releases/satisfactions
5. Mortgages and assignments

### **Step 3: Analyze Deed Chain**

**Build Timeline:**
```javascript
const DEED_CHAIN_ANALYSIS = {
  current_owner: {
    name: 'John Smith',
    acquired_date: '2018-03-20',
    deed_type: 'warranty',
    grantor: 'Jane Doe',
    consideration: 150000,
    recording: { book: '2048', page: '125' }
  },
  
  previous_owners: [
    {
      name: 'Jane Doe',
      acquired_date: '2010-06-15',
      deed_type: 'warranty',
      grantor: 'Bob Johnson',
      consideration: 125000
    }
  ]
};
```

**Red Flags in Chain:**
```javascript
const CHAIN_RED_FLAGS = {
  CRITICAL: [
    'Gap in chain (missing deeds)',
    'Forged signatures',
    'Invalid notarization',
    'Grantor didn\'t own property',
    'Deed after death (no probate)',
    'Multiple claims to same property'
  ],
  
  WARNING: [
    'Quitclaim deed (may indicate title issues)',
    'Sheriff\'s deed (foreclosure)',
    'Tax deed (previous tax sale)',
    '$1 consideration (gift/family transfer)',
    'Spelling variations in names',
    'Multiple name changes'
  ],
  
  INVESTIGATE: [
    'Estate/executor deed (verify probate)',
    'Trustee deed (verify trust authority)',
    'Power of attorney deed (verify POA validity)',
    'Corporate deed (verify corporate authority)'
  ]
};
```

### **Step 4: Identify All Liens**

**Search Locations:**
```
County Recorder:
- Mortgages
- Mechanic's liens
- Judgment liens
- HOA liens
- Municipal liens

Federal Court (PACER):
- IRS tax liens
- Federal judgments
- Bankruptcy cases
- EPA liens

State Court:
- State tax liens
- Civil judgments
- Domestic relations orders
```

**Lien Priority System:**
```javascript
const LIEN_PRIORITIES = {
  // Pennsylvania example
  PA: [
    { priority: 1, type: 'Property Tax', survives_tax_sale: false },
    { priority: 2, type: 'IRS Tax Lien', survives_tax_sale: true },
    { priority: 3, type: 'First Mortgage', survives_tax_sale: false },
    { priority: 4, type: 'Second Mortgage', survives_tax_sale: false },
    { priority: 5, type: 'Mechanic\'s Lien', survives_tax_sale: false },
    { priority: 6, type: 'Judgment Lien', survives_tax_sale: false },
    { priority: 7, type: 'HOA Lien', survives_tax_sale: 'depends' }
  ]
};

// Priority rule: First in time = First in right
// EXCEPTION: Property taxes have super-priority
```

### **Step 5: PACER Federal Lien Search**

**Access PACER:**
```
1. Register at pacer.gov ($0.10 per page)
2. Search by:
   - Property owner name
   - Property address
   - Parcel ID
3. Look for:
   - Bankruptcy filings
   - IRS tax liens
   - Federal judgments
   - EPA enforcement actions
```

**Critical Federal Liens:**
```javascript
const FEDERAL_LIENS = {
  IRS: {
    survives_tax_sale: true,
    priority: 'super_priority',
    danger_level: 'CRITICAL',
    action: 'DO NOT BID - you inherit the debt'
  },
  
  EPA: {
    survives_tax_sale: true,
    priority: 'super_priority',
    danger_level: 'CRITICAL',
    action: 'DO NOT BID - environmental liability'
  },
  
  SBA: {
    survives_tax_sale: 'sometimes',
    priority: 'high',
    danger_level: 'HIGH',
    action: 'Research specific lien'
  }
};
```

### **Step 6: Determine Lien Survivability**

**State-Specific Rules:**

**Pennsylvania:**
```javascript
const PA_SURVIVABILITY = {
  survives: [
    'IRS federal tax liens',
    'EPA environmental liens',
    'Some municipal utility liens'
  ],
  
  wiped_out: [
    'Property tax liens (the sale itself)',
    'All mortgages',
    'Most judgment liens',
    'Mechanic\'s liens (usually)',
    'Second mortgages',
    'Home equity lines'
  ],
  
  uncertain: [
    'HOA liens - check state law and HOA docs',
    'Municipal liens - depends on type',
    'Some assessment liens'
  ]
};
```

### **Step 7: Calculate Total Lien Exposure**

```javascript
function calculateLienExposure(liens, state, property_value) {
  let surviving_amount = 0;
  let wiped_amount = 0;
  const warnings = [];
  
  liens.forEach(lien => {
    const survives = checkSurvivability(lien.type, state);
    
    if (survives === true) {
      surviving_amount += lien.amount;
      warnings.push({
        type: lien.type,
        amount: lien.amount,
        severity: 'CRITICAL',
        message: `${lien.type} of $${lien.amount} SURVIVES - you inherit this debt`
      });
    } else if (survives === 'maybe') {
      warnings.push({
        type: lien.type,
        amount: lien.amount,
        severity: 'WARNING',
        message: `${lien.type} may survive - research required`
      });
    } else {
      wiped_amount += lien.amount;
    }
  });
  
  const exposure_ratio = surviving_amount / property_value;
  
  return {
    surviving_amount,
    wiped_amount,
    exposure_ratio,
    recommendation: surviving_amount === 0 ? 'APPROVE' :
                    exposure_ratio < 0.30 ? 'CAUTION' : 'REJECT',
    warnings
  };
}
```

### **Step 8: Title Issue Identification**

**Common Title Defects:**
```javascript
const TITLE_DEFECTS = {
  boundary_disputes: {
    severity: 'MAJOR',
    resolution_cost: '5000-20000',
    resolution_time: '3-12 months',
    description: 'Survey shows encroachments or disputes with neighbors'
  },
  
  easements: {
    severity: 'MINOR to MAJOR',
    resolution_cost: '0-10000',
    resolution_time: '1-6 months',
    description: 'Rights of others to use property (utility, access, etc)'
  },
  
  missing_heirs: {
    severity: 'CRITICAL',
    resolution_cost: '10000-50000',
    resolution_time: '6-24 months',
    description: 'Estate deed without all heirs signing off'
  },
  
  forged_documents: {
    severity: 'CRITICAL',
    resolution_cost: 'UNINSURABLE',
    resolution_time: 'Years',
    description: 'Fraudulent signatures in chain'
  },
  
  unreleased_mortgages: {
    severity: 'MODERATE',
    resolution_cost: '500-3000',
    resolution_time: '1-3 months',
    description: 'Mortgage paid off but not formally released'
  }
};
```

### **Step 9: Title Insurance Analysis**

**When Title Insurance is Critical:**
```javascript
const TITLE_INSURANCE_SCENARIOS = {
  REQUIRED: [
    'Any surviving liens > $1,000',
    'Gaps in deed chain',
    'Quitclaim deeds in chain',
    'Estate/probate transfers',
    'Any title defects identified',
    'Property value > $100,000'
  ],
  
  RECOMMENDED: [
    'All tax sale purchases',
    'Properties with complex history',
    'Commercial properties',
    'Properties to be financed/sold'
  ],
  
  OPTIONAL: [
    'Very low value properties (<$30K)',
    'Perfect title history',
    'Cash buyer, no financing needed',
    'Holding for rental (less critical)'
  ]
};

function estimateTitleInsuranceCost(property_value) {
  // Typical rates
  if (property_value < 50000) return 500;
  if (property_value < 100000) return 1000;
  if (property_value < 200000) return 1500;
  if (property_value < 500000) return 2500;
  return property_value * 0.005; // 0.5% for high-value
}
```

### **Step 10: Document Everything**

**Title Search Report Template:**
```markdown
# TITLE SEARCH REPORT

Property: [Address]
Parcel ID: [ID]
County: [County], [State]
Search Date: [Date]

## DEED CHAIN (30 years)
[List all transfers with dates, parties, deed types]

Chain Status: COMPLETE/INCOMPLETE
Chain Quality: EXCELLENT/GOOD/FAIR/POOR

## LIENS IDENTIFIED
[List each lien with holder, amount, date, survivability]

Total Liens: $[Amount]
Surviving Liens: $[Amount]

## FEDERAL LIEN SEARCH (PACER)
[Results of IRS, bankruptcy, federal searches]

Status: CLEAR/CONCERNS

## TITLE ISSUES
[Any defects, gaps, problems identified]

## TITLE RISK ASSESSMENT
Risk Score: [0-10]
Title Status: CLEAN/CLOUDED/DEFECTIVE
Marketable: YES/NO

## RECOMMENDATIONS
[APPROVE/CAUTION/REJECT with reasoning]
```

## Best Practices

**DO:**
✅ Search 30+ years back minimum
✅ Check both county AND federal records
✅ Verify probate for estate deeds
✅ Cross-reference all name variations
✅ Calculate lien priorities accurately
✅ Research state-specific survivability rules
✅ Budget for title insurance
✅ Document everything in writing

**DON'T:**
❌ Skip PACER federal search
❌ Assume all liens are wiped
❌ Ignore quitclaim deeds in chain
❌ Miss HOA liens (especially in FL)
❌ Forget to verify probate closure
❌ Rely on verbal assurances
❌ Skip title insurance to save money
