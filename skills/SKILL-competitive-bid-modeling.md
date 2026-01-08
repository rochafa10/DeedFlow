# Competitive Bid Modeling - Skill

## Overview
Advanced methodologies for calculating optimal bids, predicting competition, estimating win probabilities, and modeling ROI at different bid levels.

## Property Attractiveness Score

### **Scoring Algorithm:**
```javascript
function calculatePropertyAttractiveness(property) {
  let score = 5.0; // Start neutral
  
  // VALUE TIER (weight: 20%)
  if (property.market_value > 200000) {
    score += 2.0; // High value = more attractive
  } else if (property.market_value > 100000) {
    score += 1.0; // Mid value = moderate attraction
  } else if (property.market_value < 30000) {
    score -= 1.0; // Very low value = less attractive
  }
  
  // PROPERTY TYPE (weight: 15%)
  if (property.type === 'single_family') {
    score += 1.5; // Most desirable
  } else if (property.type === 'condo') {
    score -= 1.0; // Less desirable (HOA, appreciation)
  } else if (property.type === 'multi_family') {
    score += 0.5; // Investment property
  } else if (property.type === 'commercial') {
    score -= 0.5; // More complex
  } else if (property.type === 'land') {
    score -= 1.0; // Harder to flip
  }
  
  // CONDITION (weight: 20%)
  if (property.condition_score >= 8) {
    score += 2.0; // Move-in ready
  } else if (property.condition_score >= 6) {
    score += 1.0; // Minor repairs
  } else if (property.condition_score <= 3) {
    score -= 2.0; // Major rehab
  }
  
  // TITLE STATUS (weight: 15%)
  if (property.title_risk_score >= 0.90) {
    score += 1.5; // Clean title
  } else if (property.title_risk_score < 0.50) {
    score -= 2.0; // Title issues
  }
  
  // LOCATION (weight: 15%)
  if (property.location_rating === 'excellent') {
    score += 1.0;
  } else if (property.location_rating === 'poor') {
    score -= 1.0;
  }
  
  // TAX DUE (weight: 10%)
  if (property.tax_due < 10000) {
    score -= 0.5; // Low entry = more competition
  } else if (property.tax_due > 30000) {
    score -= 1.0; // High entry = less competition
  }
  
  // ENVIRONMENTAL (weight: 5%)
  if (property.environmental_risk_score < 0.60) {
    score -= 1.5; // Environmental issues
  }
  
  // Bound score between 1-10
  score = Math.max(1, Math.min(10, score));
  
  return {
    attractiveness_score: score,
    rating: score >= 8 ? 'Very High' :
            score >= 6 ? 'High' :
            score >= 4 ? 'Moderate' :
            score >= 2 ? 'Low' : 'Very Low'
  };
}
```

## Expected Bidders Calculation

### **Competition Prediction:**
```javascript
function predictExpectedBidders(property, historical_data, market_conditions) {
  // Start with historical average
  let expected_bidders = historical_data.average_bidders || 3;
  
  // PROPERTY ATTRACTIVENESS MULTIPLIER
  const attractiveness = calculatePropertyAttractiveness(property);
  const multiplier = attractiveness.score / 5.0;
  expected_bidders *= multiplier;
  
  // MARKET CONDITIONS
  if (market_conditions === 'hot') {
    expected_bidders *= 1.40; // 40% more in hot market
  } else if (market_conditions === 'cold') {
    expected_bidders *= 0.60; // 40% less in cold market
  }
  
  // SEASONALITY
  const month = new Date().getMonth();
  if ([10, 11, 0, 1].includes(month)) { // Nov-Feb
    expected_bidders *= 0.85; // 15% less in winter
  } else if ([4, 5, 6, 7, 8].includes(month)) { // May-Sep
    expected_bidders *= 1.10; // 10% more in summer
  }
  
  // TAX DUE (Entry barrier)
  if (property.tax_due < 10000) {
    expected_bidders *= 1.20; // 20% more (easy entry)
  } else if (property.tax_due > 30000) {
    expected_bidders *= 0.70; // 30% less (high barrier)
  }
  
  // Round to nearest integer
  expected_bidders = Math.round(expected_bidders);
  
  // Determine competition level
  let competition_level;
  if (expected_bidders >= 7) competition_level = 'Very High';
  else if (expected_bidders >= 5) competition_level = 'High';
  else if (expected_bidders >= 3) competition_level = 'Moderate';
  else if (expected_bidders >= 1) competition_level = 'Low';
  else competition_level = 'Very Low';
  
  return {
    expected_bidders,
    competition_level,
    confidence: historical_data.sample_size > 10 ? 'High' : 'Moderate'
  };
}
```

