/**
 * Comprehensive project analysis engine
 * Evaluates projects for strategic fit, profitability, risk, and career impact
 * Provides take/pass recommendations with detailed reasoning
 */

// Strategic criteria weights (total should equal 1.0)
const CRITERIA_WEIGHTS = {
  profitability: 0.25,    // Financial return potential
  strategicFit: 0.20,     // Alignment with expertise and goals
  riskAssessment: 0.20,   // Project and client risk factors
  careerImpact: 0.15,     // Portfolio and skill development value
  clientQuality: 0.10,    // Client professionalism and communication
  timeAlignment: 0.10     // Schedule and capacity fit
};

// Red flag indicators that suggest avoiding the project
const RED_FLAGS = {
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
};

// Green flag indicators that suggest high-quality projects
const GREEN_FLAGS = {
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
};

// Expertise alignment scoring
const EXPERTISE_ALIGNMENT = {
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
};

function analyzeProject(jobData, bidSuggestion) {
  try {
    const analysis = {
      jobData,
      bidSuggestion,
      scores: {},
      flags: { red: [], green: [] },
      overallScore: 0,
      recommendation: '',
      reasoning: [],
      riskFactors: [],
      opportunities: []
    };

    // Calculate individual criterion scores
    analysis.scores.profitability = scoreProfitability(jobData, bidSuggestion);
    analysis.scores.strategicFit = scoreStrategicFit(jobData, bidSuggestion);
    analysis.scores.riskAssessment = scoreRiskAssessment(jobData);
    analysis.scores.careerImpact = scoreCareerImpact(jobData);
    analysis.scores.clientQuality = scoreClientQuality(jobData);
    analysis.scores.timeAlignment = scoreTimeAlignment(jobData);

    // Detect red and green flags
    analysis.flags = detectFlags(jobData);

    // Calculate weighted overall score
    analysis.overallScore = calculateOverallScore(analysis.scores);

    // Generate recommendation
    const recommendation = generateRecommendation(analysis);
    analysis.recommendation = recommendation.decision;
    analysis.reasoning = recommendation.reasoning;
    analysis.riskFactors = recommendation.risks;
    analysis.opportunities = recommendation.opportunities;

    return analysis;

  } catch (error) {
    console.error('Error analyzing project:', error);
    return {
      overallScore: 50,
      recommendation: 'MANUAL_REVIEW',
      reasoning: ['Error in analysis - manual review required'],
      riskFactors: ['Analysis system error'],
      opportunities: []
    };
  }
}

