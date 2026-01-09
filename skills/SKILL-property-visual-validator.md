# Property Visual Validator Skill

## Purpose
Analyze images from Regrid, Google Maps, and Zillow to determine if a property is **investable** or should be **skipped** (cemeteries, lakes, utility strips, landlocked parcels, etc.).

## When to Use
- After Regrid scraping captures property screenshots
- Before Property Condition Analysis (Agent 6)
- When evaluating any property for investment potential

## Available Tools
- **Playwright MCP**: Navigate to Google Maps/Street View
- **Supabase MCP**: Store validation results
- **Read Tool**: Analyze Regrid screenshots already captured

---

## Visual Analysis Workflow

### Step 1: Check Regrid Data First
```sql
-- Get Regrid data for the property
SELECT
  rd.property_type,
  rd.property_class,
  rd.land_use,
  rd.zoning,
  rd.lot_size_sqft,
  rd.lot_size_acres,
  rd.lot_dimensions,
  rd.building_sqft,
  rd.screenshot_url
FROM regrid_data rd
WHERE rd.property_id = 'property-uuid';
```

**Auto-Reject from Regrid Data:**
| Field | Value | Action |
|-------|-------|--------|
| property_type | 'CEMETERY' | REJECT |
| land_use | 'WATER', 'LAKE', 'POND' | REJECT |
| land_use | 'UTILITY', 'POWER' | REJECT |
| lot_size_sqft | < 1000 | REJECT (unbuildable) |
| lot_dimensions | width < 20ft | REJECT (sliver lot) |
| building_sqft | 0 AND lot_size < 0.1 acre | CAUTION |

### Step 2: Analyze Regrid Screenshot
If `screenshot_url` exists, analyze the aerial image:

**Look For:**
1. **Structure Present?**
   - Building footprint visible = residential potential
   - Empty lot = CAUTION (check size)

2. **Land Use Indicators:**
   - Headstones/grave markers = CEMETERY (REJECT)
   - Blue/water bodies = LAKE/POND (REJECT)
   - Power lines/towers = UTILITY (REJECT)
   - Railroad tracks = RAILROAD (REJECT)

3. **Lot Shape:**
   - Rectangular/square = GOOD
   - Long thin strip = SLIVER (REJECT)
   - No road frontage visible = LANDLOCKED (REJECT)

4. **Surrounding Context:**
   - Residential neighborhood = GOOD
   - Industrial area = CAUTION
   - Flood plain indicators = CAUTION

### Step 3: Google Maps Verification (if needed)
Use Playwright to navigate to Google Maps for additional verification:

```javascript
// Navigate to property location
await browser_navigate({
  url: `https://www.google.com/maps/search/${encodeURIComponent(property_address)}`
});

// Wait for map to load
await browser_wait_for({ time: 3 });

// Take snapshot
await browser_snapshot();

// Switch to satellite view if needed
await browser_click({
  element: 'Layers button',
  ref: 'layers-button-ref'
});
```

**Google Maps Checks:**
- Confirm property location
- Verify road access
- Check satellite imagery for land use
- Note any obvious issues (water, industrial, etc.)

### Step 4: Google Street View (if available)
```javascript
// Open Street View
await browser_click({
  element: 'Street View pegman',
  ref: 'streetview-ref'
});

// Wait for Street View to load
await browser_wait_for({ time: 3 });

// Take screenshot
await browser_take_screenshot({
  filename: `streetview_${parcel_id}.png`
});
```

**Street View Checks:**
- Structure visible from street?
- Property condition (rough assessment)
- Signs (For Sale, Condemned, Cemetery, etc.)
- Road quality and access
- Neighboring properties

### Step 5: Zillow Check (optional, for additional context)
```javascript
// Search Zillow for property
await browser_navigate({
  url: `https://www.zillow.com/homes/${encodeURIComponent(property_address)}_rb/`
});

// Wait for results
await browser_wait_for({ text: 'home' });