## Maximum Bid Calculation

### **Core Formula:**
```javascript
function calculateMaximumBid(property, target_roi) {
  // Formula: Max Bid = (Market Value - Costs × (1 + Target ROI)) / (1 + Target ROI)
  
  const market_value = property.estimated_market_value;
  
  const total_costs = 
    property.repair_costs +
    property.occupancy_costs +
    property.holding_costs +
    property.transaction_costs +
    property.environmental_costs;
  
  const roi_decimal = target_roi / 100; // 50% → 0.50
  
  const max_bid = (market_value - (total_costs * (1 + roi_decimal))) / (1 + roi_decimal);
  
  return {
    maximum_bid: Math.round(max_bid),
    market_value,
    total_costs,
    target_roi,
    
    verification: {
      total_investment: max_bid + total_costs,
      expected_profit: market_value - (max_bid + total_costs),
      expected_roi: ((market_value - (max_bid + total_costs)) / (max_bid + total_costs)) * 100
    }
  };
}
```

### **Risk-Adjusted Maximum:**
```javascript
function adjustMaxBidForRisk(max_bid, property, risk_tolerance) {
  let adjusted_bid = max_bid;
  
  // Risk tolerance factor
  if (risk_tolerance === 'conservative') {
    adjusted_bid *= 0.85; // Bid 15% less
  } else if (risk_tolerance === 'aggressive') {
    adjusted_bid *= 1.05; // Bid 5% more
  }
  
  // Title risk adjustment
  if (property.title_risk_score < 0.70) {
    adjusted_bid *= 0.90; // 10% discount for title issues
  }
  
  // Condition risk adjustment
  if (property.condition_score < 5) {
    adjusted_bid *= 0.95; // 5% discount for poor condition
  }
  
  // Environmental risk adjustment
  if (property.environmental_risk_score < 0.70) {
    adjusted_bid *= 0.90; // 10% discount for environmental issues
  }
  
  return {
    adjusted_maximum_bid: Math.round(adjusted_bid),
    original_maximum: max_bid,
    risk_discount: max_bid - adjusted_bid,
    risk_discount_percent: ((max_bid - adjusted_bid) / max_bid * 100).toFixed(1) + '%'
  };
}
```

## Recommended Bid Calculation

### **Competition-Based Recommendation:**
```javascript
function calculateRecommendedBid(max_bid, expected_bidders, historical_win_data) {
  let recommended_bid = max_bid * 0.70; // Start at 70% of max
  
  // Adjust for competition level
  if (expected_bidders >= 7) {
    recommended_bid = max_bid * 0.90; // 90% of max (very high competition)
  } else if (expected_bidders >= 5) {
    recommended_bid = max_bid * 0.85; // 85% of max (high competition)
  } else if (expected_bidders >= 3) {
    recommended_bid = max_bid * 0.75; // 75% of max (moderate competition)
  } else if (expected_bidders >= 1) {
    recommended_bid = max_bid * 0.60; // 60% of max (low competition)
  }
  
  // Historical win ratio adjustment (if available)
  if (historical_win_data && historical_win_data.your_wins > 5) {
    const win_ratio = historical_win_data.your_wins / historical_win_data.total_bids;
    
    if (win_ratio < 0.20) {
      // Winning less than 20% - bid more aggressively
      recommended_bid *= 1.10;
    } else if (win_ratio > 0.50) {
      // Winning more than 50% - can bid less
      recommended_bid *= 0.95;
    }
  }
  
  return {
    recommended_bid: Math.round(recommended_bid),
    max_bid,
    bid_percentage: ((recommended_bid / max_bid) * 100).toFixed(1) + '%',
    reasoning: `Competition: ${expected_bidders} bidders expected`
  };
}
```

## Minimum Bid Calculation

### **Platform Minimum + Strategy:**
```javascript
function calculateMinimumBid(property, platform) {
  // Most platforms require minimum: tax owed + fees
  const tax_owed = property.tax_due;
  
  const PLATFORM_MINIMUMS = {
    'Bid4Assets': 1.05,      // Tax × 1.05
    'RealAuction': 1.05,     // Tax × 1.05
    'County_Direct': 1.00,   // Exactly tax owed
    'Auction.com': 1.10      // Tax × 1.10
  };
  
  const platform_multiplier = PLATFORM_MINIMUMS[platform] || 1.05;
  const platform_minimum = tax_owed * platform_multiplier;
  
  // Strategic minimum (show you're serious)
  const strategic_minimum = tax_owed * 1.10; // 10% above tax
  
  return {
    platform_minimum: Math.round(platform_minimum),
    recommended_minimum: Math.round(strategic_minimum),
    reasoning: 'Bid 10% above tax to show serious interest'
  };
}
```

