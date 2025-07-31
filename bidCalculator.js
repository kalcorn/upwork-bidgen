const { recommendTemplate } = require('./templateClassifier');

/**
 * Intelligent bid calculation based on multiple factors
 * Considers market positioning, project complexity, client budget, and risk factors
 */

// Base hourly rates by expertise level and project type
const BASE_RATES = {
  senior: { min: 75, target: 95, max: 125 },
  intermediate: { min: 45, target: 65, max: 85 },
  junior: { min: 25, target: 40, max: 55 }
};

// Vertical-specific multipliers based on market demand and complexity
const VERTICAL_MULTIPLIERS = {
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
};

// Experience level detection keywords
const EXPERIENCE_KEYWORDS = {
  senior: ['senior', 'lead', 'principal', 'architect', 'expert', '5+ years', '10+ years', 'complex', 'enterprise'],
  intermediate: ['mid-level', 'intermediate', '2-5 years', '3+ years', 'experienced'],
  junior: ['junior', 'entry', 'beginner', '1-2 years', 'learning', 'starter']
};

// Project complexity indicators
const COMPLEXITY_INDICATORS = {
  high: ['enterprise', 'scalable', 'millions of users', 'mission critical', 'real-time', 'high frequency', 'distributed', 'microservices'],
  medium: ['integration', 'api', 'dashboard', 'admin panel', 'reporting', 'automation'],
  low: ['simple', 'basic', 'straightforward', 'landing page', 'static', 'prototype']
};

function calculateBidSuggestion(jobData) {
  try {
    // Parse budget range
    const budgetLow = parseFloat(jobData.budgetLow?.replace(/[^0-9.]/g, '')) || 0;
    const budgetHigh = parseFloat(jobData.budgetHigh?.replace(/[^0-9.]/g, '')) || budgetLow;
    const budgetMid = budgetLow > 0 ? (budgetLow + budgetHigh) / 2 : budgetHigh;

    // Detect project characteristics
    const template = recommendTemplate(jobData.description + ' ' + jobData.title);
    const experienceLevel = detectExperienceLevel(jobData);
    const complexity = detectComplexity(jobData);
    const projectType = detectProjectType(jobData);

    // Calculate base rate
    const baseRate = BASE_RATES.senior; // Using senior rates as default positioning
    const verticalMultiplier = VERTICAL_MULTIPLIERS[template] || 1.0;
    
    // Apply complexity adjustment
    const complexityMultiplier = getComplexityMultiplier(complexity);
    
    // Calculate suggested hourly rate
    const suggestedHourly = Math.round(baseRate.target * verticalMultiplier * complexityMultiplier);
    const minHourly = Math.round(baseRate.min * verticalMultiplier * complexityMultiplier);
    const maxHourly = Math.round(baseRate.max * verticalMultiplier * complexityMultiplier);

    // Estimate project hours and fixed bid
    const estimatedHours = estimateProjectHours(jobData, complexity);
    const suggestedFixed = Math.round(suggestedHourly * estimatedHours);

    // Budget alignment analysis
    const budgetAlignment = analyzeBudgetAlignment(suggestedFixed, budgetLow, budgetHigh);

    // Generate final recommendation
    const recommendation = generateBidRecommendation({
      jobData,
      template,
      experienceLevel,
      complexity,
      projectType,
      suggestedHourly,
      minHourly,
      maxHourly,
      suggestedFixed,
      estimatedHours,
      budgetAlignment,
      budgetMid
    });

    return recommendation;

  } catch (error) {
    console.error('Error calculating bid suggestion:', error);
    return {
      suggestedHourly: 85,
      suggestedFixed: 2500,
      confidence: 'low',
      reasoning: 'Error in calculation - using fallback rates',
      recommendation: 'Review project manually for accurate pricing'
    };
  }
}

function detectExperienceLevel(jobData) {
  const text = (jobData.description + ' ' + jobData.title + ' ' + jobData.experience).toLowerCase();
  
  for (const [level, keywords] of Object.entries(EXPERIENCE_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return level;
    }
  }
  return 'intermediate'; // Default assumption
}

function detectComplexity(jobData) {
  const text = (jobData.description + ' ' + jobData.title).toLowerCase();
  
  for (const [level, indicators] of Object.entries(COMPLEXITY_INDICATORS)) {
    if (indicators.some(indicator => text.includes(indicator))) {
      return level;
    }
  }
  return 'medium'; // Default assumption
}

