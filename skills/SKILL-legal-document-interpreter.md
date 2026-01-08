# Legal Document Interpreter - Skill

## Overview
Guide for parsing and interpreting legal documents commonly found in title searches including deeds, mortgages, liens, and judgments.

## Document Types & How to Read Them

### **1. WARRANTY DEED**

**Purpose:** Seller guarantees clear title to buyer

**Key Elements to Extract:**
```javascript
const WARRANTY_DEED = {
  grantor: 'Who is selling (previous owner)',
  grantee: 'Who is buying (new owner)',
  consideration: 'Purchase price (usually in dollars)',
  legal_description: 'Exact property boundaries and location',
  recording_info: {
    book: 'Deed book number',
    page: 'Page number in book',
    date: 'Date recorded at county'
  },
  previous_deed_reference: 'Book/Page where grantor acquired property',
  encumbrances: 'List of any liens/easements',
  warranties: 'Seller guarantees clear title'
};
```

**What to Look For:**
- ✅ "Warranty deed" in title = Good sign
- ✅ Consideration = actual sale price
- ✅ References previous deed = good chain
- ⚠️ "Subject to" clauses = possible encumbrances
- ❌ Missing warranties = potential issues

**Example Language:**
```
"KNOW ALL MEN BY THESE PRESENTS that Jane Doe, grantor, 
for the consideration of One Hundred Fifty Thousand Dollars 
($150,000.00), does GRANT and CONVEY unto John Smith, grantee, 
the following described real estate..."

[Legal Description]

"Being the same property conveyed to grantor by deed 
recorded in Book 1985, Page 456..."

"Subject to easements of record."

"TO HAVE AND TO HOLD the same, together with all rights..."

GRANTOR COVENANTS with grantee that grantor is lawfully 
seized of said premises and has good right to convey the same."
```

### **2. QUITCLAIM DEED**

**Purpose:** Transfer whatever interest seller has (NO WARRANTIES)

**Red Flag Language:**
```javascript
const QUITCLAIM_RED_FLAGS = {
  language: [
    "Quitclaim deed",
    "Releases all interest",
    "Without warranty",
    "As-is, where-is"
  ],
  
  meaning: 'Seller makes NO guarantees about title quality',
  
  common_uses: [
    'Family transfers (divorce, inheritance)',
    'Clouded title situations',
    'Partial interest transfers',
    'Clearing up old claims'
  ],
  
  concern_level: 'HIGH',
  action: 'Investigate WHY quitclaim was used'
};
```

**Why Quitclaims are Concerning:**
- No warranty = seller may not own anything
- Often used to hide title problems
- May indicate disputes or unclear ownership
- Harder to get title insurance

**When to Worry:**
- ❌ Quitclaim in recent history (last 5 years)
- ❌ Multiple quitclaims in chain
- ❌ Quitclaim for full purchase price (suspicious)
- ⚠️ One old quitclaim (estate settlement) = less concerning

### **3. MORTGAGE DOCUMENT**

**Purpose:** Lien securing repayment of loan

**Key Information to Extract:**
```javascript
const MORTGAGE_ELEMENTS = {
  lien_holder: 'Bank or lender name',
  borrower: 'Property owner',
  original_amount: 'Initial loan amount',
  recording_date: 'When mortgage was recorded',
  maturity_date: 'When loan is due (if stated)',
  interest_rate: 'Annual percentage rate',
  property_description: 'Collateral being secured',
  
  critical_for_title: {
    priority_date: 'Recording date determines priority',
    release_status: 'Has it been released/satisfied?',
    current_balance: 'Not in document - must research',
    survives_tax_sale: false // In most states
  }
};
```

**Tax Sale Impact:**
```javascript
const MORTGAGE_TAX_SALE_RULES = {
  PA: { survives: false, wiped_by: 'tax sale' },
  FL: { survives: false, wiped_by: 'tax certificate sale' },
  TX: { survives: false, wiped_by: 'tax deed sale' },
  
  exception: 'IRS liens ALWAYS survive tax sale'
};
```

### **4. MECHANIC'S LIEN**

**Purpose:** Contractor/supplier lien for unpaid work

**Critical Timing:**
```javascript
const MECHANICS_LIEN_PRIORITY = {
  relate_back_doctrine: {
    description: 'Lien priority relates back to START of work',
    not_filing_date: true,
    example: 'Work started Jan 1, filed May 1, priority = Jan 1'
  },
  
  timing_rules: {
    work_completion: 'Last day work was performed',
    filing_deadline: '90-180 days after completion (varies by state)',
    late_filing: 'Lien may be invalid if filed late'
  },
  
  priority_calculation: {
    vs_mortgage: 'If work started BEFORE mortgage, mechanic wins',
    vs_mortgage2: 'If work started AFTER mortgage, mortgage wins',
    vs_tax_sale: 'Usually wiped out by tax sale'
  }
};
```

**What to Extract:**
```
- Contractor name
- Work performed
- Amount claimed
- Date work started
- Date work completed
- Date lien filed
- Property description
```

**Validate Lien:**
- ✅ Filed within deadline (check state law)
- ✅ Proper legal description
- ✅ Proper notice to owner
- ❌ Late filing = invalid lien

### **5. JUDGMENT LIEN**

**Purpose:** Court judgment creates lien on real property

**Types of Judgments:**
```javascript
const JUDGMENT_TYPES = {
  general_judgment: {
    description: 'Attaches to ALL real property in county',
    example: 'Credit card judgment, personal injury award',
    duration: '10 years (can be renewed)',
    priority: 'Date judgment filed in county records'
  },
  
  specific_judgment: {
    description: 'Against specific property only',
    example: 'HOA assessment, construction dispute',
    duration: 'Varies',
    priority: 'Date judgment entered'
  },
  
  foreign_judgment: {
    description: 'Judgment from another state',
    requirement: 'Must be domesticated (filed) in this state',
    priority: 'Date domesticated, not original date'
  }
};
```

