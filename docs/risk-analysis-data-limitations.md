# Risk Analysis Data Limitations and Reliability Considerations

**Document Version:** 1.0
**Last Updated:** January 23, 2026
**Task:** subtask-1-3 - Identify data limitations and reliability considerations

---

## Overview

This document catalogs the known limitations, reliability considerations, and update frequencies for all data sources used in the Tax Deed Flow risk analysis system. Understanding these limitations is critical for making informed investment decisions and properly qualifying risk assessments.

The risk analysis system aggregates data from **12 distinct sources** across 8 risk categories. This document provides transparency on data freshness, accuracy, coverage gaps, and reliability ratings for each source.

---

## 1. Data Source Reliability Matrix

### 1.1 Reliability Ratings

| Data Source | Provider | Reliability | Update Frequency | Real-time | Free/Paid |
|-------------|----------|-------------|------------------|-----------|-----------|
| **FEMA Flood Maps** | FEMA | ⭐⭐⭐⭐ High | 1-5 years | No | Free |
| **USGS Earthquake** | USGS | ⭐⭐⭐⭐⭐ Very High | Real-time | Yes | Free |
| **NASA FIRMS (Wildfire)** | NASA | ⭐⭐⭐⭐⭐ Very High | 3-hour lag | Near real-time | Free |
| **NOAA Hurricane** | NOAA | ⭐⭐⭐⭐ High | Daily/Seasonal | No | Free |
| **EPA Superfund** | EPA | ⭐⭐⭐⭐ High | Monthly | No | Free |
| **State DEP Contamination** | State Agencies | ⭐⭐⭐ Moderate | Quarterly | No | Free |
| **USFWS Wetlands Mapper** | US Fish & Wildlife | ⭐⭐⭐⭐ High | 2-5 years | No | Free |
| **EPA Radon Zones** | EPA | ⭐⭐⭐ Moderate | Static (decades) | No | Free |
| **Year Built Data** | County Tax Records | ⭐⭐⭐⭐⭐ Very High | Static | No | Free |
| **Historical Use Records** | Multiple Sources | ⭐⭐ Low-Moderate | Variable | No | Free |
| **Property Tax Records** | County Assessors | ⭐⭐⭐⭐⭐ Very High | Annual | No | Free |
| **Google Maps Platform** | Google | ⭐⭐⭐⭐⭐ Very High | Continuous | Yes | Paid (free tier) |

---

## 2. FEMA Flood Zone Data

### 2.1 Update Frequency
- **Official Cycle:** 1-5 years per county
- **Reality:** Some counties have maps 10+ years old
- **Check for Updates:** FEMA Map Revision Dates available per community

### 2.2 Known Limitations

**Geographic Coverage Gaps:**
- Not all rural areas have detailed maps
- Some areas still use "approximate" Zone A (no base flood elevation)
- Recent development may not be reflected

**Accuracy Issues:**
- Based on historical models, not climate change projections
- Does not account for recent infrastructure changes (levees, dams)
- Local drainage improvements not reflected quickly

**Data Lag:**
- Major flood events trigger remapping (1-3 year delay)
- Appeals process can take 6-12 months
- Preliminary vs. Effective map confusion

### 2.3 Reliability Considerations

✅ **Strengths:**
- Legal standard for flood insurance requirements
- Peer-reviewed hydrological modeling
- Accessible via free API with unlimited requests

⚠️ **Weaknesses:**
- Historical data, not predictive
- Climate change impacts not fully incorporated
- Some communities have outdated maps (pre-2010)

### 2.4 Investor Implications

**Critical Actions:**
1. Always check FEMA map revision date
2. If map is >5 years old, verify with local floodplain administrator
3. For high-value properties, consider private flood risk assessment
4. Budget for potential remapping (Zone X → Zone A can happen)

**Financial Impact:**
- Outdated maps may underestimate risk by 20-40%
- Future remapping could add $1,500-$5,000/year insurance costs

---

## 3. USGS Earthquake Data

### 3.1 Update Frequency
- **Real-time:** Updates within 2-30 minutes of seismic event
- **Quality Review:** Events re-reviewed within 24 hours
- **Historical Archive:** Complete and continuously available

### 3.2 Known Limitations

**Magnitude Threshold:**
- API defaults to M2.5+ (smaller events not included)
- Historical completeness varies by magnitude:
  - M5.0+: Complete since 1900
  - M3.0-4.9: Complete since ~1960
  - M2.5-2.9: Complete since ~1990

**Location Accuracy:**
- Offshore events: ±10-50 km uncertainty
- Deep events: Higher location uncertainty
- Real-time vs reviewed: Position may shift slightly

**Coverage Gaps:**
- Pre-1900 data is sparse and incomplete
- Very deep earthquakes (<150 km) may be missed in older records
- Induced seismicity (fracking) tracking is recent (post-2010)

