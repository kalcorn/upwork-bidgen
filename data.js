// data.js - Market data and business rules (rarely changed)
module.exports = {
  // Project size classification
  projectSizes: {
    small: { min: 0, max: 5000, description: 'Quick fixes, small features, prototypes' },
    medium: { min: 5000, max: 25000, description: 'Standard applications, integrations, MVPs' },
    large: { min: 25000, max: 100000, description: 'Enterprise systems, complex platforms, long-term projects' },
    enterprise: { min: 100000, max: Infinity, description: 'Major enterprise solutions, multi-phase projects' }
  },

  // Base hourly rates by expertise level (fallback if config not available)
  baseRates: {
    senior: { min: 75, target: 95, max: 125 },
    intermediate: { min: 45, target: 65, max: 85 },
    junior: { min: 25, target: 40, max: 55 }
  },

  // Vertical-specific multipliers and keywords
  verticals: {
    multipliers: {
      'fintech.txt': 1.3,        // High compliance, regulatory risk
      'healthcare.txt': 1.25,    // HIPAA compliance, patient safety
      'devops-infrastructure.txt': 1.2, // High-value, business critical
      'ai-ml.txt': 1.15,         // Emerging tech, specialized knowledge
      'legacy-rescue.txt': 1.1,  // Risk mitigation, business continuity
      'corporate-general.txt': 1.0, // Standard enterprise rate
      'saas.txt': 1.0,           // Standard SaaS rate
      'mobile-development.txt': 0.95, // Competitive market
      'ecommerce.txt': 0.9,      // Commoditized, price-sensitive
      'voip-telecom.txt': 1.05,  // Specialized but niche
      'startup-general.txt': 0.8, // Budget-conscious clients
      'misc.txt': 0.85           // Generic positioning
    },
    
    keywords: {
      'fintech.txt': ['finance', 'financial', 'fintech', 'trading', 'bank', 'investment', 'wall street', 'sox', 'finra', 'pci', 'compliance', 'audit', 'regulatory'],
      'healthcare.txt': ['health', 'hipaa', 'ehr', 'emr', 'pharma', 'patient', 'medical', 'clinical', 'fhir', 'hl7', 'telehealth', 'fda'],
      'legacy-rescue.txt': ['refactor', 'legacy', 'modernize', 'technical debt', 'rewrite', 'update old', 'migrate', 'upgrade', 'monolith', 'outdated'],
      'corporate-general.txt': ['enterprise', 'corporate', 'formal', 'reporting', 'compliance', 'b2b', 'scalable', 'integration', 'governance'],
      'startup-general.txt': ['startup', 'mvp', 'lean', 'founder', 'early-stage', 'bootstrap', 'agile', 'rapid', 'prototype'],
      'voip-telecom.txt': ['twilio', 'sip', 'mms', 'sms', 'voip', 'telnyx', 'asterisk', 'phone', 'call', 'voice', 'telephony', 'carrier'],
      'ecommerce.txt': ['ecommerce', 'shopify', 'stripe', 'cart', 'checkout', 'promo', 'sku', 'payment', 'inventory', 'storefront', 'woocommerce'],
      'ai-ml.txt': ['ai', 'ml', 'llm', 'gpt', 'claude', 'gemini', 'vector', 'prompt', 'openai', 'embedding', 'chatbot', 'nlp', 'machine learning'],
      'saas.txt': ['saas', 'multi-tenant', 'dashboard', 'admin', 'subscription', 'stripe', 'portal', 'tenant', 'billing', 'metrics'],
      'mobile-development.txt': ['mobile', 'ios', 'android', 'app', 'swift', 'kotlin', 'react native', 'flutter', 'app store', 'play store'],
      'devops-infrastructure.txt': ['devops', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'infrastructure', 'cloud', 'deployment'],
      'misc.txt': [] // fallback
    }
  },

  // Experience level detection keywords
  experienceKeywords: {
    senior: ['senior', 'lead', 'principal', 'architect', 'expert', '5+ years', '10+ years', 'complex', 'enterprise'],
    intermediate: ['mid-level', 'intermediate', '2-5 years', '3+ years', 'experienced'],
    junior: ['junior', 'entry', 'beginner', '1-2 years', 'learning', 'starter']
  },

  // Project complexity indicators
  complexityIndicators: {
    high: ['enterprise', 'scalable', 'millions of users', 'mission critical', 'real-time', 'high frequency', 'distributed', 'microservices'],
    medium: ['integration', 'api', 'dashboard', 'admin panel', 'reporting', 'automation'],
    low: ['simple', 'basic', 'straightforward', 'landing page', 'static', 'prototype']
  },

  // Risk factors for project analysis
  riskFactors: {
    redFlags: {
      budget: [
        'budget is tight', 'limited budget', 'small budget', 'cheap', 'low budget',
        'minimal budget', 'budget constraints', 'cost-effective solution'
      ],
      timeline: [
        'asap', 'urgent', 'rush', 'yesterday', 'immediately', 'tight deadline',
        'need it done fast', 'quick turnaround', 'emergency'
      ],
      scope: [
        'simple task', 'quick fix', 'small change', 'minor update', 'just need',
        'easy job', 'shouldn\'t take long', 'simple modification'
      ],
      client: [
        'new to upwork', 'first project', 'no reviews', 'payment not verified',
        'need samples first', 'prove yourself', 'trial project'
      ],
      communication: [
        'please bid low', 'best price wins', 'lowest bidder', 'cheapest option',
        'budget conscious', 'looking for deals', 'discount'
      ]
    },
    
    greenFlags: {
      budget: [
        'serious budget', 'well-funded', 'budget approved', 'quality over price',
        'competitive compensation', 'fair budget', 'adequate budget'
      ],
      client: [
        'established company', 'growing team', 'successful business', 'proven track record',
        'enterprise client', 'funded startup', 'payment verified'
      ],
      project: [
        'long-term partnership', 'ongoing work', 'multiple phases', 'scalable solution',
        'enterprise-grade', 'production system', 'mission critical'
      ],
      communication: [
        'detailed requirements', 'clear specifications', 'well-documented',
        'professional presentation', 'thoughtful description'
      ]
    }
  },

  // Expertise alignment scoring
  expertiseAlignment: {
    'fintech.txt': ['finance', 'trading', 'banking', 'payment', 'compliance', 'regulatory', 'sox', 'finra'],
    'healthcare.txt': ['health', 'medical', 'hipaa', 'patient', 'clinical', 'fda', 'ehr', 'emr'],
    'devops-infrastructure.txt': ['aws', 'cloud', 'devops', 'kubernetes', 'docker', 'terraform', 'infrastructure'],
    'ai-ml.txt': ['ai', 'machine learning', 'nlp', 'chatbot', 'openai', 'llm', 'data science'],
    'legacy-rescue.txt': ['legacy', 'modernize', 'refactor', 'migrate', 'upgrade', 'technical debt'],
    'mobile-development.txt': ['mobile', 'ios', 'android', 'app store', 'react native', 'flutter'],
    'ecommerce.txt': ['ecommerce', 'shopify', 'stripe', 'payment', 'checkout', 'inventory'],
    'saas.txt': ['saas', 'subscription', 'multi-tenant', 'dashboard', 'admin', 'billing'],
    'voip-telecom.txt': ['voip', 'twilio', 'sip', 'telephony', 'call', 'sms'],
    'startup-general.txt': ['startup', 'mvp', 'prototype', 'early stage', 'founder'],
    'corporate-general.txt': ['enterprise', 'corporate', 'large scale', 'integration'],
    'misc.txt': []
  },

  // Strategic criteria weights for project analysis
  scoringWeights: {
    profitability: 0.25,    // Financial return potential
    strategicFit: 0.20,     // Alignment with expertise and goals
    riskAssessment: 0.20,   // Project and client risk factors
    careerImpact: 0.15,     // Portfolio and skill development value
    clientQuality: 0.10,    // Client professionalism and communication
    timeAlignment: 0.10     // Schedule and capacity fit
  }
}; 