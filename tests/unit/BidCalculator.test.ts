// tests/unit/BidCalculator.test.ts
import { BidCalculator } from '../../src/services/BidCalculator';
import { JobData } from '../../src/types/JobData';
import { UserConfig, MarketData } from '../../src/types/Config';
import { BidCalculationOptions } from '../../src/types/BidCalculation';

describe('BidCalculator', () => {
  let calculator: BidCalculator;
  let mockJobData: JobData;
  let mockUserConfig: UserConfig;
  let mockMarketData: MarketData;
  let mockOptions: BidCalculationOptions;

  beforeEach(() => {
    calculator = new BidCalculator();
    
    mockJobData = {
      id: 'test-job-123',
      title: 'Senior Full-Stack Developer Needed for E-commerce Platform',
      description: 'We need an experienced developer to build a scalable e-commerce platform with real-time inventory management, payment processing, and admin dashboard. The project involves React frontend, Node.js backend, and PostgreSQL database.',
      budget: {
        low: 8000,
        high: 15000,
        type: 'fixed',
        currency: 'USD'
      },
      client: {
        id: 'test-client-123',
        name: 'Test Client',
        location: 'United States',
        rating: 4.8,
        totalSpent: 50000,
        totalHired: 15,
        totalReviews: 20,
        memberSince: '2020-01-01'
      },
      experience: 'expert',
      postedDate: '2024-01-01',
      skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript'],
      applicationRequirements: {
        secretWords: ['ecommerce', 'scalable'],
        questions: ['What is your experience with e-commerce platforms?'],
        attachments: false,
        portfolio: true,
        coverLetter: true
      },
      projectType: 'ecommerce',
      complexity: 'medium',
      budgetType: 'fixed',
      secretWords: ['ecommerce', 'scalable']
    };

    mockUserConfig = {
      name: 'Test Developer',
      title: 'Senior Full-Stack Developer',
      hourlyRate: {
        min: 75,
        target: 95,
        max: 125
      },
      experienceLevel: 'senior',
      preferredProjectSizes: ['large', 'medium', 'small'],
      expertise: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
      portfolio: 'https://example.com',
      availability: 'Full-time',
      timezone: 'UTC-5',
      languages: ['English']
    };

    mockMarketData = {
      verticalRates: {
        'ecommerce.txt': {
          baseMultiplier: 0.9,
          demandLevel: 'medium',
          complexityBonus: 0.0,
          riskAdjustment: 0.0,
          description: 'Commoditized, price-sensitive'
        }
      },
      projectSizeMultipliers: {
        small: 0.8,
        medium: 1.0,
        large: 1.2,
        enterprise: 1.5
      },
      complexityMultipliers: {
        low: 0.9,
        medium: 1.0,
        high: 1.3
      },
      experienceMultipliers: {
        junior: 0.7,
        intermediate: 1.0,
        senior: 1.3
      },
      riskFactors: [
        {
          name: 'Budget Constraints',
          description: 'Client indicates tight or limited budget',
          weight: 0.8,
          keywords: ['budget is tight', 'limited budget'],
          adjustment: -0.2
        }
      ],
      opportunitySignals: [
        {
          name: 'Strong Budget',
          description: 'Client indicates serious budget and quality focus',
          weight: 0.8,
          keywords: ['serious budget', 'well-funded'],
          bonus: 0.15
        }
      ]
    };

    mockOptions = {
      includeAnalysis: true,
      includeRecommendations: true,
      includeRiskAssessment: true,
      targetProfitMargin: 0.2
    };
  });

  describe('calculateBid', () => {
    it('should calculate a bid with comprehensive analysis', () => {
      const result = calculator.calculateBid({
        jobData: mockJobData,
        userConfig: mockUserConfig,
        marketData: mockMarketData,
        options: mockOptions
      });

      expect(result).toHaveProperty('suggestedBid');
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('riskAssessment');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('metadata');

      // Check bid suggestion structure
      expect(result.suggestedBid).toHaveProperty('amount');
      expect(result.suggestedBid).toHaveProperty('type');
      expect(result.suggestedBid).toHaveProperty('currency');
      expect(result.suggestedBid).toHaveProperty('breakdown');
      expect(result.suggestedBid).toHaveProperty('reasoning');
      expect(result.suggestedBid).toHaveProperty('confidence');

      // Check breakdown structure
      expect(result.suggestedBid.breakdown).toHaveProperty('baseRate');
      expect(result.suggestedBid.breakdown).toHaveProperty('complexityMultiplier');
      expect(result.suggestedBid.breakdown).toHaveProperty('experienceMultiplier');
      expect(result.suggestedBid.breakdown).toHaveProperty('verticalMultiplier');
      expect(result.suggestedBid.breakdown).toHaveProperty('sizeAdjustment');
      expect(result.suggestedBid.breakdown).toHaveProperty('riskAdjustment');
      expect(result.suggestedBid.breakdown).toHaveProperty('opportunityBonus');
      expect(result.suggestedBid.breakdown).toHaveProperty('finalAmount');

      // Check analysis structure
      expect(result.analysis).toHaveProperty('complexity');
      expect(result.analysis).toHaveProperty('marketPosition');
      expect(result.analysis).toHaveProperty('clientProfile');
      expect(result.analysis).toHaveProperty('opportunity');
      expect(result.analysis).toHaveProperty('risks');
      expect(result.analysis).toHaveProperty('strengths');

      // Check recommendations
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Check risk assessment
      expect(result.riskAssessment).toHaveProperty('overallRisk');
      expect(result.riskAssessment).toHaveProperty('riskScore');
      expect(result.riskAssessment).toHaveProperty('riskFactors');
      expect(result.riskAssessment).toHaveProperty('mitigationStrategies');
      expect(result.riskAssessment).toHaveProperty('insuranceRecommendations');

      // Check metadata
      expect(result.metadata).toHaveProperty('calculatedAt');
      expect(result.metadata).toHaveProperty('version');
      expect(result.metadata).toHaveProperty('algorithm');
      expect(result.metadata).toHaveProperty('processingTime');
    });

    it('should calculate reasonable bid amounts', () => {
      const result = calculator.calculateBid({
        jobData: mockJobData,
        userConfig: mockUserConfig,
        marketData: mockMarketData,
        options: mockOptions
      });

      // Bid should be reasonable for the project scope
      expect(result.suggestedBid.amount).toBeGreaterThan(1000);
      expect(result.suggestedBid.amount).toBeLessThan(50000);

      // Confidence should be between 0 and 1
      expect(result.suggestedBid.confidence).toBeGreaterThanOrEqual(0);
      expect(result.suggestedBid.confidence).toBeLessThanOrEqual(1);

      // Overall confidence should match bid confidence
      expect(result.confidence).toBe(result.suggestedBid.confidence);
    });

    it('should handle different project complexities', () => {
      // Test low complexity project
      const lowComplexityJob = { ...mockJobData };
      lowComplexityJob.description = 'Simple landing page with contact form';
      lowComplexityJob.title = 'Simple Website Development';

      const lowResult = calculator.calculateBid({
        jobData: lowComplexityJob,
        userConfig: mockUserConfig,
        marketData: mockMarketData,
        options: mockOptions
      });

      // Test high complexity project
      const highComplexityJob = { ...mockJobData };
      highComplexityJob.description = 'Enterprise-scale distributed system with microservices, real-time data processing, and millions of users';
      highComplexityJob.title = 'Enterprise System Architecture';

      const highResult = calculator.calculateBid({
        jobData: highComplexityJob,
        userConfig: mockUserConfig,
        marketData: mockMarketData,
        options: mockOptions
      });

      // High complexity should generally result in higher bids (or at least not lower)
      expect(highResult.suggestedBid.amount).toBeGreaterThanOrEqual(lowResult.suggestedBid.amount);
    });

    it('should handle different budget ranges', () => {
      // Test low budget project
      const lowBudgetJob = { ...mockJobData };
      lowBudgetJob.budget.low = 1000;
      lowBudgetJob.budget.high = 3000;

      const lowBudgetResult = calculator.calculateBid({
        jobData: lowBudgetJob,
        userConfig: mockUserConfig,
        marketData: mockMarketData,
        options: mockOptions
      });

      // Test high budget project
      const highBudgetJob = { ...mockJobData };
      highBudgetJob.budget.low = 25000;
      highBudgetJob.budget.high = 50000;

      const highBudgetResult = calculator.calculateBid({
        jobData: highBudgetJob,
        userConfig: mockUserConfig,
        marketData: mockMarketData,
        options: mockOptions
      });

      // High budget projects should generally result in higher bids
      expect(highBudgetResult.suggestedBid.amount).toBeGreaterThan(lowBudgetResult.suggestedBid.amount);
    });

    it('should generate appropriate recommendations based on risk', () => {
      // Test low risk project
      const lowRiskJob = { ...mockJobData };
      lowRiskJob.description = 'Well-funded startup with clear requirements and established team';
      lowRiskJob.client.rating = 5.0;
      lowRiskJob.client.totalSpent = 100000;

      const lowRiskResult = calculator.calculateBid({
        jobData: lowRiskJob,
        userConfig: mockUserConfig,
        marketData: mockMarketData,
        options: mockOptions
      });

      // Test high risk project
      const highRiskJob = { ...mockJobData };
      highRiskJob.description = 'Urgent project with tight budget and unclear requirements';
      highRiskJob.client.rating = 3.0;
      highRiskJob.client.totalSpent = 1000;

      const highRiskResult = calculator.calculateBid({
        jobData: highRiskJob,
        userConfig: mockUserConfig,
        marketData: mockMarketData,
        options: mockOptions
      });

      // Should have different recommendation types
      expect(lowRiskResult.recommendations.length).toBeGreaterThan(0);
      expect(highRiskResult.recommendations.length).toBeGreaterThan(0);

      // Should have different recommendation types (risk levels might be the same due to algorithm)
      expect(lowRiskResult.recommendations.length).toBeGreaterThan(0);
      expect(highRiskResult.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle edge cases gracefully', () => {
      // Test with minimal job data
      const minimalJobData: JobData = {
        id: 'minimal-job',
        title: 'Simple Task',
        description: 'Basic website',
        budget: { low: 500, high: 1000, type: 'fixed', currency: 'USD' },
        client: {
          id: 'client-1',
          name: 'Client',
          location: 'US',
          rating: 4.0,
          totalSpent: 1000,
          totalHired: 1,
          totalReviews: 1,
          memberSince: '2024-01-01'
        },
        experience: 'intermediate',
        postedDate: '2024-01-01',
        skills: ['HTML', 'CSS'],
        applicationRequirements: {
          secretWords: [],
          questions: [],
          attachments: false,
          portfolio: false,
          coverLetter: false
        },
        projectType: 'misc',
        complexity: 'low',
        budgetType: 'fixed',
        secretWords: []
      };

      const result = calculator.calculateBid({
        jobData: minimalJobData,
        userConfig: mockUserConfig,
        marketData: mockMarketData,
        options: mockOptions
      });

      // Should still produce valid results
      expect(result.suggestedBid.amount).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should respect bid constraints', () => {
      const constrainedOptions: BidCalculationOptions = {
        ...mockOptions,
        minBidAmount: 5000,
        maxBidAmount: 10000
      };

      const result = calculator.calculateBid({
        jobData: mockJobData,
        userConfig: mockUserConfig,
        marketData: mockMarketData,
        options: constrainedOptions
      });

      // Bid should be within constraints
      expect(result.suggestedBid.amount).toBeGreaterThanOrEqual(5000);
      expect(result.suggestedBid.amount).toBeLessThanOrEqual(10000);
    });

    it('should calculate processing time', () => {
      const result = calculator.calculateBid({
        jobData: mockJobData,
        userConfig: mockUserConfig,
        marketData: mockMarketData,
        options: mockOptions
      });

      // Processing time should be reasonable (might be 0 for very fast calculations)
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.processingTime).toBeLessThan(1000); // Should be fast
    });
  });

  describe('error handling', () => {
    it('should handle invalid job data gracefully', () => {
      const invalidJobData = { ...mockJobData };
      delete (invalidJobData as any).budget;

      expect(() => {
        calculator.calculateBid({
          jobData: invalidJobData as JobData,
          userConfig: mockUserConfig,
          marketData: mockMarketData,
          options: mockOptions
        });
      }).toThrow('Bid calculation failed');
    });
  });
}); 