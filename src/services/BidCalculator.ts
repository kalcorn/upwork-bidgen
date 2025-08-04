// src/services/BidCalculator.ts - Simplified bid calculation
import { BidCalculationParams, BidCalculationResult, BidSuggestion } from '../types/BidCalculation';


export class BidCalculator {
  /**
   * Calculates a simple bid based on the job's budget or the user's hourly rate.
   */
  public calculateBid(params: BidCalculationParams): BidCalculationResult {
    const { jobData, userConfig } = params;

    let suggestedAmount = 500; // Default fallback bid
    let reasoning = 'Default bid amount.';
    const paymentType = jobData.budgetType === 'hourly' ? 'hourly' : 'fixed';

    if (jobData.budget && jobData.budget.low && jobData.budget.high) {
      // If there's a budget range, suggest the midpoint.
      suggestedAmount = Math.round((jobData.budget.low + jobData.budget.high) / 2);
      reasoning = `Suggested bid is the midpoint of the client's budget range ($${jobData.budget.low} - $${jobData.budget.high}).`;
    } else if (paymentType === 'hourly') {
      // If it's hourly with no range, use the user's target rate.
      // This is a simplification; we'll estimate 40 hours for a generic project.
      suggestedAmount = userConfig.hourlyRate.target * 40;
      reasoning = `Suggested bid is based on your target hourly rate of $${userConfig.hourlyRate.target} for an estimated 40 hours.`;
    } else if (jobData.budget && jobData.budget.low) {
        // If there's only a minimum budget, use that.
        suggestedAmount = jobData.budget.low;
        reasoning = `Suggested bid is based on the client's minimum budget of $${jobData.budget.low}.`;
    }

    const bidSuggestion: BidSuggestion = {
      amount: suggestedAmount,
      type: paymentType,
      currency: 'USD',
      reasoning: reasoning,
      confidence: 0.75, // Static confidence for simplicity
    };

    return {
      suggestedBid: bidSuggestion,
      // All complex analysis fields are removed.
      analysis: {},
      recommendations: [],
      riskAssessment: {},
      confidence: 0.75,
      metadata: {
        calculatedAt: new Date(),
        version: '3.0-simplified',
        algorithm: 'simplified-budget-midpoint',
        inputValidation: true,
        processingTime: 1,
        dataSources: ['job-data', 'user-config'],
      },
      recommendation: reasoning,
      reasoning: reasoning,
    };
  }
}

// Export singleton instance
export const bidCalculator = new BidCalculator();