// Extract listing info if available
await browser_snapshot();
```

**Zillow Checks:**
- Listed as residential?
- Photos available?
- Zestimate exists? (validates it's a real property)
- Any sale history?

---

## Auto-Reject Criteria

### IMMEDIATE REJECT (No Further Analysis)
| Condition | Detection Method | Reason |
|-----------|------------------|--------|
| Cemetery | Regrid data OR headstones visible | Non-investable |
| Lake/Pond/Water Body | >50% lot is water | Non-buildable |
| Utility Easement | Power towers/substations visible | Utility property |
| Railroad Property | Tracks visible, railroad land use | Non-investable |
| Landlocked | No road frontage visible | No access |
| Sliver Lot | Width < 20ft | Unbuildable |
| Public Park | Park equipment, maintained grass | Government property |
| Condemned/Demolished | Visible damage, warning signs | Negative value |

### CAUTION (Flag for Manual Review)
| Condition | Detection Method | Reason |
|-----------|------------------|--------|
| Vacant Lot | No structure, lot < 0.25 acre | May be unusable |
| Industrial Zoning | Surrounded by industrial | Zoning restrictions |
| Flood Plain | Near water, low elevation | Insurance issues |
| Commercial Only | Zoned commercial, no residential | Use restrictions |
| Irregular Shape | Flag lot, odd boundaries | Development challenges |
| Mobile Home | Mobile/manufactured visible | Different valuation |
| Multi-Family | Apartment/duplex visible | Different analysis needed |

### APPROVED (Proceed with Analysis)
| Condition | Detection Method |
|-----------|------------------|
| Residential Structure | House/building visible |
| Regular Lot Shape | Rectangular, reasonable size |
| Road Access | Clear street frontage |
| Residential Zoning | Residential neighbors |
| No Red Flags | None of the above issues |

---

## Validation Scoring

```javascript
function calculateValidationScore(findings) {
  let score = 100;
  let status = 'APPROVED';
  const redFlags = [];

  // IMMEDIATE REJECTS (-100 points)
  if (findings.cemetery) { score = 0; redFlags.push('Cemetery detected'); }
  if (findings.waterBody) { score = 0; redFlags.push('Water body detected'); }
  if (findings.utility) { score = 0; redFlags.push('Utility property'); }
  if (findings.landlocked) { score = 0; redFlags.push('No road access'); }
  if (findings.sliverLot) { score = 0; redFlags.push('Unbuildable sliver lot'); }

  // CAUTION FLAGS (-25 points each)
  if (findings.vacantLot) { score -= 25; redFlags.push('Vacant lot'); }
  if (findings.industrialArea) { score -= 25; redFlags.push('Industrial area'); }
  if (findings.irregularShape) { score -= 15; redFlags.push('Irregular lot shape'); }
  if (findings.noStructure) { score -= 20; redFlags.push('No structure visible'); }

  // Determine status
  if (score <= 0) {
    status = 'REJECT';
  } else if (score < 70 || redFlags.length > 0) {
    status = 'CAUTION';
  } else {
    status = 'APPROVED';
  }

  return { score, status, redFlags };
}
```

---

## Database Storage

### Store Validation Result
```sql
SELECT upsert_visual_validation(
  'property-uuid',           -- property_id
  'APPROVED',                -- validation_status: APPROVED/CAUTION/REJECT
  85.0,                      -- confidence_score (0-100)
  true,                      -- structure_present
  true,                      -- road_access
  'residential',             -- land_use_observed
  'regular',                 -- lot_shape
  '[]'::jsonb,               -- red_flags (array)
  NULL,                      -- skip_reason (if rejected)
  '{"regrid": true, "google_maps": true}'::jsonb,  -- images_analyzed
  'https://storage.../screenshot.png',  -- regrid_screenshot_url
  'https://google.com/maps/...',        -- google_maps_url
  'https://google.com/maps/@...',       -- street_view_url
  NULL,                      -- zillow_url
  '{"structure": "single_family", "condition": "visible"}'::jsonb,  -- findings
  'Residential property, good investment candidate'  -- notes
);
```

### Query Properties by Validation Status
```sql
-- Get approved properties ready for full analysis
SELECT * FROM vw_investable_properties WHERE county_id = 'county-uuid';

-- Get rejected properties for audit
SELECT * FROM vw_rejected_properties;

-- Get properties needing manual review
SELECT * FROM vw_caution_properties;

-- Get properties not yet validated
SELECT * FROM get_properties_needing_visual_validation('county-uuid', 50);
```

---

## Output Format

### Validation Report
```
============================================================
VISUAL VALIDATION REPORT
============================================================

Property: 456 Oak St, Altoona, PA 16602
Parcel ID: 01.01-04..-156.00-000

------------------------------------------------------------
VALIDATION STATUS: APPROVED
Confidence Score: 92%
------------------------------------------------------------

VISUAL ANALYSIS:
  Structure Present: Yes (single-family home)
  Road Access: Yes (Oak St frontage)
  Land Use: Residential
  Lot Shape: Regular (rectangular)
  Lot Size: 0.18 acres (7,840 sqft)