### 3.3 Reliability Considerations

✅ **Strengths:**
- Scientific gold standard for seismic data
- Real-time updates with high accuracy
- Free, unlimited API access
- Global coverage (not just US)

⚠️ **Weaknesses:**
- Historical data completeness varies
- Does not predict future events
- Magnitude scales changed over time (requires normalization)

### 3.4 Investor Implications

**Risk Assessment Quality:**
- 10-year lookback: Highly reliable for M3.0+
- 30-year lookback: Recommended for major fault zones
- 100+ year lookback: Sparse data, use geological studies instead

**Financial Impact:**
- Earthquake insurance premiums based on probabilistic models, not just historical data
- Recent swarm activity may not be reflected in premium calculations yet

---

## 4. NASA FIRMS Wildfire Data

### 4.1 Update Frequency
- **VIIRS (Recommended):** 3-hour latency
- **MODIS:** 6-hour latency
- **Archive Access:** Data available back to 2000 (MODIS) and 2012 (VIIRS)

### 4.2 Known Limitations

**Detection Thresholds:**
- Minimum fire size: ~100m² for VIIRS, ~1km² for MODIS
- Small prescribed burns may not be detected
- Heavy cloud cover prevents detection

**False Positives:**
- Gas flares (industrial sites)
- Metal roofs reflecting sunlight
- Volcanic thermal anomalies

**Temporal Coverage:**
- Satellites pass over each location 2-4 times per day
- Fire starting and extinguishing between passes may be missed
- Night detection is less reliable

**Seasonal Bias:**
- Better detection during fire season (low humidity, clear skies)
- Winter/wet season detection may be incomplete

### 4.3 Reliability Considerations

✅ **Strengths:**
- Near real-time data (3-hour lag)
- High confidence ratings for most detections
- 100,000 requests/day free tier (very generous)
- Global coverage

⚠️ **Weaknesses:**
- Cannot detect fires under dense canopy
- Does not distinguish prescribed burns from wildfires
- Historical data only goes back to 2000 (MODIS) / 2012 (VIIRS)

### 4.4 Investor Implications

**Use Case Limitations:**
- Detection count is a proxy, not actual wildfire risk
- Properties in designated High Fire Hazard Severity Zones (local data) are better indicators
- Insurance companies use CalFire or state wildfire maps, not NASA data directly

**Financial Impact:**
- NASA data shows activity, but state wildfire maps determine insurance costs
- Recommend cross-referencing FIRMS with state fire hazard maps

**Best Practice:**
- Use FIRMS for 365-day trend analysis
- Validate with state/local fire department hazard classifications
- Budget for CAL FIRE or state-specific fire hazard reports ($0-500)

---

## 5. NOAA Hurricane Data

### 5.1 Update Frequency
- **Active Season:** Real-time updates (hourly during active storms)
- **Historical Tracks:** Updated annually after season ends
- **Storm Surge Maps:** Updated every 3-5 years per region

### 5.2 Known Limitations

**Geographic Coverage:**
- Detailed data only for US coastal areas
- Inland hurricane impacts less documented
- Storm surge maps limited to highest-risk zones

**Historical Completeness:**
- Pre-1950: Sparse and unreliable
- 1950-1990: Improving but still gaps
- Post-1990: Comprehensive satellite-based tracking

**Predictive Limitations:**
- Historical tracks do not predict future hurricane paths
- Climate change impacts on frequency/intensity still uncertain
- Storm surge models are complex and region-specific

**Data Fragmentation:**
- No single unified API for all hurricane data
- Historical tracks: Shapefiles/KML (not REST API)
- Real-time data: RSS feeds and HTML parsing required

### 5.3 Reliability Considerations

✅ **Strengths:**
- Scientific gold standard for tropical cyclone data
- Comprehensive post-1990 satellite coverage
- Well-maintained historical archive

⚠️ **Weaknesses:**
- No unified RESTful API (requires file parsing)
- Historical frequency does not predict future risk
- Storm surge maps require geographic expertise to interpret

### 5.4 Investor Implications

**Implementation Challenges:**
- Requires distance-to-coast calculation (use Google Maps API)
- Hurricane evacuation zones vary by local jurisdiction
- Insurance Wind Pool assignments may not align with NOAA data

**Financial Impact:**
- Coastal properties (<10 mi from coast): Hurricane insurance $2,000-10,000/year
- Distance-based calculation is crude approximation
- Local building codes (wind resistance) affect premiums more than historical data

**Best Practice:**
- Use coastal distance as primary metric
- Cross-reference with state hurricane evacuation zone maps
- For coastal properties, budget for private wind/storm surge risk assessment ($500-2,000)

---

## 6. EPA Superfund Database

