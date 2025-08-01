const { recommendTemplate } = require('./templateClassifier');
const config = require('../config');
const data = require('../data');

/**
 * Intelligent bid calculation based on multiple factors
 * Considers market positioning, project complexity, client budget, and risk factors
 */

function classifyProjectSize(budgetAmount) {
  for (const [size, range] of Object.entries(data.projectSizes)) {
    if (budgetAmount >= range.min && budgetAmount <= range.max) {
      return size;
    }
  }
  return 'medium'; // Default fallback
}

function calculateSizePreferenceScore(projectSize, config) {
  const preferenceIndex = config.preferredProjectSizes.indexOf(projectSize);
  if (preferenceIndex === -1) return 0.5; // Neutral if not in preferences
  
  // Higher score for more preferred sizes
  const maxScore = config.preferredProjectSizes.length;
  return (maxScore - preferenceIndex) / maxScore; // 1.0 for most preferred, 0.33 for least preferred
}

function calculateSizeAdjustment(sizePreferenceScore, config) {
  const baseAdjustment = 1.0; // No adjustment
  
  if (sizePreferenceScore >= 0.8) {
    // Most preferred size - bid more competitively
    return baseAdjustment * 0.9; // 10% discount for preferred projects
  } else if (sizePreferenceScore >= 0.6) {
    // Moderately preferred - standard pricing
    return baseAdjustment;
  } else if (sizePreferenceScore >= 0.4) {
    // Less preferred - add premium
    return baseAdjustment * 1.1; // 10% premium
  } else {
    // Least preferred - significant premium or pass recommendation
    return baseAdjustment * 1.25; // 25% premium
  }
}