function scoreProfitability(jobData, bidSuggestion) {
  let score = 50; // Base score
  
  // Budget alignment impact
  if (bidSuggestion.budgetAlignment.status === 'good') {
    score += 25;
  } else if (bidSuggestion.budgetAlignment.status === 'high') {
    score += 15;
  } else if (bidSuggestion.budgetAlignment.status === 'over') {
    score -= 20;
  } else if (bidSuggestion.budgetAlignment.status === 'under') {
    score += 10; // Easy win, but lower value
  }

  // Project size impact (higher value projects score better)
  const suggestedValue = bidSuggestion.suggestedFixed || 0;
  if (suggestedValue > 5000) score += 20;
  else if (suggestedValue > 2000) score += 10;
  else if (suggestedValue > 1000) score += 5;
  else if (suggestedValue < 500) score -= 15;

  // Hourly rate quality
  if (bidSuggestion.suggestedHourly > 100) score += 15;
  else if (bidSuggestion.suggestedHourly > 75) score += 10;
  else if (bidSuggestion.suggestedHourly < 50) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function scoreStrategicFit(jobData, bidSuggestion) {
  const template = bidSuggestion.template;
  const jobText = (jobData.description + ' ' + jobData.title).toLowerCase();
  
  let score = 30; // Base score
  
  // Expertise alignment
  const expertiseKeywords = EXPERTISE_ALIGNMENT[template] || [];
  const matchCount = expertiseKeywords.filter(keyword => jobText.includes(keyword)).length;
  const alignmentScore = Math.min(40, matchCount * 8); // Up to 40 points for alignment
  score += alignmentScore;

  // Vertical premium (some verticals are more strategic)
  const premiumVerticals = ['fintech.txt', 'healthcare.txt', 'devops-infrastructure.txt', 'ai-ml.txt'];
  if (premiumVerticals.includes(template)) {
    score += 15;
  }

  // Complexity alignment (prefer medium-high complexity)
  if (bidSuggestion.complexity === 'high') score += 15;
  else if (bidSuggestion.complexity === 'medium') score += 10;
  else score -= 5; // Low complexity isn't strategic

  return Math.max(0, Math.min(100, score));
}

function scoreRiskAssessment(jobData) {
  let score = 70; // Start with good score, deduct for risks
  
  const jobText = (jobData.description + ' ' + jobData.title + ' ' + jobData.experience).toLowerCase();
  
  // Check for red flags
  for (const [category, flags] of Object.entries(RED_FLAGS)) {
    const flagCount = flags.filter(flag => jobText.includes(flag)).length;
    score -= flagCount * 10; // Deduct 10 points per red flag
  }

  // Budget risk assessment
  if (jobData.budgetLow === 'N/A' || !jobData.budgetLow) {
    score -= 15; // No budget info is risky
  }

  // Experience level mismatch risk
  if (jobData.experience && jobData.experience.toLowerCase().includes('entry')) {
    score -= 10; // Entry level projects often have budget constraints
  }

  // Urgency risk
  if (jobText.includes('asap') || jobText.includes('urgent') || jobText.includes('rush')) {
    score -= 15; // Rush jobs are high risk
  }

  return Math.max(0, Math.min(100, score));
}

function scoreCareerImpact(jobData) {
  let score = 40; // Base score
  
  const jobText = (jobData.description + ' ' + jobData.title).toLowerCase();
  
  // Technology relevance (modern tech stack)
  const modernTech = ['react', 'node', 'typescript', 'aws', 'docker', 'kubernetes', 'ai', 'ml', 'graphql'];
  const techScore = modernTech.filter(tech => jobText.includes(tech)).length * 5;
  score += Math.min(25, techScore);

  // Portfolio value indicators
  if (jobText.includes('enterprise') || jobText.includes('scalable') || jobText.includes('millions')) {
    score += 15;
  }

  // Learning opportunity
  if (jobText.includes('new technology') || jobText.includes('innovative') || jobText.includes('cutting edge')) {
    score += 10;
  }

  // Reference quality potential
  if (jobText.includes('established company') || jobText.includes('well-known') || jobText.includes('funded')) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

function scoreClientQuality(jobData) {
  let score = 50; // Base score
  
  const jobText = (jobData.description + ' ' + jobData.title).toLowerCase();
  
  // Professional presentation
  if (jobData.description.length > 200) score += 10; // Detailed description
  if (jobData.description.includes('requirements') || jobData.description.includes('specifications')) {
    score += 15;
  }

  // Green flags for client quality
  for (const flags of Object.values(GREEN_FLAGS)) {
    const flagCount = flags.filter(flag => jobText.includes(flag)).length;
    score += flagCount * 8;
  }

  // Red flags for client quality
  const clientRedFlags = [...RED_FLAGS.client, ...RED_FLAGS.communication];
  const redFlagCount = clientRedFlags.filter(flag => jobText.includes(flag)).length;
  score -= redFlagCount * 12;

  return Math.max(0, Math.min(100, score));
}

function scoreTimeAlignment(jobData) {
  let score = 60; // Base score assuming reasonable timeline
  
  const jobText = (jobData.description + ' ' + jobData.title).toLowerCase();
  
  // Timeline indicators
  if (jobText.includes('flexible timeline') || jobText.includes('reasonable timeline')) {
    score += 20;
  } else if (jobText.includes('asap') || jobText.includes('urgent') || jobText.includes('rush')) {
    score -= 25;
  }

  // Long-term opportunity
  if (jobText.includes('ongoing') || jobText.includes('long-term') || jobText.includes('multiple phases')) {
    score += 15;
  }

  // Workload indicators
  if (jobText.includes('part-time') || jobText.includes('flexible hours')) {
    score += 10;
  } else if (jobText.includes('full-time') || jobText.includes('40+ hours')) {
    score += 5; // Good for income but less flexible
  }

  return Math.max(0, Math.min(100, score));
}

function detectFlags(jobData) {
  const jobText = (jobData.description + ' ' + jobData.title + ' ' + jobData.experience).toLowerCase();
  
  const redFlags = [];
  const greenFlags = [];

  // Detect red flags
  for (const [category, flags] of Object.entries(RED_FLAGS)) {
    for (const flag of flags) {
      if (jobText.includes(flag)) {
        redFlags.push({ category, flag, impact: 'negative' });
      }
    }
  }

  // Detect green flags
  for (const [category, flags] of Object.entries(GREEN_FLAGS)) {
    for (const flag of flags) {
      if (jobText.includes(flag)) {
        greenFlags.push({ category, flag, impact: 'positive' });
      }
    }
  }

  return { red: redFlags, green: greenFlags };
}

function calculateOverallScore(scores) {
  let weightedScore = 0;
  
  for (const [criterion, score] of Object.entries(scores)) {
    const weight = CRITERIA_WEIGHTS[criterion] || 0;
    weightedScore += score * weight;
  }
  
  return Math.round(weightedScore);
}

function generateRecommendation(analysis) {
  const score = analysis.overallScore;
  const redFlagCount = analysis.flags.red.length;
  const greenFlagCount = analysis.flags.green.length;
  
  let decision;
  let reasoning = [];
  let risks = [];
  let opportunities = [];

  // Decision logic
  if (score >= 80 && redFlagCount <= 1) {
    decision = 'TAKE';
    reasoning.push(`Excellent project fit (${score}/100 score)`);
  } else if (score >= 65 && redFlagCount <= 2) {
    decision = 'CONSIDER';
    reasoning.push(`Good project potential (${score}/100 score) but requires careful evaluation`);
  } else if (score >= 50 && redFlagCount <= 3) {
    decision = 'CAUTION';
    reasoning.push(`Marginal project (${score}/100 score) with significant risk factors`);
  } else {
    decision = 'PASS';
    reasoning.push(`Poor project fit (${score}/100 score) with high risk`);
  }

  // Add specific reasoning
  if (analysis.scores.profitability >= 80) {
    reasoning.push('High profit potential');
    opportunities.push('Strong financial return expected');
  } else if (analysis.scores.profitability <= 40) {
    reasoning.push('Low profit potential');
    risks.push('May not meet minimum revenue requirements');
  }

  if (analysis.scores.strategicFit >= 80) {
    reasoning.push('Excellent expertise alignment');
    opportunities.push('Leverages core competencies effectively');
  } else if (analysis.scores.strategicFit <= 40) {
    reasoning.push('Poor strategic fit');
    risks.push('Outside primary area of expertise');
  }

  if (analysis.scores.riskAssessment <= 40) {
    reasoning.push('High risk project');
    risks.push('Multiple red flags detected');
  }

  if (redFlagCount > 0) {
    risks.push(`${redFlagCount} red flag(s) detected: ${analysis.flags.red.map(f => f.flag).join(', ')}`);
  }

  if (greenFlagCount > 0) {
    opportunities.push(`${greenFlagCount} positive indicator(s): ${analysis.flags.green.map(f => f.flag).join(', ')}`);
  }

  return { decision, reasoning, risks, opportunities };
}

module.exports = { analyzeProject };