### 6.1 Update Frequency
- **Monthly:** NPL (National Priorities List) updates
- **Weekly:** Site status changes posted
- **Real-time:** Major incidents trigger immediate updates

### 6.2 Known Limitations

**Site Classification Delays:**
- Discovery → Preliminary Assessment: 6-12 months
- Preliminary Assessment → NPL Listing: 1-3 years
- NPL Listing → Cleanup Complete: 5-20+ years

**Geographic Precision:**
- Site boundaries may not be fully delineated
- Contamination plumes extend beyond listed boundaries
- Groundwater contamination paths are estimates

**Coverage Gaps:**
- Only includes NPL sites (most severe)
- State Superfund sites not in federal database
- Brownfields and voluntary cleanup sites separate database

**Data Accessibility:**
- No official REST API
- Requires web scraping or manual lookup
- "Where You Live" search tool is imprecise (ZIP code level)

### 6.3 Reliability Considerations

✅ **Strengths:**
- Comprehensive for worst contamination sites
- Legal mandate for tracking and reporting
- Public access to cleanup status and documents

⚠️ **Weaknesses:**
- Long lag between discovery and listing
- Does not include state-level contamination sites
- No API (requires web scraping)

### 6.4 Investor Implications

**Critical Considerations:**
1. **Distance-based risk is crude:** Groundwater flow direction matters more than straight-line distance
2. **Cleanup status is sticky:** "Cleanup complete" doesn't mean contamination-free
3. **Disclosure requirements:** Properties within 1 mile may require buyer disclosure

**Financial Impact:**
- On-site Superfund: Property is worthless (unsellable)
- <0.25 mi: 40% value reduction, difficult to finance
- 0.25-0.5 mi: 20% value reduction, disclosure stigma
- >1 mi: Minimal direct impact

**Best Practice:**
- Always check state DEP contamination databases too
- For properties <1 mi from Superfund site, budget for Phase I ESA ($2,000-5,000)
- Never buy property on or within 0.25 mi of active Superfund site

---

## 7. State DEP Contamination Databases

### 7.1 Update Frequency
- **Varies by State:** Weekly to Quarterly
- **Pennsylvania DEP:** Monthly updates
- **Florida DEP:** Weekly updates
- **Texas TCEQ:** Quarterly updates

### 7.2 Known Limitations

**Inconsistent Data Standards:**
- Each state uses different classifications
- Cleanup standards vary by state
- No unified federal database

**Reporting Delays:**
- Discovery → Database entry: 3-6 months
- Small spills may not be reported
- Private remediation not always tracked

**Coverage Gaps:**
- Voluntary cleanups may not be public
- Pre-1980 contamination often undocumented
- Agricultural contamination (pesticides) rarely included

**Data Quality Issues:**
- Geocoding accuracy varies
- Site status may be outdated
- Closure certifications may not be uploaded

### 7.3 Reliability Considerations

✅ **Strengths:**
- More comprehensive than EPA Superfund alone
- Includes leaking underground storage tanks (LUST)
- State enforcement actions documented

⚠️ **Weaknesses:**
- No standardization across states
- Data quality varies significantly
- No APIs (requires manual lookup or web scraping)

### 7.4 Investor Implications

**High-Risk Historical Uses:**
| Use Type | Contamination Risk | Typical Cleanup Cost | Investor Action |
|----------|-------------------|---------------------|-----------------|
| Gas Station | 80% chance | $50K-500K | REJECT unless clean letter |
| Dry Cleaner | 90% chance | $100K-1M+ | REJECT |
| Auto Repair | 50% chance | $25K-150K | CAUTION - investigate |
| Industrial | 70% chance | Variable | REJECT without Phase I ESA |

**Financial Impact:**
- Phase I ESA required for any former industrial/commercial use ($2,000-5,000)
- Phase II ESA (soil testing) if Phase I finds concerns ($5,000-15,000)
- Cleanup costs can exceed property value

**Best Practice:**
1. Always check state DEP database before bidding
2. For any former commercial use, assume contamination until proven otherwise
3. Google Maps historical imagery can reveal former gas stations (2000s-present)

---

## 8. USFWS Wetlands Mapper

### 8.1 Update Frequency
- **Major Updates:** Every 2-5 years per region
- **Reality:** Some areas have data from 1980s-1990s
- **Check Status:** Metadata shows survey date per area

### 8.2 Known Limitations

**Data Currency:**
- Some regions: Last updated 1980s-1990s
- Wetland boundaries change due to development, drainage, climate
- Wetland restoration projects may not be mapped yet

**Classification Accuracy:**
- Remote sensing accuracy: 85-95% for large wetlands
- Small vernal pools may be missed
- Wetland type classification can be incorrect

**Regulatory Mismatch:**
- USFWS maps are informational, not regulatory
- Army Corps of Engineers makes jurisdictional determinations
- Seasonal wetlands may not be mapped but still regulated