function detectProjectType(jobData) {
  const text = jobData.description.toLowerCase();
  
  if (text.includes('hourly') || text.includes('ongoing') || text.includes('long-term')) {
    return 'hourly';
  } else if (text.includes('fixed') || text.includes('project') || text.includes('milestone')) {
    return 'fixed';
  }
  
  // Infer from budget format
  if (jobData.budgetLow && jobData.budgetHigh && jobData.budgetLow !== jobData.budgetHigh) {
    return 'fixed';
  }
  
  return 'fixed'; // Default assumption for UpWork
}

function getComplexityMultiplier(complexity) {
  const multipliers = {
    high: 1.2,
    medium: 1.0,
    low: 0.85
  };
  return multipliers[complexity] || 1.0;
}

function estimateProjectHours(jobData, complexity) {
  const text = (jobData.description + ' ' + jobData.title).toLowerCase();
  
  // Look for explicit time mentions
  const timeKeywords = {
    '1-2 weeks': 60,
    '2-4 weeks': 120,
    '1 month': 120,
    '2-3 months': 300,
    '3-6 months': 500,
    'asap': 40,
    'urgent': 40,
    'quick': 20
  };
  
  for (const [keyword, hours] of Object.entries(timeKeywords)) {
    if (text.includes(keyword)) {
      return hours;
    }
  }
  
  // Estimate based on project complexity and type
  const baseHours = {
    high: 200,
    medium: 80,
    low: 30
  };
  
  return baseHours[complexity] || 80;
}

function analyzeBudgetAlignment(suggestedFixed, budgetLow, budgetHigh) {
  if (!budgetLow || budgetLow === 'N/A') {
    return { status: 'unknown', message: 'No budget information available' };
  }
  
  const low = parseFloat(budgetLow);
  const high = parseFloat(budgetHigh) || low;
  const mid = (low + high) / 2;
  
  if (suggestedFixed <= low) {
    return { status: 'under', message: 'Suggested bid is below client budget range' };
  } else if (suggestedFixed <= mid) {
    return { status: 'good', message: 'Suggested bid aligns well with client budget' };
  } else if (suggestedFixed <= high) {
    return { status: 'high', message: 'Suggested bid is at top of client budget range' };
  } else {
    const overPercent = Math.round(((suggestedFixed - high) / high) * 100);
    return { 
      status: 'over', 
      message: `Suggested bid is ${overPercent}% over client budget - consider scope reduction or premium positioning` 
    };
  }
}

function generateBidRecommendation(params) {
  const {
    suggestedHourly, minHourly, maxHourly, suggestedFixed, 
    estimatedHours, budgetAlignment, template, complexity,
    projectType, budgetMid
  } = params;
  
  let confidence = 'medium';
  let reasoning = [];
  let finalRecommendation = '';
  
  // Build reasoning
  reasoning.push(`Template: ${template.replace('.txt', '')} (${VERTICAL_MULTIPLIERS[template]}x multiplier)`);
  reasoning.push(`Complexity: ${complexity} (estimated ${estimatedHours} hours)`);
  reasoning.push(`Budget alignment: ${budgetAlignment.status} - ${budgetAlignment.message}`);
  
  // Adjust confidence based on factors
  if (budgetAlignment.status === 'good' || budgetAlignment.status === 'high') {
    confidence = 'high';
  } else if (budgetAlignment.status === 'over') {
    confidence = 'low';
  }
  
  // Generate final recommendation
  if (projectType === 'hourly') {
    finalRecommendation = `Bid $${suggestedHourly}/hour (range: $${minHourly}-$${maxHourly})`;
  } else {
    if (budgetAlignment.status === 'over' && budgetMid > 0) {
      const adjustedBid = Math.round(budgetMid * 0.95); // Slightly under budget midpoint
      finalRecommendation = `Consider bidding $${adjustedBid} (adjusted for budget constraints) or justify premium pricing`;
    } else {
      finalRecommendation = `Bid $${suggestedFixed} fixed price`;
    }
  }
  
  return {
    projectType,
    suggestedHourly,
    minHourly,
    maxHourly,
    suggestedFixed,
    estimatedHours,
    budgetAlignment,
    confidence,
    reasoning: reasoning.join('; '),
    recommendation: finalRecommendation,
    template,
    complexity
  };
}

module.exports = { calculateBidSuggestion };