## Win Probability Estimation

### **Probability Model:**
```javascript
function estimateWinProbability(your_bid, property, expected_bidders, historical_data) {
  // Base probability: 50%
  let probability = 0.50;
  
  // BID RATIO vs HISTORICAL AVERAGE
  if (historical_data && historical_data.average_winning_bid) {
    const bid_ratio = your_bid / historical_data.average_winning_bid;
    
    if (bid_ratio >= 1.15) {
      probability = 0.95; // 15%+ above average
    } else if (bid_ratio >= 1.10) {
      probability = 0.85; // 10-15% above average
    } else if (bid_ratio >= 1.05) {
      probability = 0.75; // 5-10% above average
    } else if (bid_ratio >= 1.00) {
      probability = 0.65; // At average
    } else if (bid_ratio >= 0.95) {
      probability = 0.50; // 5% below average
    } else if (bid_ratio >= 0.90) {
      probability = 0.35; // 5-10% below average
    } else if (bid_ratio >= 0.85) {
      probability = 0.20; // 10-15% below average
    } else {
      probability = 0.10; // More than 15% below average
    }
  }
  
  // COMPETITION LEVEL ADJUSTMENT
  if (expected_bidders >= 7) {
    probability *= 0.75; // Very high competition
  } else if (expected_bidders >= 5) {
    probability *= 0.85; // High competition
  } else if (expected_bidders <= 1) {
    probability *= 1.20; // Low competition
  } else if (expected_bidders === 0) {
    probability *= 1.40; // Very low competition
  }
  
  // Cap at 5% minimum, 95% maximum
  probability = Math.max(0.05, Math.min(0.95, probability));
  
  return {
    win_probability: probability,
    win_probability_percent: (probability * 100).toFixed(1) + '%',
    confidence_level: historical_data && historical_data.sample_size > 10 ? 'High' : 'Moderate'
  };
}
```

## ROI Modeling at Different Bid Levels

### **Scenario Analysis:**
```javascript
function modelROIScenarios(property, expected_bidders, historical_data) {
  const max_bid = calculateMaximumBid(property, 50).maximum_bid;
  const recommended_bid = calculateRecommendedBid(max_bid, expected_bidders, historical_data).recommended_bid;
  const min_bid = calculateMinimumBid(property, 'Bid4Assets').recommended_minimum;
  
  const scenarios = [
    { name: 'Minimum Bid', bid: min_bid },
    { name: 'Conservative (60%)', bid: max_bid * 0.60 },
    { name: 'Recommended', bid: recommended_bid },
    { name: 'Aggressive (85%)', bid: max_bid * 0.85 },
    { name: 'Maximum Bid', bid: max_bid }
  ];
  
  return scenarios.map(scenario => {
    const total_investment = scenario.bid + property.total_costs;
    const profit = property.market_value - total_investment;
    const roi = (profit / total_investment) * 100;
    const win_prob = estimateWinProbability(scenario.bid, property, expected_bidders, historical_data);
    const expected_value = profit * win_prob.win_probability;
    
    return {
      scenario: scenario.name,
      bid: Math.round(scenario.bid),
      total_investment: Math.round(total_investment),
      expected_profit: Math.round(profit),
      roi: roi.toFixed(1) + '%',
      win_probability: win_prob.win_probability_percent,
      expected_value: Math.round(expected_value),
      recommendation: getRecommendation(roi, win_prob.win_probability)
    };
  });
}

function getRecommendation(roi, win_prob) {
  if (roi >= 80 && win_prob >= 0.60) return 'EXCELLENT';
  if (roi >= 50 && win_prob >= 0.50) return 'GOOD';
  if (roi >= 30) return 'ACCEPTABLE';
  return 'POOR';
}
```

## Portfolio Bidding Strategies