**Seasonal Variability:**
- Wetlands mapper shows typical conditions
- Wet year: More wetlands than mapped
- Dry year: Fewer wetlands than mapped

### 8.3 Reliability Considerations

✅ **Strengths:**
- Best available free nationwide wetlands data
- Accessible via free web mapper
- Covers entire United States

⚠️ **Weaknesses:**
- Data currency varies widely (1980s to present)
- Informational only, not legally binding
- Small wetlands may be missed

### 8.4 Investor Implications

**Critical Understanding:**
- Wetlands Mapper is a **screening tool only**
- Only Army Corps jurisdictional determination is legally binding
- Jurisdictional determination costs $1,000-5,000 and takes 60-90 days

**Financial Impact:**
| Wetland % of Lot | Value Impact | Buildability | Investor Action |
|-----------------|--------------|--------------|-----------------|
| 0% | 0% | 100% | ✅ Proceed |
| 1-25% | -10% | Partial | ⚠️ Verify boundaries |
| 26-50% | -20% | Severely limited | ⚠️ Get jurisdictional determination |
| 51-75% | -40% | Mostly unbuildable | ❌ Reject |
| 76-100% | -70% | Unbuildable | ❌ Reject |

**Best Practice:**
1. Always check Wetlands Mapper before bidding
2. If wetlands shown >10% of lot, budget for wetland delineation survey ($2,000-5,000)
3. For buildable lots with <25% wetlands, budget for mitigation bank credits ($10,000-50,000/acre)

---

## 9. EPA Radon Zone Maps

### 9.1 Update Frequency
- **Static Data:** Last major update in 1993
- **Reality:** Radon zones have not been updated in 30+ years
- **Local Data:** Some states have updated county-level data

### 9.2 Known Limitations

**Extremely Outdated:**
- Based on 1980s-early 1990s data
- Does not reflect new construction practices
- Does not account for soil changes, development

**Geographic Resolution:**
- County-level only (very coarse)
- High variability within counties
- Neighboring properties can have 10x radon difference

**Predictive Limitations:**
- Zone 1 (High): Only 30-50% of homes test high
- Zone 3 (Low): 5-10% of homes still test high
- Only actual testing determines radon levels

### 9.3 Reliability Considerations

✅ **Strengths:**
- County-level screening available for all US counties
- Free and easy to access (EPA website)
- Indicates general geologic radon potential

⚠️ **Weaknesses:**
- 30+ years outdated
- County-level resolution too coarse for property-level decisions
- Does not predict individual property radon levels

### 9.4 Investor Implications

**Testing Requirements:**
- **Zone 1 (High):** Always test ($150-300)
- **Zone 2 (Moderate):** Test if property has basement ($150-300)
- **Zone 3 (Low):** Test if buyer requests ($150-300)

**Financial Impact:**
- Testing Cost: $150-300
- Mitigation (if needed): $1,500-2,500
- Disclosure Requirements: Varies by state (PA requires disclosure)

**Best Practice:**
1. Do not rely on EPA radon zone map for property-level decisions
2. Budget radon testing for all properties with basements ($200)
3. Budget mitigation for all Zone 1 properties with basements ($1,700)

**Reality Check:**
- Radon zones are nearly useless for individual properties
- Only actual radon testing (48-hour or long-term) provides reliable data
- Mitigation success rate: 95%+ (reliable solution)

---

## 10. Year Built Data (Lead Paint & Asbestos)

### 10.1 Update Frequency
- **Static:** Year built does not change
- **Data Source:** County tax assessor records
- **Reliability:** 99%+ accurate

### 10.2 Known Limitations

**Year Built Accuracy:**
- Most counties: Very accurate (from building permits)
- Rural areas: May be estimated
- Historic properties: Estimated from deed records

**Lead Paint Assumptions:**
- 1978 cutoff is federal ban date
- Some states banned earlier (e.g., MA banned 1971)
- Homes built 1976-1978 may have used up existing lead paint stock

**Asbestos Assumptions:**
- Common 1920-1980, peak 1950-1970
- Continued use in some products through 1990s
- Vermiculite insulation (Zonolite) used until 1990

### 10.3 Reliability Considerations

✅ **Strengths:**
- Year built is highly reliable data point
- Lead paint likelihood well-studied by HUD/CDC
- Asbestos use patterns well-documented

⚠️ **Weaknesses:**
- Year built is necessary but not sufficient (remodeling matters)
- Lead paint likelihood ≠ presence (testing required)
- Asbestos presence depends on materials used, not just year

### 10.4 Investor Implications

