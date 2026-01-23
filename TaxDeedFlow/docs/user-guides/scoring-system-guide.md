# Investment Scoring System Guide

**Version:** 1.0.0
**Last Updated:** January 2026

## Table of Contents

1. [Overview](#overview)
2. [The 125-Point System](#the-125-point-system)
3. [Scoring Categories](#scoring-categories)
4. [Grade Thresholds](#grade-thresholds)
5. [Calculation Examples](#calculation-examples)
6. [Understanding Your Score](#understanding-your-score)
7. [Data Quality & Confidence](#data-quality--confidence)
8. [Frequently Asked Questions](#frequently-asked-questions)

---

## Overview

The Tax Deed Flow Investment Scoring System is a comprehensive, data-driven methodology for evaluating tax deed property opportunities. It provides a standardized **125-point scale** that objectively assesses properties across five critical investment dimensions, helping you make informed decisions quickly and confidently.

### Key Features

- **Objective & Standardized**: Every property is scored using the same criteria
- **Comprehensive**: Covers all critical aspects of property investment
- **Transparent**: Full breakdown shows exactly how the score was calculated
- **Confidence-Weighted**: Scores indicate data quality and reliability
- **Actionable**: Clear recommendations based on score components

### Who Should Use This System?

- Tax deed investors evaluating potential purchases
- Portfolio managers assessing deal flow
- Analysts conducting due diligence
- Teams coordinating on investment decisions

---

## The 125-Point System

### System Structure

The scoring system is built on a hierarchical structure designed for clarity and precision:

```
┌─────────────────────────────────────────────────┐
│         TOTAL SCORE: 125 POINTS                 │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │   5 CATEGORIES × 25 POINTS = 125 TOTAL   │  │
│  │                                           │  │
│  │   Each Category Contains:                 │  │
│  │   5 COMPONENTS × 5 POINTS = 25 PER CAT   │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Scoring Hierarchy

| Level | Points | Description |
|-------|--------|-------------|
| **Total Score** | 125 | Overall investment quality |
| **Category Score** | 25 | Each of 5 categories |
| **Component Score** | 5 | Each of 5 components per category |

### Equal Weighting Philosophy

All five categories are weighted equally (20% each) because:
- **Location** determines long-term value and marketability
- **Risk** protects your capital from unforeseen losses
- **Financial** ensures the deal structure makes sense
- **Market** validates demand and liquidity
- **Profit** confirms the return justifies the effort

No single factor should dominate your investment decision.

---

## Scoring Categories

### 1. Location (25 Points)

**Category Focus**: Neighborhood quality, accessibility, and amenities

Location determines a property's appeal to future buyers or renters. Strong location scores indicate properties that will be easier to sell or rent at premium prices.

#### Components (5 points each):

| Component | What It Measures | Scoring Criteria |
|-----------|------------------|------------------|
| **Walk Score** | Walkability to daily errands | 90+ = Walker's Paradise<br>70-89 = Very Walkable<br>50-69 = Somewhat Walkable<br>25-49 = Car-Dependent<br><25 = Car Required |
| **Safety (Crime Index)** | Crime rate vs national average | <20 = Very Low Crime<br>20-40 = Low Crime<br>40-60 = Average<br>60-80 = High Crime<br>80+ = Very High Crime |
| **School Quality** | School district rating | 9-10 = Excellent<br>7-8 = Good<br>5-6 = Average<br>3-4 = Below Average<br>1-2 = Poor |
| **Nearby Amenities** | Count of amenities within 1 mile | 40+ amenities = Excellent<br>30-39 = Good<br>20-29 = Average<br>10-19 = Limited<br><10 = Very Limited |
| **Transit Access** | Public transportation availability | 90+ = World-class<br>70-89 = Excellent<br>50-69 = Good<br>25-49 = Some Transit<br><25 = Minimal |

**Data Sources**: WalkScore API, Crime Data APIs, GreatSchools, Geoapify

---

### 2. Risk Assessment (25 Points)

**Category Focus**: Natural hazards, environmental concerns, and title risks

Risk scores are **inverted** — lower risk equals higher points. This category protects you from properties with hidden dangers or complications.

#### Components (5 points each):

| Component | What It Measures | Risk Levels |
|-----------|------------------|-------------|
| **Flood Risk** | FEMA flood zone classification | Zone X (minimal) = 5.0 pts<br>Zone C (moderate) = 3.5 pts<br>Zone A (high) = 2.0 pts<br>Zone V (coastal) = 1.0 pt |
| **Environmental Hazards** | EPA contamination sites nearby | No sites within 1 mile = 5.0 pts<br>Minor sites = 3.5 pts<br>Moderate concern = 2.5 pts<br>Superfund nearby = 1.0 pt |
| **Seismic Risk** | Earthquake probability | Low seismic zone = 5.0 pts<br>Moderate zone = 3.5 pts<br>High zone = 2.0 pts<br>Very high zone = 1.0 pt |
| **Title Issues** | Lien complexity & sale type | Judicial sale (clean) = 4.5 pts<br>Repository (clear) = 4.0 pts<br>Upset (liens may survive) = 3.0 pts<br>Multiple liens = 2.0 pts |
| **Zoning Compliance** | Zoning suitability | Residential = 4.5 pts<br>Mixed-use = 4.0 pts<br>Commercial = 3.5 pts<br>Industrial = 2.5 pts<br>Non-conforming = 1.5 pts |

**Data Sources**: FEMA NFHL, EPA Envirofacts, USGS, County Records

---

### 3. Financial Analysis (25 Points)

**Category Focus**: Tax efficiency, liens, and holding costs

Financial scores evaluate whether the purchase price and cost structure make economic sense relative to the property's value.

#### Components (5 points each):

| Component | What It Measures | Scoring Benchmarks |
|-----------|------------------|-------------------|
| **Price-to-ARV Ratio** | Purchase price vs after-repair value | ≤30% = Excellent (5.0 pts)<br>30-50% = Very Good (4.5 pts)<br>50-70% = Good (3.5 pts)<br>70-85% = Fair (2.5 pts)<br>>85% = Poor (<2.0 pts) |
| **Lien Burden** | Total liens vs assessed value | ≤10% = Minimal (5.0 pts)<br>10-30% = Low (4.0 pts)<br>30-50% = Moderate (3.0 pts)<br>50-75% = High (2.0 pts)<br>>75% = Very High (1.0 pt) |
| **Assessment Accuracy** | Assessed value vs market value | 70-110% = Fair (4.0 pts)<br><70% = Undervalued (4.5 pts)<br>>110% = Overassessed (3.0 pts) |
| **Redemption Risk** | Owner's right to reclaim property | Repository (none) = 5.0 pts<br>Judicial (limited) = 4.0 pts<br>Upset (possible) = 3.0 pts |
| **Holding Costs** | Taxes, insurance, maintenance | ≤5% of price = Very Low (5.0 pts)<br>5-10% = Low (4.0 pts)<br>10-20% = Moderate (3.5 pts)<br>20-35% = High (2.5 pts)<br>>35% = Very High (1.5 pts) |

**Data Sources**: Property Records, Financial Analysis Engine, Comparables

---

### 4. Market Analysis (25 Points)

**Category Focus**: Supply/demand dynamics and appreciation trends

Market scores reveal whether you're buying in a strong market where properties sell quickly at good prices.

#### Components (5 points each):

| Component | What It Measures | Market Indicators |
|-----------|------------------|-------------------|
| **Days on Market** | How quickly properties sell | ≤14 days = Very Hot (5.0 pts)<br>15-30 days = Hot (4.5 pts)<br>31-60 days = Active (3.5 pts)<br>61-90 days = Slower (2.5 pts)<br>>90 days = Cold (1.5 pts) |
| **Price Trend (YoY)** | Year-over-year price change | 3-8% = Healthy (4.5 pts)<br>0-3% = Stable (3.5 pts)<br>8-15% = Strong (4.0 pts)<br>>15% = Bubble risk (3.0 pts)<br>Negative = Declining (<2.5 pts) |
| **Inventory Level** | Active listings in area | ≤50 = Very Low (4.5 pts)<br>51-100 = Low (4.0 pts)<br>101-200 = Moderate (3.5 pts)<br>201-500 = High (2.5 pts)<br>>500 = Very High (2.0 pts) |
| **Absorption Rate** | % of inventory sold monthly | ≥25% = Very Hot (5.0 pts)<br>20-24% = Hot (4.5 pts)<br>15-19% = Healthy (3.5 pts)<br>10-14% = Slow (3.0 pts)<br><10% = Very Slow (2.0 pts) |
| **Competition Level** | Buyer competition intensity | Low (buyer's market) = 4.5 pts<br>Moderate (balanced) = 3.5 pts<br>High (seller's market) = 2.5 pts |

**Data Sources**: Realty APIs, MLS Data, Market Analysis Engine

---

### 5. Profit Potential (25 Points)

**Category Focus**: ROI, cash flow, and exit strategy viability

Profit scores quantify your expected returns and the feasibility of your exit strategy.

#### Components (5 points each):

| Component | What It Measures | Performance Benchmarks |
|-----------|------------------|------------------------|
| **ROI Potential** | Return on investment percentage | ≥100% = Exceptional (5.0 pts)<br>50-99% = Excellent (4.5 pts)<br>30-49% = Good (3.5 pts)<br>15-29% = Moderate (3.0 pts)<br><15% = Low (2.0 pts) |
| **Cash Flow** | Monthly rental income minus expenses | ≥$500/mo = Excellent (5.0 pts)<br>$300-499 = Good (4.0 pts)<br>$100-299 = Fair (3.5 pts)<br>$0-99 = Break-even (2.5 pts)<br>Negative = Loss (<2.0 pts) |
| **Profit Margin** | Net profit as % of total cost | ≥40% = Excellent (5.0 pts)<br>30-39% = Very Good (4.5 pts)<br>20-29% = Good (3.5 pts)<br>10-19% = Fair (3.0 pts)<br><10% = Low (2.0 pts) |
| **Exit Options** | Number of viable exit strategies | SFR (multiple options) = 4.0 pts<br>Multi-family (strong rental) = 4.5 pts<br>Commercial (specialized) = 3.0 pts<br>Vacant land (limited) = 2.5 pts |
| **Time to Profit** | Expected holding period | ≤3 months = Quick flip (5.0 pts)<br>3-6 months = Short-term (4.5 pts)<br>6-9 months = Medium-term (3.5 pts)<br>9-12 months = Standard (3.0 pts)<br>>12 months = Long-term (2.0 pts) |

**Data Sources**: Financial Analysis Engine, Comparables, Market Data

---

## Grade Thresholds

Your total score (0-125 points) converts to a letter grade using the following thresholds:

### Complete Grade Scale

| Grade | Percentage Range | Points Range | Investment Quality | Recommendation |
|-------|-----------------|--------------|-------------------|----------------|
| **A+** | 95.0-100% | 119-125 pts | **Exceptional** | Strong buy - excellent across all categories |
| **A** | 87.0-94.9% | 109-118 pts | **Excellent** | Strong fundamentals, minimal concerns |
| **A-** | 80.0-86.9% | 100-108 pts | **Very Good** | Solid opportunity with few weaknesses |
| **B+** | 75.0-79.9% | 94-99 pts | **Good** | Good investment, some areas need attention |
| **B** | 67.0-74.9% | 84-93 pts | **Above Average** | Solid opportunity with minor concerns |
| **B-** | 60.0-66.9% | 75-83 pts | **Acceptable** | Proceed with standard due diligence |
| **C+** | 55.0-59.9% | 69-74 pts | **Average** | Borderline - evaluate strengths/weaknesses |
| **C** | 47.0-54.9% | 59-68 pts | **Below Average** | Proceed with caution, deep dive required |
| **C-** | 40.0-46.9% | 50-58 pts | **Marginal** | Significant concerns, extra diligence needed |
| **D+** | 35.0-39.9% | 44-49 pts | **Poor** | Multiple red flags, not recommended |
| **D** | 27.0-34.9% | 34-43 pts | **Very Poor** | Significant risks across categories |
| **D-** | 20.0-26.9% | 25-33 pts | **High Risk** | Not recommended for typical investors |
| **F** | 0.0-19.9% | 0-24 pts | **Unacceptable** | Do not invest - critical issues identified |

### How Grade Modifiers Are Calculated

The scoring system uses a two-step process:

1. **Base Grade Assignment** (based on percentage thresholds):
   - A: 80% or higher (100+ points)
   - B: 60-79% (75-99 points)
   - C: 40-59% (50-74 points)
   - D: 20-39% (25-49 points)
   - F: 0-19% (0-24 points)

2. **Modifier Assignment** (based on position within the grade range):
   - Each base grade (except F) spans 20 percentage points
   - Position within range determines modifier:
     - **Top 25%**: `+` modifier (e.g., 95-100% for A → A+)
     - **Middle 40%**: No modifier (e.g., 87-94% for A → A)
     - **Bottom 35%**: `-` modifier (e.g., 80-86% for A → A-)

**Example Calculations:**
- **100 points** = 80.0% → Base grade A → Position 0% in range → **A-**
- **107 points** = 85.6% → Base grade A → Position 28% in range → **A-**
- **110 points** = 88.0% → Base grade A → Position 40% in range → **A**
- **119 points** = 95.2% → Base grade A → Position 76% in range → **A+**

### Visual Grade Distribution

```
Excellent Investment Territory
├─ A+ ████████████████████████████████████████ 95-100%
├─ A  ████████████████████████████████████████ 87-94.9%
└─ A- ████████████████████████████████████████ 80-86.9%

Good Investment Territory
├─ B+ ████████████████████████████████████     75-79.9%
├─ B  ████████████████████████████████████     67-74.9%
└─ B- ████████████████████████████████████     60-66.9%

Proceed with Caution
├─ C+ ████████████████████████████             55-59.9%
├─ C  ████████████████████████████             47-54.9%
└─ C- ████████████████████████████             40-46.9%

High Risk Territory
├─ D+ ████████████████████                     35-39.9%
├─ D  ████████████████████                     27-34.9%
└─ D- ████████████████████                     20-26.9%


Reject
└─ F  ████████                                 0-19.9%
```

---

## Calculation Examples

### Example 1: Grade A- Property (Strong Buy)

**Property Profile**: Single-family home in established neighborhood, judicial tax sale

#### Category Breakdown:

| Category | Components | Points | Max | % | Notes |
|----------|-----------|--------|-----|---|-------|
| **Location** | Walk: 4.2, Safety: 4.5, Schools: 4.8, Amenities: 4.0, Transit: 3.5 | **21.0** | 25 | 84% | Great neighborhood, walkable |
| **Risk** | Flood: 4.5, Enviro: 4.8, Seismic: 5.0, Title: 4.5, Zoning: 4.0 | **22.8** | 25 | 91% | Minimal risks identified |
| **Financial** | P/ARV: 4.5, Liens: 4.0, Assessment: 4.0, Redemption: 4.0, Holding: 3.8 | **20.3** | 25 | 81% | Good deal structure |
| **Market** | DOM: 4.2, Trend: 4.5, Inventory: 4.0, Absorption: 4.3, Competition: 3.5 | **20.5** | 25 | 82% | Active market, healthy trends |
| **Profit** | ROI: 4.5, Cash Flow: 3.8, Margin: 4.2, Exit: 4.0, Time: 4.0 | **20.6** | 25 | 82% | Strong profit potential |

**Total Score**: 105.2 / 125 = **84.2%** = **Grade A-**

**Summary**: Excellent investment with strong fundamentals across all categories. Slight weaknesses in transit access and holding costs, but overall a compelling opportunity with minimal risk and strong profit potential.

**Recommendation**: ✅ **Strong Buy** - Proceed to detailed due diligence

---

### Example 2: Grade C+ Property (Proceed with Caution)

**Property Profile**: Older commercial property in transitioning area, upset sale

#### Category Breakdown:

| Category | Components | Points | Max | % | Notes |
|----------|-----------|--------|-----|---|-------|
| **Location** | Walk: 3.2, Safety: 2.5, Schools: 3.0, Amenities: 3.5, Transit: 2.8 | **15.0** | 25 | 60% | Below-average location factors |
| **Risk** | Flood: 3.5, Enviro: 3.0, Seismic: 4.5, Title: 2.5, Zoning: 3.0 | **16.5** | 25 | 66% | Some environmental concerns |
| **Financial** | P/ARV: 3.0, Liens: 2.5, Assessment: 3.5, Redemption: 3.0, Holding: 2.8 | **14.8** | 25 | 59% | Marginal deal structure |
| **Market** | DOM: 3.0, Trend: 3.5, Inventory: 3.8, Absorption: 3.2, Competition: 3.0 | **16.5** | 25 | 66% | Slower market conditions |
| **Profit** | ROI: 3.5, Cash Flow: 2.8, Margin: 3.2, Exit: 3.0, Time: 3.0 | **15.5** | 25 | 62% | Modest profit potential |

**Total Score**: 78.3 / 125 = **62.6%** = **Grade C+**

**Summary**: Average investment with moderate concerns across multiple categories. Location and financial structure are weakest areas. Commercial zoning limits exit options. Market conditions are acceptable but not strong.

**Recommendation**: ⚠️ **Proceed with Caution** - Conduct extensive due diligence on environmental issues, title complexity, and local market demand for commercial space. Consider passing unless you have specialized expertise in commercial properties.

---

### Example 3: Grade F Property (Do Not Invest)

**Property Profile**: Vacant land in flood zone, multiple title issues, declining market

#### Category Breakdown:

| Category | Components | Points | Max | % | Notes |
|----------|-----------|--------|-----|---|-------|
| **Location** | Walk: 1.0, Safety: 2.0, Schools: 1.5, Amenities: 1.2, Transit: 0.8 | **6.5** | 25 | 26% | Remote, poor infrastructure |
| **Risk** | Flood: 1.0, Enviro: 1.5, Seismic: 3.5, Title: 1.0, Zoning: 2.0 | **9.0** | 25 | 36% | High flood risk, title problems |
| **Financial** | P/ARV: 1.5, Liens: 1.8, Assessment: 2.0, Redemption: 2.5, Holding: 1.5 | **9.3** | 25 | 37% | Poor value proposition |
| **Market** | DOM: 1.5, Trend: 1.0, Inventory: 2.5, Absorption: 1.8, Competition: 2.0 | **8.8** | 25 | 35% | Declining market, low demand |
| **Profit** | ROI: 1.0, Cash Flow: 0.5, Margin: 1.2, Exit: 1.5, Time: 1.5 | **5.7** | 25 | 23% | Minimal profit potential |

**Total Score**: 39.3 / 125 = **31.4%** = **Grade F**

**Summary**: Poor investment with critical issues across all categories. Located in FEMA flood zone A, multiple liens exceed property value, market declining -8% YoY, and projected ROI is negative. No viable exit strategy identified.

**Recommendation**: 🛑 **Do Not Invest** - Pass on this opportunity. Critical risks and poor fundamentals make this unsuitable for typical tax deed investors.

---

## Understanding Your Score

### Score Components Explained

Every property score includes these elements:

1. **Total Score (0-125)**: Your overall investment quality score
2. **Letter Grade (F to A+)**: Quick assessment of opportunity quality
3. **Category Scores (5 × 25 pts)**: Performance in each major dimension
4. **Component Scores (25 × 5 pts)**: Detailed breakdown of individual factors
5. **Confidence Level**: Data quality indicator (Very Low to Very High)
6. **Data Completeness**: Percentage of data fields successfully populated

### Interpreting Category Scores

Each category's score reveals specific insights:

| Category Score | Percentage | Interpretation |
|---------------|------------|----------------|
| **22-25 points** | 88-100% | Excellent - Major strength of this property |
| **19-21 points** | 76-84% | Good - Solid performance, minor concerns |
| **16-18 points** | 64-72% | Average - Meets minimum standards |
| **13-15 points** | 52-60% | Below Average - Requires attention |
| **10-12 points** | 40-48% | Poor - Significant weakness |
| **0-9 points** | 0-36% | Critical - Deal-breaker issue |

### Red Flags to Watch For

Certain patterns in your score indicate elevated risk:

⚠️ **Warning Signs:**
- Any category scoring below 40% (10 points)
- Risk category below 50% (12.5 points)
- Data completeness below 30% in critical categories
- Confidence level "Low" or "Very Low" with high score
- Multiple components scoring 0-1 points

🛑 **Critical Red Flags:**
- Risk category below 30% (7.5 points)
- Two or more categories below 40%
- Total score below 50 points (Grade F)
- Any component at absolute zero with high confidence
- Specific warnings about flood zones, contamination, or title defects

### Using Scores to Make Decisions

#### High Scores (A- to A+): 85-100%
✅ **Action**: Prioritize these properties
- Move quickly to secure the deal
- Conduct standard due diligence
- Verify the top-line data points
- Prepare your maximum bid

#### Good Scores (B- to B+): 70-84%
✅ **Action**: Solid opportunities worth pursuing
- Conduct thorough due diligence
- Focus on lower-scoring categories
- Negotiate based on identified weaknesses
- Have contingency plans for exit strategies

#### Average Scores (C- to C+): 55-69%
⚠️ **Action**: Proceed with extra caution
- Deep dive into all low-scoring components
- Consult specialists (title attorney, surveyor, contractor)
- Build in extra margin of safety
- Consider only if experienced with these property types

#### Low Scores (D- to D+): 40-54%
🛑 **Action**: Likely pass unless...
- You have specialized expertise in the problem areas
- The price is exceptionally low
- You see a value-add angle others don't
- You're comfortable with high-risk investments

#### Failing Scores (F): 0-39%
🛑 **Action**: Pass on these properties
- Too many critical issues to overcome
- Risk/reward ratio is unfavorable
- Better opportunities available
- Preserve capital for stronger deals

---

## Data Quality & Confidence

### Confidence Levels Explained

Every score includes a **confidence level** indicating the reliability of the scoring:

| Confidence | Range | Meaning | Action |
|------------|-------|---------|--------|
| **Very High** | 90-100% | All critical data available from reliable sources | Trust the score, proceed confidently |
| **High** | 75-89% | Most data available, minor gaps | Score is reliable, verify key points |
| **Moderate** | 50-74% | Decent data coverage, some estimates used | Use score as guide, gather more data |
| **Low** | 25-49% | Significant data gaps, many estimates | Score is directional only, deep research needed |
| **Very Low** | 0-24% | Minimal data, mostly defaults/estimates | Score unreliable, start fresh research |

### Data Completeness by Category

Different categories require different data sources:

| Category | Critical Data Fields | Typical Completeness | Data Sources |
|----------|---------------------|----------------------|--------------|
| **Location** | Walk score, crime, schools | 70-85% | Public APIs, Census data |
| **Risk** | Flood zone, environmental, title | 60-80% | FEMA, EPA, county records |
| **Financial** | Purchase price, ARV, liens | 80-95% | Property records, comps |
| **Market** | DOM, inventory, trends | 65-85% | MLS, market analytics |
| **Profit** | ROI, cash flow, exit options | 50-75% | Calculated from above |

### Missing Data Strategies

When data is unavailable, the system uses these strategies:

1. **Default Neutral** (most common): Assign middle score (2.5/5)
   - Used when no reliable estimate available
   - Doesn't penalize or reward unknown factors
   - Lowers confidence score appropriately

2. **Default Conservative**: Assign lower score (1.5/5)
   - Used for risk-related components
   - Assumes caution when data unclear
   - Prevents overestimating risky properties

3. **Estimate from Peers**: Use similar properties' data
   - Used when comparable data exists
   - Maintains reasonable accuracy
   - Medium confidence level

4. **Skip Component**: Omit from calculation
   - Rarely used, only for truly optional factors
   - Adjusts category maximum accordingly
   - Documented in scoring notes

### Improving Your Score Confidence

To increase confidence and data completeness:

1. **Connect Additional Data Sources**
   - Link your WalkScore API key
   - Add MLS access credentials
   - Enable flood zone lookups

2. **Manually Enter Known Information**
   - Input property-specific details
   - Add recent inspection findings
   - Include local market knowledge

3. **Order Professional Reports**
   - Title search and lien verification
   - Environmental site assessment
   - Property appraisal or BPO

4. **Verify Critical Components**
   - Independently confirm flood zone
   - Visit property location
   - Research recent sales

---

## Frequently Asked Questions

### General Questions

**Q: How accurate are these scores?**
A: Score accuracy depends on data quality. With high data completeness (>80%), scores are typically within 5-8 points of a manual expert analysis. The confidence level tells you how much to trust the score.

**Q: Can I adjust the scoring weights?**
A: The system uses equal weighting (20% per category) by design. However, you can prioritize properties by filtering on specific category scores that matter most to your strategy.

**Q: Why did my property score change?**
A: Scores can change when:
- New data becomes available (more complete = more accurate)
- Market data updates (prices, DOM, trends)
- Property information is corrected
- Risk assessments are updated

**Q: Should I invest in any property with an A grade?**
A: A high score indicates a strong opportunity, but you should still:
- Conduct standard due diligence
- Verify the property condition in person
- Confirm title and legal status
- Ensure the deal fits your investment strategy

### Score Interpretation

**Q: What's more important—the total score or category scores?**
A: Both matter. A high total score with one failing category (e.g., high flood risk) is riskier than a moderate score with balanced categories. Review the breakdown, not just the letter grade.

**Q: Why does a property with good location and low risk still have a C grade?**
A: The system requires balance across all five categories. Poor profit potential or weak market conditions will drag down the total score, even if location and risk are excellent.

**Q: How do I compare two properties with similar total scores?**
A: Look at the category breakdown and component details:
- Which property has fewer critical weaknesses?
- Which aligns better with your expertise?
- Which has higher data confidence?
- Which fits your investment timeline and strategy?

### Technical Questions

**Q: What if a property has no comparable sales?**
A: The system will:
- Use default scores for market components
- Lower the confidence level
- Flag this in the warnings section
- Recommend gathering comparable data manually

**Q: Can I override a component score?**
A: You can't directly override scores, but you can:
- Add manual data to improve accuracy
- Review the score breakdown to understand the logic
- Document your own assessment alongside the system score

**Q: How often should I recalculate scores?**
A: Recalculate when:
- New data becomes available
- 30+ days have passed (market conditions change)
- Property details are updated
- You're preparing a bid or making a final decision

**Q: What does "inverted" scoring mean for the Risk category?**
A: Risk components are scored inversely—**lower risk = higher points**. This ensures that safer properties score higher, maintaining consistency with the other categories where "more is better."

---

## Additional Resources

### Related Documentation

- **Investment Strategy Guide**: How to use scores in your deal flow
- **Data Source Documentation**: Understanding where data comes from
- **API Integration Guide**: Connecting external data sources
- **Batch Scoring Tutorial**: Evaluating multiple properties at once

### Getting Help

- **Support**: Contact support@taxdeedflow.com
- **Community Forum**: discuss.taxdeedflow.com
- **Video Tutorials**: youtube.com/taxdeedflow
- **Documentation**: docs.taxdeedflow.com

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | January 2026 | Initial release of scoring system guide |

---

**© 2026 Tax Deed Flow. All rights reserved.**