### **Strategy Comparison:**
```javascript
const PORTFOLIO_STRATEGIES = {
  spray_and_pray: {
    name: 'Spray and Pray',
    description: 'Bid on many properties at low amounts',
    properties_to_bid: 100,
    bid_percentage_of_max: 0.50, // 50% of max
    expected_win_rate: 0.15, // 15%
    expected_wins: 15,
    roi_per_deal: 1.80, // 180% ROI per win
    total_capital_required: '100 × $10K = $1M deposits',
    
    pros: [
      'High ROI per deal',
      'Diversified risk',
      'Some wins guaranteed'
    ],
    
    cons: [
      'Low win rate',
      'High admin overhead',
      'Requires large capital'
    ],
    
    best_for: 'Large capital, high volume, patient investors'
  },
  
  targeted: {
    name: 'Targeted Approach',
    description: 'Bid on select properties competitively',
    properties_to_bid: 25,
    bid_percentage_of_max: 0.75, // 75% of max
    expected_win_rate: 0.60, // 60%
    expected_wins: 15,
    roi_per_deal: 0.80, // 80% ROI per win
    total_capital_required: '25 × $20K = $500K',
    
    pros: [
      'Good win rate',
      'Moderate ROI',
      'Manageable volume'
    ],
    
    cons: [
      'Medium ROI',
      'Still significant capital needed'
    ],
    
    best_for: 'Moderate capital, focused strategy'
  },
  
  premium: {
    name: 'Premium Properties',
    description: 'Bid aggressively on best properties',
    properties_to_bid: 10,
    bid_percentage_of_max: 0.95, // 95% of max
    expected_win_rate: 0.90, // 90%
    expected_wins: 9,
    roi_per_deal: 0.55, // 55% ROI per win
    total_capital_required: '10 × $30K = $300K',
    
    pros: [
      'Very high win rate',
      'Best properties',
      'Lower admin'
    ],
    
    cons: [
      'Lower ROI',
      'Higher cost per property',
      'More competition'
    ],
    
    best_for: 'Limited capital, quality over quantity'
  }
};
```

## Bid Adjustment Factors

### **When to Increase Bid:**
```javascript
const INCREASE_BID_TRIGGERS = {
  must_have_property: {
    adjustment: +0.10, // Add 10%
    reason: 'Strategic importance'
  },
  
  clean_title: {
    adjustment: +0.05,
    reason: 'Lower risk'
  },
  
  move_in_ready: {
    adjustment: +0.10,
    reason: 'Quick flip potential'
  },
  
  hot_neighborhood: {
    adjustment: +0.15,
    reason: 'Strong appreciation'
  },
  
  below_market_entry: {
    adjustment: +0.10,
    reason: 'Tax due very low'
  },
  
  low_competition: {
    adjustment: +0.05,
    reason: 'Less bidders than expected'
  }
};
```

### **When to Decrease Bid:**
```javascript
const DECREASE_BID_TRIGGERS = {
  title_concerns: {
    adjustment: -0.20,
    reason: 'Risk premium'
  },
  
  major_repairs_needed: {
    adjustment: -0.15,
    reason: 'Cost uncertainty'
  },
  
  occupied_property: {
    adjustment: -0.10,
    reason: 'Eviction time/cost'
  },
  
  environmental_risks: {
    adjustment: -0.25,
    reason: 'Liability exposure'
  },
  
  high_competition: {
    adjustment: -0.10,
    reason: 'Let others overpay'
  },
  
  declining_market: {
    adjustment: -0.10,
    reason: 'Value risk'
  }
};
```

## Real-Time Bid Decision Framework

### **During Auction:**
```javascript
function makeRealTimeBidDecision(current_bid, your_max_bid, time_remaining, active_bidders) {
  // STOP conditions
  if (current_bid >= your_max_bid * 0.95) {
    return {
      action: 'STOP',
      reasoning: 'At 95% of maximum bid'
    };
  }
  
  if (current_bid >= your_max_bid && activeROI(current_bid) < 30) {
    return {
      action: 'STOP',
      reasoning: 'ROI too low (<30%)'
    };
  }
  
  // BID conditions
  if (current_bid < your_max_bid * 0.80 && time_remaining < 120) {
    return {
      action: 'BID',
      amount: current_bid + calculateIncrement(current_bid),
      reasoning: 'Well below max and auction closing soon'
    };
  }
  
  if (active_bidders >= 5) {
    return {
      action: 'WAIT',
      reasoning: 'Too many active bidders, wait for them to drop'
    };
  }
  
  if (time_remaining < 300 && current_bid < your_max_bid * 0.90) {
    return {
      action: 'BID',
      amount: current_bid + calculateIncrement(current_bid),
      reasoning: 'Final 5 minutes, still profitable'
    };
  }
  
  // DEFAULT: WAIT
  return {
    action: 'WAIT',
    reasoning: 'Monitor for better timing'
  };
}
```

## Best Practices

**DO:**
✅ Calculate maximum bid BEFORE auction
✅ Never exceed maximum in heat of moment
✅ Model multiple bid scenarios
✅ Consider competition level
✅ Factor in all costs
✅ Account for risk adjustments
✅ Track historical win/loss data

**DON'T:**
❌ Bid emotionally
❌ Assume you'll win at minimum bid
❌ Ignore competition signals
❌ Forget about fees and costs
❌ Chase properties beyond maximum
❌ Bid without profit buffer
❌ Ignore historical auction data