**Lead Paint Risk by Year Built:**
| Year Built | Lead Paint Likelihood | Testing Cost | Abatement Cost | Investor Action |
|------------|---------------------|--------------|----------------|-----------------|
| Pre-1950 | 87% | $400 | $8,000-15,000 | Budget $10K |
| 1950-1959 | 69% | $400 | $8,000-15,000 | Budget $10K |
| 1960-1969 | 55% | $400 | $8,000-15,000 | Budget $5K |
| 1970-1977 | 24% | $400 | $8,000-15,000 | Disclosure only |
| 1978+ | <1% | N/A | N/A | ✅ None |

**Asbestos Risk by Year Built:**
| Year Built | Asbestos Likelihood | Testing Cost | Abatement Cost | Investor Action |
|------------|-------------------|--------------|----------------|-----------------|
| Pre-1920 | Low | $600 | $20,000+ | Budget $600 testing |
| 1920-1980 | Moderate-High | $600 | $20,000+ | Budget $20K |
| 1981-1990 | Low-Moderate | $600 | $20,000+ | Budget $5K |
| 1991+ | Very Low | N/A | N/A | ✅ None |

**Federal Disclosure Requirements:**
- Pre-1978: Lead-based paint disclosure required by law
- Asbestos: No federal disclosure requirement (state laws vary)

**Best Practice:**
1. For pre-1978 homes, always budget lead paint testing ($400)
2. For 1920-1980 homes, budget asbestos testing ($600)
3. Do not disturb suspected lead paint or asbestos without testing (liability)

---

## 11. Historical Property Use Records

### 11.1 Update Frequency
- **Highly Variable:** Depends on source
- **County Records:** Updated when use changes (permit required)
- **Commercial Databases:** Updated quarterly/annually
- **Historical Imagery:** Google Earth (2000s-present)

### 11.2 Known Limitations

**Data Availability:**
- Urban areas: Good records back to 1950s-1960s
- Rural areas: Limited pre-1980 records
- Small commercial uses: May not be documented

**Source Fragmentation:**
- No single database of historical uses
- Requires checking multiple sources:
  - County assessor (current use)
  - Building permits (past modifications)
  - City directories (pre-digital era businesses)
  - Sanborn Fire Insurance Maps (1890s-1950s)
  - Google Earth historical imagery (2000s-present)
  - Environmental databases (gas stations, dry cleaners)

**Classification Issues:**
- "Commercial" could mean office or gas station (big difference)
- Mixed-use properties hard to classify
- Underground storage tanks may not be documented

### 11.3 Reliability Considerations

✅ **Strengths:**
- Gas stations, dry cleaners usually well-documented (regulatory requirements)
- Google Earth provides visual confirmation (2000s-present)
- Environmental databases flag high-risk uses

⚠️ **Weaknesses:**
- Pre-2000 historical use requires manual research
- Small operations may not be documented
- Property use between owners may not be recorded

### 11.4 Investor Implications

**Red Flag Historical Uses:**
| Use Type | Contamination Risk | Detection Method | Investor Action |
|----------|-------------------|------------------|-----------------|
| Gas Station | Very High (80%) | DEP databases, Google Earth, UST records | REJECT without clean letter |
| Dry Cleaner | Extreme (90%) | DEP databases, city directories | REJECT |
| Auto Repair | High (50%) | Business licenses, Google Earth | Phase I ESA required |
| Industrial | High (70%) | Zoning records, permits | Phase I ESA required |
| Agricultural (orchards) | Moderate (30%) | Historical imagery, aerial photos | Soil testing recommended |

**Research Tools:**
1. **Free:**
   - Google Earth Historical Imagery (back to ~2000)
   - County Assessor website (current use)
   - State DEP contamination databases

2. **Paid ($50-500):**
   - Historical Sanborn Maps (pre-1950s)
   - Environmental Data Resources (EDR) Radius Report ($200-500)
   - Lexis-Nexis property records

**Best Practice:**
1. Always check Google Earth historical imagery back to earliest available (~2000)
2. Any evidence of gas station, dry cleaner, industrial use → REJECT or require Phase I ESA
3. For high-value properties (>$100K), consider EDR report ($200-500)

**Financial Impact:**
- Phase I ESA: $2,000-5,000
- Phase II ESA (if Phase I finds concerns): $5,000-15,000
- Cleanup costs: $25,000 to $1M+ depending on contamination type

---

## 12. Google Maps Platform (Geocoding & Distance)

### 12.1 Update Frequency
- **Maps:** Continuous updates (daily)
- **Street View:** Updated every 1-3 years per area
- **Geocoding:** Real-time
- **Places:** Continuously updated

### 12.2 Known Limitations

**Geocoding Accuracy:**
- Urban areas: ±10-50 meters (rooftop accuracy)
- Rural areas: ±100-500 meters (interpolated)
- New construction: May not be in database yet (3-6 month lag)

**Distance Calculations:**
- Straight-line distance (not walking/driving distance)
- Does not account for elevation changes
- Coastal distance calculation requires careful implementation

