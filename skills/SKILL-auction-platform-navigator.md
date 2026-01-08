# Auction Platform Navigator - Skill

## Overview
Platform-specific rules, bidding strategies, and navigation guides for major tax sale auction platforms.

## Major Auction Platforms

### **1. Bid4Assets.com**

**Platform Type:** Online Timed Auctions

**Coverage:** National (all states)

**Key Features:**
```javascript
const BID4ASSETS = {
  auction_type: 'online_timed',
  coverage: 'national',
  
  fees: {
    buyers_premium: '5%',
    effective_rate: 5.08,
    example: 'Winning bid $20K → Pay $21,000'
  },
  
  deposit: {
    amount: '$5,000 typical',
    timing: 'Within 24 hours of winning',
    method: 'Wire transfer or credit card'
  },
  
  payment: {
    deadline: '10 days from auction close',
    method: 'Wire transfer',
    penalty: '1% per day late, 10% max'
  },
  
  bidding_mechanics: {
    proxy_bidding: true,
    soft_close: true,
    extension_time: '5 minutes',
    extension_trigger: 'Any bid in final 5 minutes',
    unlimited_extensions: true
  }
};
```

**Bidding Strategy:**
```javascript
const BID4ASSETS_STRATEGY = {
  conservative: {
    approach: 'Wait and Snipe',
    timing: 'Place bid at T-2:00 (2 min before close)',
    proxy: false,
    reasoning: 'Avoid early bidding wars, surprise competition'
  },
  
  moderate: {
    approach: 'Proxy Bid',
    timing: 'Set maximum bid early',
    proxy: true,
    reasoning: 'Hands-off approach if you can\'t watch auction'
  },
  
  aggressive: {
    approach: 'Establish Dominance',
    timing: 'Bid early and high',
    proxy: false,
    reasoning: 'Discourage competition by showing strength'
  }
};
```

**Soft Close Handling:**
```javascript
function handleSoftClose(current_time, close_time, max_bid, current_bid) {
  const time_remaining = close_time - current_time;
  
  if (time_remaining > 300) {
    // More than 5 minutes: Wait
    return { action: 'WAIT', reasoning: 'Too early' };
  }
  
  if (time_remaining <= 120 && time_remaining > 30) {
    // 30 seconds to 2 minutes: Place bid
    if (current_bid < max_bid * 0.80) {
      return {
        action: 'BID',
        amount: current_bid + calculateIncrement(current_bid),
        reasoning: 'Snipe window, still below 80% of max'
      };
    }
  }
  
  if (time_remaining <= 30) {
    // Final 30 seconds: Last chance
    if (current_bid < max_bid) {
      return {
        action: 'BID_MAX',
        amount: max_bid,
        reasoning: 'Final moments, go to maximum'
      };
    } else {
      return {
        action: 'STOP',
        reasoning: 'At maximum bid, do not exceed'
      };
    }
  }
  
  return { action: 'WAIT' };
}
```

### **2. RealAuction.com**

**Platform Type:** Hybrid (Online + Live Webcast)

**Coverage:** PA, FL, TX primarily

**Key Features:**
```javascript
const REALAUCTION = {
  auction_type: 'hybrid_live',
  coverage: 'PA, FL, TX, some other states',
  
  fees: {
    buyers_premium: '0-10% (varies by county)',
    example: 'Blair County PA: 0%, Monroe County PA: 10%',
    effective_rate: 10.00 // Assume 10% for planning
  },
  
  deposit: {
    amount: '10% of winning bid',
    timing: 'Within 24 hours',
    method: 'Wire transfer or certified check'
  },
  
  payment: {
    deadline: '21 days typical',
    method: 'Wire transfer or certified check',
    varies: 'Check county-specific rules'
  },
  
  bidding_mechanics: {
    proxy_bidding: false,
    live_auctioneer: true,
    pace: 'Auctioneer controls',
    format: 'Traditional auction chant'
  }
};
```

**Live Auction Strategy:**
```javascript
const LIVE_AUCTION_STRATEGY = {
  opening_bid: {
    typical: 'Starts at tax owed amount',
    tactic: 'Let auctioneer open, don\'t bid first',
    reasoning: 'See who else is interested'
  },
  
  bidding_psychology: {
    confident_bids: 'Bid decisively, no hesitation',
    body_language: 'Show confidence (even online)',
    intimidation: 'Quick successive bids discourage others',
    timing: 'Bid immediately after others to pressure them'
  },
  
  jump_bid: {
    definition: 'Bid significantly above current bid',
    example: 'Current $15K, jump to $20K',
    when_to_use: 'Multiple bidders, want to end it',
    effectiveness: 'High - often ends competition',
    risk: 'May overpay'
  },
  
  slow_grind: {
    definition: 'Minimum increment each bid',
    example: 'Current $15K, bid $15,500',
    when_to_use: 'Testing competition, conserving budget',
    effectiveness: 'Medium - takes longer',
    risk: 'Competition may outlast you'
  },
  
  calculated_pause: {
    definition: 'Hesitate before bidding',
    when_to_use: 'Approaching your maximum',
    signal: 'Shows you\'re near limit',
    effectiveness: 'Can discourage others',
    danger: 'Auctioneer may close before you bid'
  }
};
```

