// src/types/BidCalculation.ts - Simplified bid calculation types

import { JobData } from './JobData';
import { UserConfig } from './Config';

export interface BidCalculationParams {
  jobData: JobData;
  userConfig: UserConfig;
  marketData: any; // Simplified, not used
  options: any; // Simplified, not used
}

export interface BidCalculationResult {
  suggestedBid: BidSuggestion;
  reasoning: string;
  [key: string]: any; // Allow other properties for compatibility
}

export interface BidSuggestion {
  amount: number;
  type: 'fixed' | 'hourly';
  currency: string;
  reasoning: string;
  confidence: number;
}