**Rate Limits & Costs:**
| Service | Free Tier | Overage Cost |
|---------|-----------|--------------|
| Geocoding | 25,000/month | $0.005/request |
| Distance Matrix | 25,000/month | $0.005/request |
| Static Maps | 25,000/month | $0.002/request |
| Street View | 25,000/month | $0.007/request |

### 12.3 Reliability Considerations

✅ **Strengths:**
- Industry gold standard for geocoding
- Very high accuracy in urban/suburban areas
- Continuous updates from multiple sources

⚠️ **Weaknesses:**
- Rural property accuracy can be poor (±500m)
- Costs can escalate quickly above free tier
- New addresses may not geocode correctly

### 12.4 Investor Implications

**Geocoding Failures:**
- ~2-5% of rural properties fail to geocode
- New subdivisions may not be in Google database yet
- Fallback: Use lat/lng from county GIS (usually available)

**Cost Management:**
- At scale (1,000+ properties/month), geocoding costs $25-50/month
- Implement caching to avoid redundant API calls
- Use batch geocoding when possible

**Best Practice:**
1. Cache all geocoding results in database
2. For failed geocodes, use county parcel centroid coordinates
3. Monitor API usage to avoid surprise charges

---

## 13. Summary: Data Quality Tiers

### 13.1 Very High Reliability (⭐⭐⭐⭐⭐)
**Can be fully trusted for investment decisions:**
- USGS Earthquake Data (real-time, scientific gold standard)
- NASA FIRMS Wildfire Data (3-hour lag, satellite-verified)
- Year Built Data (static, highly accurate)
- Property Tax Records (legal records, authoritative)
- Google Maps Geocoding (industry standard)

**Investor Action:** Use as-is, minimal verification needed

---

### 13.2 High Reliability (⭐⭐⭐⭐)
**Generally reliable, but verify for high-value properties:**
- FEMA Flood Maps (1-5 year lag, check revision date)
- NOAA Hurricane Data (comprehensive post-1990)
- EPA Superfund Database (monthly updates, comprehensive for NPL sites)
- USFWS Wetlands Mapper (2-5 year lag, verify with survey)

**Investor Action:** Check data currency, verify for properties >$100K value

---

### 13.3 Moderate Reliability (⭐⭐⭐)
**Use for screening only, verification required:**
- State DEP Contamination Databases (variable quality across states)
- EPA Radon Zone Maps (30+ years outdated, county-level only)

**Investor Action:** Use for initial screening, always verify with testing or updated sources

---

### 13.4 Low Reliability (⭐⭐)
**Use with extreme caution, high verification required:**
- Historical Property Use Records (fragmented, incomplete)
- Wetlands Mapper for pre-1990s data (very outdated)

**Investor Action:** Treat as preliminary only, require environmental assessments for any concerns

---

## 14. Critical Update Frequency Issues

### 14.1 Real-Time Data (Updated Continuously)
✅ **USGS Earthquake:** 2-30 minute lag
✅ **NASA FIRMS Wildfire:** 3-hour lag
✅ **Google Maps:** Continuous
✅ **NOAA Hurricane (active storms):** Hourly

**Investor Benefit:** Can make decisions based on current conditions

---

### 14.2 Frequently Updated (Daily to Monthly)
✅ **EPA Superfund:** Monthly updates
✅ **NOAA Hurricane (historical):** Annual updates
⚠️ **State DEP:** Weekly to Quarterly (varies by state)

**Investor Benefit:** Reasonably current for most decision-making

---

### 14.3 Infrequently Updated (1-5 Years)
⚠️ **FEMA Flood Maps:** 1-5 years (some areas 10+ years)
⚠️ **USFWS Wetlands Mapper:** 2-5 years (some areas 30+ years)
⚠️ **NOAA Storm Surge Maps:** 3-5 years

**Investor Risk:** Data may not reflect current conditions

**Mitigation Strategy:**
1. Check data revision date
2. For data >5 years old, verify with local sources
3. Budget for updated surveys if needed

---

### 14.4 Static/Rarely Updated (Decades)
❌ **EPA Radon Zone Maps:** Last updated 1993 (33 years ago!)
✅ **Year Built Data:** Static (does not change)

**Investor Risk:** Radon maps are nearly useless for property-level decisions

**Mitigation Strategy:**
1. Radon: Always test, never rely on zone maps ($200 cost)
2. Year Built: Highly reliable, use with confidence

---

## 15. Coverage Gaps by Risk Type

### 15.1 Flood Risk
**Good Coverage:**
- Urban/suburban areas: Excellent detailed maps
- Coastal areas: High-resolution flood zones

**Poor Coverage:**
- Small streams: Often approximate zones only
- Recent development: May not be on maps yet (1-5 year lag)
- Alluvial fans (Southwest): Complex, often not well-mapped