**Extract From Judgment:**
```javascript
const JUDGMENT_INFO = {
  creditor: 'Who won the judgment',
  debtor: 'Property owner',
  amount: 'Original judgment amount',
  interest_rate: 'Usually statutory rate',
  judgment_date: 'Date court entered judgment',
  filing_date: 'Date filed in county records (PRIORITY DATE)',
  expiration: 'Add 10 years to filing date',
  
  tax_sale_impact: {
    PA: 'Usually wiped out',
    FL: 'Usually wiped out',
    exception: 'Government judgments may survive'
  }
};
```

### **6. IRS TAX LIEN (FEDERAL)**

**Purpose:** IRS claim for unpaid federal taxes

**CRITICAL INFORMATION:**
```javascript
const IRS_LIEN = {
  danger_level: 'CATASTROPHIC',
  survives_tax_sale: true,
  
  identification: {
    title: 'Notice of Federal Tax Lien',
    filed_by: 'Internal Revenue Service',
    recorded_at: 'County recorder AND PACER',
    amount: 'Includes penalties and interest'
  },
  
  impact: {
    new_owner: 'YOU INHERIT THE DEBT',
    property_value: 'Property becomes unsellable',
    removal: 'Must pay IRS in full or negotiate',
    timeline: '10 years + renewals'
  },
  
  action: 'DO NOT BID ON ANY PROPERTY WITH IRS LIEN'
};
```

**IRS Lien Language:**
```
"NOTICE OF FEDERAL TAX LIEN

Filed pursuant to Internal Revenue Code...

Taxpayer: John Smith
SSN/EIN: XXX-XX-XXXX

Amount: $45,000.00

Kind of Tax: Income Tax
Tax Period: 2020, 2021

This lien attaches to ALL property and rights to 
property belonging to the taxpayer."
```

**What This Means:**
- ❌ Lien SURVIVES tax sale
- ❌ New owner INHERITS debt
- ❌ Cannot get title insurance
- ❌ Cannot sell property
- ❌ IRS can foreclose on new owner

### **7. HOA LIEN**

**Purpose:** Homeowners association unpaid dues/assessments

**State-Specific Survivability:**
```javascript
const HOA_SURVIVABILITY = {
  PA: {
    survives: 'Sometimes',
    research: 'Check HOA docs and state law',
    amount_limit: 'Some states cap survivable amount'
  },
  
  FL: {
    survives: 'Often yes',
    amount: 'Up to 12 months + costs',
    danger_level: 'HIGH'
  },
  
  TX: {
    survives: 'Usually no',
    exception: 'If HOA foreclosed (not tax sale)',
    danger_level: 'LOW'
  }
};
```

**What to Check:**
- Read HOA governing documents (CC&Rs)
- Check state statutes on HOA lien priority
- Calculate total amount owed
- Determine if lien filed before tax sale
- Research super-lien states (FL, NV, some others)

## Document Review Checklist

### **For Every Deed:**
- [ ] Extract grantor and grantee names
- [ ] Note deed type (warranty vs quitclaim)
- [ ] Record consideration (price)
- [ ] Copy legal description
- [ ] Note "subject to" clauses
- [ ] Check for warranties
- [ ] Record book/page references
- [ ] Note previous deed reference
- [ ] Check signatures and notarization
- [ ] Verify recording date

### **For Every Lien:**
- [ ] Identify lien type
- [ ] Extract amount
- [ ] Note filing date (PRIORITY)
- [ ] Determine if lien is valid
- [ ] Calculate priority position
- [ ] Research survivability in tax sale
- [ ] Check for satisfaction/release
- [ ] Note expiration date
- [ ] Assess danger level

## Common Legal Phrases & Their Meaning

```javascript
const LEGAL_TERMINOLOGY = {
  "Subject to": "Property has this encumbrance/easement",
  "Covenant": "Promise or guarantee",
  "Hereditaments": "Everything that can be inherited (includes property)",
  "Appurtenances": "Rights that go with the property",
  "Seized": "Legal ownership",
  "Convey": "Transfer ownership",
  "Habendum clause": "To have and to hold" section",
  "Granting clause": "Main transfer language",
  "Consideration": "Payment/value exchanged",
  "Good and indefeasible title": "Clear, unquestionable ownership",
  "Free and clear": "No liens or encumbrances",
  "As-is, where-is": "No warranties, buyer beware",
  "Without recourse": "Seller not liable for defects"
};
```

## Red Flags in Documents

**CRITICAL:**
- ❌ "Without warranty" or "As-is"
- ❌ Quitclaim deed for valuable property
- ❌ IRS federal tax lien
- ❌ Missing signatures
- ❌ Expired notary
- ❌ Grantor didn't own property

**WARNING:**
- ⚠️ Multiple "subject to" clauses
- ⚠️ Power of attorney signature
- ⚠️ Corporate grantor without corporate seal
- ⚠️ Executor's deed without probate reference
- ⚠️ Name spelling variations
- ⚠️ Very low consideration ($1)

**INVESTIGATE:**
- 🔍 Estate/executor deed (check probate)
- 🔍 Trustee deed (verify trust authority)
- 🔍 Sheriff's deed (foreclosure history)
- 🔍 Tax deed (previous tax sale)
- 🔍 Foreign language documents

## Best Practices

✅ Read entire document, not just summary
✅ Look up unfamiliar legal terms
✅ Cross-reference names across documents
✅ Verify all recording information
✅ Check for amendments/corrections
✅ Research state-specific rules
✅ Consult title attorney for complex issues
✅ Document everything with citations