IMAGES ANALYZED:
  [X] Regrid Aerial Screenshot
  [X] Google Maps Satellite
  [X] Google Street View
  [ ] Zillow (not available)

RED FLAGS: None

FINDINGS:
  - Single-family residential structure visible
  - Well-maintained neighborhood
  - Clear road frontage on Oak St
  - Regular rectangular lot
  - No visible issues or concerns

RECOMMENDATION: Proceed to Property Condition Analysis (Agent 6)

============================================================
```

### Rejection Report
```
============================================================
VISUAL VALIDATION REPORT
============================================================

Property: 123 Memorial Dr, Altoona, PA 16602
Parcel ID: 02.03-05..-089.00-000

------------------------------------------------------------
VALIDATION STATUS: REJECT
Skip Reason: Cemetery detected
------------------------------------------------------------

VISUAL ANALYSIS:
  Structure Present: No (open land)
  Road Access: Yes
  Land Use: CEMETERY
  Lot Shape: Irregular

RED FLAGS:
  [!] Cemetery - Headstones visible in aerial imagery
  [!] Non-investable property type

IMAGES ANALYZED:
  [X] Regrid Aerial Screenshot - Showed grave markers
  [X] Google Maps - Confirmed cemetery location

RECOMMENDATION: SKIP - Do not proceed with further analysis.
This property is a cemetery and has no investment value.

============================================================
```

---

## Integration with Pipeline

### After Regrid Scraping
```
1. Regrid Scraper completes for property
2. Visual Validator Skill is called
3. IF validation_status = 'REJECT':
     - Store rejection reason
     - Skip all further analysis
     - Property marked as non-investable
4. IF validation_status = 'CAUTION':
     - Store caution flags
     - Flag for manual review
     - Optionally continue analysis
5. IF validation_status = 'APPROVED':
     - Store approval
     - Continue to Property Condition Agent (6)
     - Full pipeline proceeds
```

### Batch Validation
```sql
-- Get all properties with Regrid data but no validation
SELECT * FROM get_properties_needing_visual_validation(NULL, 100);

-- Process each property through visual validation
-- Store results using upsert_visual_validation()
```

---

## Best Practices

### DO:
- Check Regrid data FIRST (fastest, already available)
- Use aerial imagery to detect obvious issues
- Verify with Street View when uncertain
- Store ALL findings, even for approved properties
- Document skip reasons clearly for rejected properties

### DON'T:
- Skip Regrid data check (wastes time on Google)
- Approve properties without structure verification
- Reject without clear evidence
- Forget to update properties.visual_validation_status
- Batch validate without logging each decision

---

## Example Validation Session

```
User: "Validate properties for Blair County"

Step 1: Get unvalidated properties
   → Found 50 properties needing validation

Step 2: For each property:

   Property 1: 456 Oak St
   - Regrid data: residential, 0.18 acres, building_sqft=1,200
   - Screenshot: House visible, regular lot
   - Result: APPROVED (score: 92)

   Property 2: 123 Memorial Dr
   - Regrid data: cemetery land use
   - Screenshot: Headstones visible
   - Result: REJECT (cemetery)

   Property 3: 789 Lake View
   - Regrid data: vacant, near water
   - Screenshot: 60% water visible
   - Result: REJECT (water body)

   Property 4: 321 Industrial Blvd
   - Regrid data: commercial zoning
   - Screenshot: Warehouse visible
   - Result: CAUTION (industrial area)

Step 3: Summary
   - Validated: 50 properties
   - Approved: 35 (70%)
   - Caution: 8 (16%)
   - Rejected: 7 (14%)

   Rejected reasons:
   - 3 cemeteries
   - 2 water bodies
   - 1 utility property
   - 1 sliver lot
```

---

## Troubleshooting

### No Regrid Screenshot Available
- Use Google Maps satellite view instead
- Navigate to address, switch to satellite
- Take screenshot for analysis

### Street View Not Available
- Some rural areas lack Street View
- Use satellite imagery only
- Note in findings: "Street View unavailable"

### Uncertain Classification
- Default to CAUTION, not REJECT
- Add detailed notes explaining uncertainty
- Flag for manual review

### Property Not Found on Maps
- Verify address is correct
- Try searching by parcel ID
- Check if new development (may not be mapped)
- Mark as CAUTION with note

---

Your goal: **Filter out non-investable properties early** to save analysis time and protect against acquiring unsuitable land. When in doubt, CAUTION is better than REJECT - let a human review edge cases.