**Investor Action:** For rural or recently developed properties, verify flood zone with local floodplain administrator

---

### 15.2 Earthquake Risk
**Good Coverage:**
- All US regions: Complete M2.5+ data (post-1990)
- Known fault zones: Well-studied and documented

**Poor Coverage:**
- Pre-1900 historical data: Incomplete
- Induced seismicity (fracking): Only tracked since ~2010

**Investor Action:** Use 10-year lookback for reliable risk assessment

---

### 15.3 Wildfire Risk
**Good Coverage:**
- Western US: Excellent coverage (most fire activity)
- Fire season: Very frequent satellite passes

**Poor Coverage:**
- Eastern US: Fewer fires, less detection practice
- Heavily forested areas: Fires under canopy not detected
- Small prescribed burns: Often missed

**Investor Action:** Cross-reference NASA FIRMS with state fire hazard severity zone maps

---

### 15.4 Hurricane Risk
**Good Coverage:**
- US coastal areas: Excellent historical track data (post-1950)
- Evacuation zones: Well-defined for high-risk areas

**Poor Coverage:**
- Inland hurricane impacts: Less documented
- Pre-1950 data: Sparse and unreliable
- Storm surge: Only detailed maps for highest-risk zones

**Investor Action:** Use coastal distance as primary metric, verify evacuation zone with local emergency management

---

### 15.5 Contamination Risk
**Good Coverage:**
- NPL Superfund sites: Comprehensive tracking
- Leaking underground storage tanks: Most states track well
- Dry cleaners, gas stations: Regulatory records available

**Poor Coverage:**
- Pre-1980 contamination: Often undocumented
- Small commercial operations: May not be in databases
- Agricultural contamination: Rarely tracked

**Investor Action:** For any former commercial/industrial use, assume contamination until proven otherwise (Phase I ESA)

---

### 15.6 Wetlands
**Good Coverage:**
- Large wetlands (>1 acre): Well-mapped
- Coastal wetlands: High-resolution data

**Poor Coverage:**
- Small vernal pools: Often missed
- Recently created/restored wetlands: May not be mapped yet (2-5 year lag)
- Prairie potholes: Variable mapping quality

**Investor Action:** Any visible wetlands on satellite imagery → Get wetland delineation survey ($2,000-5,000)

---

## 16. Free vs. Paid Data Sources

### 16.1 100% Free (No API Key Required)
✅ **FEMA Flood Maps:** Unlimited, no authentication
✅ **USGS Earthquake:** Unlimited, no authentication
✅ **NOAA Hurricane:** Unlimited, no authentication
✅ **EPA Superfund:** Free web access (no API)
✅ **State DEP:** Free web access (no standardized API)
✅ **USFWS Wetlands Mapper:** Free web access
✅ **EPA Radon Zones:** Free web access

**Total API Costs for These Sources:** $0/month

---

### 16.2 Free with API Key (Generous Free Tier)
✅ **NASA FIRMS:** 100,000 requests/day free
- At 1,000 properties/month: $0 cost
- Only exceed free tier if processing 100,000+ properties/day

**Total API Costs:** $0/month for typical usage

---

### 16.3 Paid (Free Tier Available)
⚠️ **Google Maps Platform:**
- Geocoding: 25,000/month free, then $0.005/request
- At 1,000 properties/month: $0 (under free tier)
- At 50,000 properties/month: $125/month ($0.005 × 25,000 overage)

**Total API Costs:**
- Small scale (<25,000 properties/month): $0/month
- Medium scale (50,000 properties/month): ~$125/month
- Large scale (100,000 properties/month): ~$375/month

---

### 16.4 Environmental Assessments (Paid Services)
These are NOT API-based, but important cost considerations:

| Service | Cost Range | When Required |
|---------|-----------|---------------|
| Phase I Environmental Site Assessment | $2,000-5,000 | Any former commercial/industrial use |
| Phase II ESA (Soil Testing) | $5,000-15,000 | Phase I identifies concern |
| Wetland Delineation Survey | $2,000-5,000 | Wetlands >10% of lot |
| Jurisdictional Determination (Wetlands) | $1,000-5,000 | Wetlands present, need permit |
| Flood Elevation Certificate | $500-1,500 | Flood zone, need insurance quote |
| Radon Testing | $150-300 | All homes with basements (Zone 1) |
| Lead Paint Inspection | $400-600 | Pre-1978 homes |
| Asbestos Survey | $600-1,200 | 1920-1980 homes, pre-renovation |

**Investor Impact:**
- Low-risk residential property: $0-500 additional assessments
- Moderate-risk property (pre-1978, wetlands): $1,000-3,000 additional assessments
- High-risk property (former commercial, flood zone): $5,000-15,000 additional assessments

---