**Auctioneer Chant Decoding:**
```javascript
const AUCTION_CHANT = {
  'I have $15,000': 'Current bid is $15,000',
  'Now looking for $16,000': 'Next increment is $16,000',
  'Will ya give me $16,000?': 'Asking for $16,000 bid',
  'Going once': 'Warning 1 - bid closing soon',
  'Going twice': 'Warning 2 - final chance',
  'SOLD!': 'Auction complete, highest bidder wins',
  
  fast_chant: 'Auctioneer is rushing - bid ends soon',
  slow_chant: 'Auctioneer waiting for more bids',
  
  tip: 'Raise hand/click bid button BEFORE "going twice"'
};
```

### **3. Auction.com**

**Platform Type:** Online Timed + Live Events

**Coverage:** National

**Key Features:**
```javascript
const AUCTION_COM = {
  auction_type: 'online_timed + live_events',
  coverage: 'national',
  property_types: 'Foreclosures, REO, tax sales',
  
  fees: {
    buyers_premium: '5%',
    effective_rate: 5.08
  },
  
  deposit: {
    amount: '$2,500 typical',
    timing: 'Upon registration',
    earnest_money: 'Refundable if you don\'t win'
  },
  
  payment: {
    deadline: '10-30 days (varies by property)',
    method: 'Wire transfer',
    financing_available: true
  },
  
  unique_features: {
    financing: 'Pre-approved financing available',
    inspections: 'Some properties allow inspections',
    reserves: 'Properties may have reserve prices'
  }
};
```

### **4. County Direct Sales**

**Platform Type:** In-Person or Sealed Bid

**Key Features:**
```javascript
const COUNTY_DIRECT = {
  live_in_person: {
    description: 'Physical attendance at courthouse',
    deposit: 'Cash or certified check',
    payment: 'Same day full payment',
    fees: 'Minimal (filing fees only)',
    competition: 'Can see other bidders',
    strategy: 'Traditional auction tactics apply'
  },
  
  sealed_bid: {
    description: 'Submit bid by deadline, one shot',
    submission: 'Mail or deliver to county',
    deadline: 'Strictly enforced',
    payment: 'Check included with bid',
    result: 'Highest bid wins (blind auction)',
    strategy: 'Bid competitively but conservatively'
  },
  
  repository_sale: {
    description: 'Fixed price, first come first served',
    price: 'Set by county',
    availability: 'Until sold',
    deposit: 'Usually none',
    strategy: 'Act quickly on good deals'
  }
};
```

**Sealed Bid Strategy:**
```javascript
function calculateSealedBid(market_value, tax_owed, estimated_bidders, risk_tolerance) {
  // Optimal bidding theory for sealed auctions
  // Bid = Value × (1 - 1/N) where N = number of bidders
  
  const base_factor = 1 - (1 / estimated_bidders);
  let bid = market_value * base_factor;
  
  // Adjust for must-win scenarios
  if (risk_tolerance === 'must_win') {
    bid *= 1.20; // Bid 20% higher
  } else if (risk_tolerance === 'speculative') {
    bid *= 0.85; // Bid 15% lower
  }
  
  // Ensure minimum bid (tax owed)
  bid = Math.max(bid, tax_owed * 1.10);
  
  return {
    recommended_bid: Math.round(bid),
    win_probability: estimateWinProbability(bid, market_value, estimated_bidders),
    reasoning: 'Based on game theory optimal bidding'
  };
}
```

## Bidding Strategies by Auction Type

### **Timed Online Auctions:**

**Conservative Strategy:**
```javascript
const TIMED_CONSERVATIVE = {
  name: 'Wait and Snipe',
  monitoring: 'Watch auction final 30 minutes',
  first_bid: 'Never bid until final 2 minutes',
  increment: 'Minimum bid increments',
  timing: 'Place bid at T-2:00',
  followup: 'If outbid, re-bid at T-0:30',
  max_bid: 'Go to 80% of maximum',
  
  pros: [
    'Avoid early bidding wars',
    'Surprise competition',
    'Conserve budget'
  ],
  
  cons: [
    'May miss auction if distracted',
    'Soft close can extend indefinitely',
    'Lower win rate'
  ],
  
  best_for: 'Low competition, speculative bids'
};
```