function calculateBidSuggestion(jobData) {
  try {
    // Enhanced budget parsing with flexible language detection
    const budgetInfo = parseBudgetInformation(jobData);
    const budgetLow = budgetInfo.low;
    const budgetHigh = budgetInfo.high;
    const budgetMid = budgetInfo.mid;
    const isFlexible = budgetInfo.isFlexible;
    const paymentType = budgetInfo.paymentType;

    // Detect project characteristics
    const template = recommendTemplate(jobData.description + ' ' + jobData.title);
    const experienceLevel = detectExperienceLevel(jobData);
    const complexity = detectComplexity(jobData);
    const projectType = detectProjectType(jobData);

    // Use config rates or fallback to base rates
    const targetRate = config.targetHourlyRate || data.baseRates.senior.target;
    const minRate = config.minHourlyRate || data.baseRates.senior.min;
    const maxRate = data.baseRates.senior.max; // Keep max rate as ceiling
    
    // Calculate base rate with vertical multiplier
    const verticalMultiplier = data.verticals.multipliers[template] || 1.0;
    const complexityMultiplier = getComplexityMultiplier(complexity);
    
    // Estimate project hours first
    const estimatedHours = estimateProjectHours(jobData, complexity);
    
    // Calculate suggested hourly rate
    const suggestedHourly = Math.round(targetRate * verticalMultiplier * complexityMultiplier);
    const minHourly = Math.round(minRate * verticalMultiplier * complexityMultiplier);
    const maxHourly = Math.round(maxRate * verticalMultiplier * complexityMultiplier);

    // Calculate initial fixed bid based on hourly rate
    let suggestedFixed = Math.round(suggestedHourly * estimatedHours);
    
    // Budget-aware adjustment: If client has stated a budget, align with it
    if (budgetLow > 0 && budgetHigh > 0) {
      const budgetMid = (budgetLow + budgetHigh) / 2;
      const budgetRange = budgetHigh - budgetLow;
      
      // If our calculated bid is significantly below client budget, adjust upward
      if (suggestedFixed < budgetLow * 0.8) {
        // Client budget suggests higher value - adjust hourly rate to align
        const targetHourly = Math.round(budgetMid / estimatedHours);
        suggestedFixed = Math.round(targetHourly * estimatedHours);
        
        // Ensure we don't exceed the high end of budget
        if (suggestedFixed > budgetHigh) {
          suggestedFixed = Math.round(budgetHigh * 0.95); // Stay within budget
        }
      }
    }

    // Intelligent multi-factor bid calculation
    const projectSize = classifyProjectSize(budgetMid);
    const sizePreferenceScore = calculateSizePreferenceScore(projectSize, config);
    const sizeAdjustment = calculateSizeAdjustment(sizePreferenceScore, config);
    
    // Apply size preference adjustment
    suggestedFixed = Math.round(suggestedFixed * sizeAdjustment);
    
    // Ensure we stay within budget constraints
    if (budgetHigh > 0 && suggestedFixed > budgetHigh) {
      suggestedFixed = Math.round(budgetHigh * 0.95); // Stay within budget
    }
    
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
      budgetMid,
      projectSize,
      sizePreferenceScore,
      sizeAdjustment,
      budgetLow,
      budgetHigh,
      isFlexible,
      paymentType
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
  
  for (const [level, keywords] of Object.entries(data.experienceKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return level;
    }
  }
  return 'intermediate'; // Default assumption
}

function detectComplexity(jobData) {
  const text = (jobData.description + ' ' + jobData.title).toLowerCase();
  
  for (const [level, indicators] of Object.entries(data.complexityIndicators)) {
    if (indicators.some(indicator => text.includes(indicator))) {
      return level;
    }
  }
  return 'medium'; // Default assumption
}

function parseBudgetInformation(jobData) {
  // Parse basic budget numbers
  const budgetLow = parseFloat(jobData.budgetLow?.replace(/[^0-9.]/g, '')) || 0;
  const budgetHigh = parseFloat(jobData.budgetHigh?.replace(/[^0-9.]/g, '')) || budgetLow;
  const budgetMid = budgetLow > 0 ? (budgetLow + budgetHigh) / 2 : budgetHigh;
  
  // Analyze budget flexibility and payment type from description
  const text = (jobData.description + ' ' + jobData.budgetText).toLowerCase();
  
  let isFlexible = false;
  let paymentType = 'fixed';
  
  // Detect flexible budget language
  const flexibleIndicators = [
    'flexible', 'negotiable', 'open to discussion', 'depending on experience',
    'elite talent', 'quality over price', 'budget is flexible', 'flexible budget'
  ];
  
  isFlexible = flexibleIndicators.some(indicator => text.includes(indicator));
  
  // Detect payment type
  if (text.includes('hourly') || text.includes('rate')) {
    paymentType = 'hourly';
  } else if (text.includes('milestone') || text.includes('phased')) {
    paymentType = 'milestone';
  } else if (text.includes('fixed') || text.includes('project')) {
    paymentType = 'fixed';
  }
  
  // Adjust budget range for flexible budgets
  let adjustedLow = budgetLow;
  let adjustedHigh = budgetHigh;
  
  if (isFlexible && budgetHigh > 0) {
    // For flexible budgets, we can target higher end
    adjustedHigh = Math.round(budgetHigh * 1.2); // 20% premium for flexibility
  }
  
  return {
    low: adjustedLow,
    high: adjustedHigh,
    mid: (adjustedLow + adjustedHigh) / 2,
    isFlexible,
    paymentType,
    originalLow: budgetLow,
    originalHigh: budgetHigh
  };
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
  
  // If client has a clear budget range, be more specific about alignment
  if (low > 0 && high > low) {
    if (suggestedFixed <= low * 0.8) {
      return { 
        status: 'under', 
        message: `Suggested bid ($${suggestedFixed}) is significantly below client's budget range ($${low}-$${high}). Consider bidding closer to $${Math.round(mid * 0.9)} to align with client expectations.` 
      };
    } else if (suggestedFixed <= low) {
      return { 
        status: 'under', 
        message: `Suggested bid ($${suggestedFixed}) is below client's minimum budget ($${low}). Consider bidding $${Math.round(mid * 0.85)} to better align with budget range.` 
      };
    } else if (suggestedFixed <= mid) {
      return { 
        status: 'good', 
        message: `Suggested bid ($${suggestedFixed}) aligns well with client's budget range ($${low}-$${high})` 
      };
    } else if (suggestedFixed <= high) {
      return { 
        status: 'high', 
        message: `Suggested bid ($${suggestedFixed}) is at the top of client's budget range ($${low}-$${high})` 
      };
    } else {
      const overPercent = Math.round(((suggestedFixed - high) / high) * 100);
      return { 
        status: 'over', 
        message: `Suggested bid ($${suggestedFixed}) is ${overPercent}% over client's maximum budget ($${high}). Consider bidding $${Math.round(high * 0.95)} or justify premium pricing.` 
      };
    }
  } else {
    // Single budget point or unclear range
    if (suggestedFixed <= low * 0.8) {
      return { status: 'under', message: 'Suggested bid is significantly below client budget' };
    } else if (suggestedFixed <= low) {
      return { status: 'under', message: 'Suggested bid is below client budget' };
    } else if (suggestedFixed <= low * 1.2) {
      return { status: 'good', message: 'Suggested bid aligns well with client budget' };
    } else {
      const overPercent = Math.round(((suggestedFixed - low) / low) * 100);
      return { 
        status: 'over', 
        message: `Suggested bid is ${overPercent}% over client budget - consider scope reduction or premium positioning` 
      };
    }
  }
}

function generateBidRecommendation(params) {
  const {
    suggestedHourly, minHourly, maxHourly, suggestedFixed, 
    estimatedHours, budgetAlignment, template, complexity,
    projectType, budgetMid, projectSize, sizePreferenceScore, sizeAdjustment,
    budgetLow, budgetHigh, isFlexible, paymentType
  } = params;
  
  let confidence = 'medium';
  let reasoning = [];
  let finalRecommendation = '';
  
  // Build reasoning
  reasoning.push(`Template: ${template.replace('.txt', '')} (${data.verticals.multipliers[template]}x multiplier)`);
  reasoning.push(`Complexity: ${complexity} (estimated ${estimatedHours} hours)`);
  reasoning.push(`Project size: ${projectSize} (preference score: ${sizePreferenceScore.toFixed(2)}, adjustment: ${sizeAdjustment.toFixed(2)}x)`);
  reasoning.push(`Budget: $${budgetLow}-$${budgetHigh}${isFlexible ? ' (flexible)' : ''} - ${paymentType} payment`);
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
    } else if (budgetAlignment.status === 'under' && budgetMid > 0) {
      // If we're under budget, suggest a higher bid that better aligns with client expectations
      const targetBid = Math.round(budgetMid * 0.9); // Target 90% of budget midpoint
      finalRecommendation = `Consider bidding $${targetBid} to better align with client's $${budgetLow}-$${budgetHigh} budget range`;
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
    complexity,
    projectSize,
    sizePreferenceScore,
    sizeAdjustment
  };
}

module.exports = { calculateBidSuggestion };