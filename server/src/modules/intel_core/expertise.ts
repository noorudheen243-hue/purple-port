/**
 * Qix AI Core: Marketing & Business Excellence Knowledge Base
 * Standards for 2024-2025 Performance Marketing.
 */

export const MARKETING_EXPERTISE = {
  MEDIA_ECOSYSTEM: {
    META: {
      role: "Demand Creator",
      strategy: "Advantage+ ecosystem, human-centric UGC-style creatives, broad targeting with AI-driven signals.",
      indicators: ["CTR", "CPM", "Hook Rate", "Frequency"],
      optimization_levers: ["Creative refresh", "Hook variation", "Conversion API (CAPI) check"]
    },
    GOOGLE: {
      role: "Demand Capturer",
      strategy: "Performance Max (PMax), Intent-based clusters, Smart Bidding (tCPA/tROAS), High-quality first-party data signals.",
      indicators: ["CTR", "CPC", "Conversion Rate", "Impression Share"],
      optimization_levers: ["Negative keyword audit", "Search term refinement", "Landing page CRO", "PMax signal refresh"]
    },
    SYNERGY_RATIO: {
      discovery_weight: 0.6, // High-level suggestion for budget allocation to Meta
      intent_weight: 0.4    // High-level suggestion for budget allocation to Google
    }
  },

  UNIT_ECONOMICS: {
    LTV_CAC_RATIO: {
      BASELINE: 3.0,
      SWEET_SPOT: 4.0,
      RISK_ZONE: 2.0,
      CONSERVATIVE_ZONE: 6.0
    },
    BENCHMARKS: {
      AVG_CPL: "Varies by industry, but typically ₹150 - ₹500 for lead gen.",
      CONVERSION_RATE: "Landing page target: 3% - 10%",
      RETENTION_IMPORTANCE: "Cost to retain < 5x Cost to Acquire"
    }
  },

  DAILY_AUDIT_LOGIC: {
    CRITICAL: [
      "Budget Pacing (Over/Under spend > 20%)",
      "Conversion tracking firing parity",
      "Account disapproval alerts"
    ],
    PERFORMANCE: [
      "CPC spike > 50%",
      "CTR drop > 30% (Creative Fatigue)",
      "Low Impression Share (Bid too low)"
    ],
    INSIGHTS: [
      "Search term trends",
      "Highest performing ad set scaling",
      "LTV opportunities via retargeting"
    ]
  },

  PERSONAS: {
    DIRECTOR_OF_PERFORMANCE: `You are the Director of Performance Marketing. You possess 100% awareness of the Meta/Google synergy. 
Meta creates the demand through emotion and frequency; Google captures it through high-intent search. 
Your goal is to ensure the total media mix is profitable and ROI-focused.`,
    
    BUSINESS_ARCHITECT: `You are a Senior Business Consultant. You look at marketing through the lens of unit economics. 
You prioritize LTV:CAC ratios, payback periods, and long-term customer profitability. 
You flag marketing strategies that acquire 'cheap but low-value' customers.`,
    
    TACTICAL_ANALYST: `You are a meticulous Ad Operations specialist. You audit accounts daily for technical efficiency. 
You find 'leakage' in budgets, bad search terms, and creative fatigue before they waste money.`
  }
};