**Moderate Strategy:**
```javascript
const TIMED_MODERATE = {
  name: 'Proxy Bid',
  monitoring: 'Check auction twice daily',
  first_bid: 'Set proxy bid at 75% of max early',
  increment: 'Let proxy system handle',
  timing: 'Set and forget',
  followup: 'Check final hour, increase if needed',
  max_bid: 'Go to 90% of maximum',
  
  pros: [
    'Hands-off approach',
    'Don\'t need to watch constantly',
    'Auto-responds to competition'
  ],
  
  cons: [
    'May reveal your max bid',
    'Can trigger bidding wars',
    'Less control'
  ],
  
  best_for: 'Can\'t watch auction, moderate competition'
};
```

**Aggressive Strategy:**
```javascript
const TIMED_AGGRESSIVE = {
  name: 'Establish Dominance',
  monitoring: 'Monitor constantly final 2 hours',
  first_bid: 'Bid 50% of max immediately',
  increment: 'Large jumps to discourage',
  timing: 'Bid early and often',
  followup: 'Immediately counter any new bids',
  max_bid: 'Go to 95% of maximum',
  
  pros: [
    'Discourages competition',
    'Shows strength',
    'Higher win rate'
  ],
  
  cons: [
    'May trigger bidding war',
    'May overpay',
    'Time intensive'
  ],
  
  best_for: 'Must-win properties, high competition'
};
```

### **Live Auctions:**

**Jump Bid Tactic:**
```javascript
function executeJumpBid(current_bid, typical_increment, max_bid) {
  // Jump bid = Skip several increments
  const jump_amount = typical_increment * 3; // Skip 3 increments
  const jump_bid = current_bid + jump_amount;
  
  if (jump_bid > max_bid) {
    return {
      action: 'STOP',
      reasoning: 'Jump bid would exceed maximum'
    };
  }
  
  return {
    action: 'JUMP_BID',
    amount: jump_bid,
    impact: 'Likely to discourage other bidders',
    risk: 'May overpay if no competition'
  };
}
```

**Incremental Grind:**
```javascript
function executeGrindStrategy(current_bid, increment, max_bid) {
  const next_bid = current_bid + increment;
  
  if (next_bid > max_bid) {
    return {
      action: 'STOP',
      reasoning: 'At maximum bid'
    };
  }
  
  return {
    action: 'BID',
    amount: next_bid,
    impact: 'Test competition willingness',
    benefit: 'Conserves budget'
  };
}
```

## Platform Fee Comparison

```javascript
const PLATFORM_COSTS = {
  'Bid4Assets': {
    buyers_premium: 0.05,
    deposit: 5000,
    effective_cost: 0.0508, // 5.08%
    example: {
      winning_bid: 20000,
      premium: 1000,
      total: 21000
    }
  },
  
  'RealAuction': {
    buyers_premium: 0.10, // Varies by county
    deposit: 2000, // 10% of bid
    effective_cost: 0.10,
    example: {
      winning_bid: 20000,
      premium: 2000,
      total: 22000
    }
  },
  
  'County Direct': {
    buyers_premium: 0.0003, // Minimal filing fees
    deposit: 0,
    effective_cost: 0.0003,
    example: {
      winning_bid: 20000,
      premium: 6,
      total: 20006
    },
    note: 'Cheapest but least convenient'
  }
};
```

## Post-Auction Requirements

**Immediate (Same Day):**
- ✅ Save confirmation email/receipt
- ✅ Note payment deadline clearly
- ✅ Prepare deposit payment
- ✅ Confirm wire instructions

**Within 24 Hours:**
- ✅ Submit required deposit
- ✅ Complete any paperwork
- ✅ Confirm deposit received
- ✅ Set calendar reminders for payment deadline

**Payment Deadline (Usually 10-21 days):**
- ✅ Wire transfer or certified check
- ✅ Include auction number
- ✅ Confirm receipt of payment
- ✅ Save all confirmations

**Post-Payment:**
- ✅ Request deed timeline
- ✅ Schedule deed recording
- ✅ Obtain title insurance quote
- ✅ Plan property access

## Red Flags & Warnings

**Platform Red Flags:**
- ❌ Unlicensed auction companies
- ❌ No physical address
- ❌ Unclear fee structure
- ❌ Poor reviews
- ❌ No customer service

**Auction Red Flags:**
- ❌ Extremely low starting bid (shill bidding)
- ❌ Property description conflicts with title
- ❌ "As-is, no recourse" (understand what this means)
- ❌ Seller reserves right to cancel
- ❌ Unclear payment terms

## Best Practices

**DO:**
✅ Register well before auction (24-48 hours)
✅ Test your internet connection
✅ Have wire transfer ready to go
✅ Set alarms for auction close time
✅ Know your maximum bid
✅ Read all terms and conditions
✅ Verify wire instructions by phone

**DON'T:**
❌ Bid emotionally
❌ Exceed your maximum
❌ Wait until last second (technical issues)
❌ Assume soft close won't extend
❌ Forget about buyer's premium
❌ Miss payment deadline
❌ Wire money without confirming instructions