## 17. Recommendations for Investors

### 17.1 Always Trust (High Confidence)
✅ USGS Earthquake data (real-time, scientific)
✅ NASA FIRMS wildfire data (satellite-verified)
✅ Year built data (static, accurate)
✅ Google Maps geocoding (industry standard)

**No additional verification needed**

---

### 17.2 Trust But Verify (Moderate Confidence)
⚠️ FEMA Flood Maps → Check revision date, verify if >5 years old
⚠️ EPA Superfund → Cross-reference with state DEP databases
⚠️ USFWS Wetlands Mapper → Verify with visual inspection or survey
⚠️ NOAA Hurricane → Verify coastal distance calculation

**Verification needed for high-value properties (>$100K)**

---

### 17.3 Never Trust Alone (Low Confidence)
❌ EPA Radon Zone Maps → Always test, never rely on zone alone ($200)
❌ Historical property use → Always verify with Phase I ESA for commercial uses ($2,000-5,000)
❌ State DEP data quality → Varies by state, always cross-check

**Always require additional verification**

---

### 17.4 Cost-Benefit Decision Framework

**For properties <$50K total investment:**
- Use free data sources only
- Accept moderate data limitations
- Budget $500 for critical tests (radon, lead paint if pre-1978)

**For properties $50K-100K total investment:**
- Use all free data sources
- Verify FEMA flood map revision date
- Budget $1,000-2,000 for assessments (wetland visual check, radon, lead)

**For properties >$100K total investment:**
- Use all data sources
- Verify all moderate-confidence sources
- Budget $3,000-10,000 for professional assessments:
  - Phase I ESA if any commercial history
  - Wetland delineation if wetlands >10%
  - Flood elevation certificate if in flood zone
  - Lead/asbestos/radon testing for older homes

---

## 18. Data Quality Improvement Roadmap

### 18.1 Immediate (No Cost)
1. ✅ Always check FEMA map revision dates
2. ✅ Cross-reference EPA Superfund with state DEP
3. ✅ Use Google Earth historical imagery for former uses
4. ✅ Cache all API results to avoid redundant calls

---

### 18.2 Short-Term (Low Cost, <$500/property)
1. ⚠️ Radon testing for all Zone 1 properties with basements ($200)
2. ⚠️ Lead paint testing for pre-1950 homes ($400)
3. ⚠️ Visual wetland inspection (DIY or local surveyor, $0-500)

---

### 18.3 Medium-Term (Moderate Cost, $1,000-5,000/property)
1. ⚠️ Phase I ESA for any former commercial/industrial use
2. ⚠️ Wetland delineation survey if wetlands >10% of lot
3. ⚠️ Flood elevation certificate if in flood zone (for insurance quotes)
4. ⚠️ Private flood risk assessment if FEMA map >10 years old

---

### 18.4 Long-Term (High Cost, >$5,000/property)
1. ❌ Phase II ESA (soil testing) if Phase I identifies concerns
2. ❌ Jurisdictional wetland determination (Army Corps)
3. ❌ Full environmental audit for high-value properties (>$200K)

---

## 19. Conclusion

### Key Takeaways

1. **Most Data Sources Are Free:** All primary risk APIs (FEMA, USGS, NASA, NOAA, EPA) are free with unlimited or generous rate limits

2. **Data Quality Varies Widely:** From real-time earthquake data (⭐⭐⭐⭐⭐) to 30-year-old radon maps (⭐⭐)

3. **Update Frequency Is Critical:** FEMA flood maps can be 10+ years outdated, radon zones 33 years old

4. **Coverage Gaps Exist:** Rural areas, small wetlands, pre-1980 contamination often poorly documented

5. **Verification Costs Add Up:** Professional assessments range from $200 (radon test) to $15,000 (Phase II ESA)

6. **Risk-Based Verification:** Low-value properties (<$50K) → minimal verification; High-value (>$100K) → comprehensive verification

### Investment Decision Framework

| Property Value | Data Sources | Verification Level | Budget for Assessments |
|----------------|--------------|-------------------|----------------------|
| <$50K | Free APIs only | Minimal | $0-500 |
| $50K-100K | All free APIs | Moderate | $1,000-2,000 |
| $100K-200K | All APIs + targeted assessments | High | $3,000-7,000 |
| >$200K | Comprehensive | Very High | $7,000-15,000 |

### Final Recommendation

**Use automated API-based risk analysis for initial screening (cost: $0), then selectively invest in professional assessments based on property value and identified risk flags.**

This approach balances cost-effectiveness with risk management, ensuring investors make informed decisions without overspending on low-value properties.

---

**Document End**

*This document provides comprehensive transparency on data limitations and reliability for all 12 risk analysis data sources. Investors should use this guide to calibrate their confidence in automated risk assessments and budget appropriately for verification.*
