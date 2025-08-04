// tests/unit/ProjectAnalyzer.test.ts
import { ProjectAnalyzer, ProjectAnalysis } from '../../src/core/ProjectAnalyzer';
import { JobData } from '../../src/types/JobData';
import { BidCalculationResult } from '../../src/types/BidCalculation';
import { MarketData } from '../../src/types/Config';

describe('ProjectAnalyzer', () => {
  let analyzer: ProjectAnalyzer;
  let mockJobData: JobData;
  let mockBidSuggestion: BidCalculationResult;
  let mockMarketData: MarketData;

  beforeEach(() => {
    mockJobData = {
      id: 'test-job-1',
      title: 'React Developer for E-commerce Platform',
      description: 'We need an experienced React developer to build a modern e-commerce platform with TypeScript, Node.js backend, and AWS deployment. The project involves creating a scalable solution with real-time inventory management and payment processing.',
      experience: 'expert',
      budget: {
        type: 'range',
        low: 15000,
        high: 25000,
        currency: 'USD'
      },
      proposals: 25,
      client: {
        location: 'United States',
        avgHourlyRate: 85,
        totalSpent: 100000,
        hireRate: 90,
        totalReviews: 50,
        avgRating: 4.9
      },
      projectType: 'fixed-price',
      skills: ['React', 'TypeScript', 'Node.js', 'AWS'],
      url: 'https://www.upwork.com/jobs/~0123456789',
      applicationRequirements: {
        secretWords: ['ECOMMERCE2024'],
        portfolioRequests: ['Portfolio/work examples requested'],
        technicalQuestions: ['Technical approach questions included'],
        specificRequests: ['Please provide examples of e-commerce projects'],
        hasStructuredApplication: true
      },
      postedDate: '2024-01-15T10:00:00Z',
      complexity: 'high'
    };

    mockBidSuggestion = {
      suggestedBid: {
        amount: 20000,
        hourlyRate: 95,
        confidence: 0.85
      },
      budgetAlignment: {
        status: 'good',
        percentage: 0.85,
        recommendation: 'Excellent budget alignment'
      },
      breakdown: {
        baseRate: 18000,
        complexityAdjustment: 2000,
        riskAdjustment: 0,
        marketAdjustment: 0
      },
      analysis: {
        projectSize: 'large',
        complexity: 'high',
        riskLevel: 'low',
        marketPosition: 'competitive'
      },
      recommendations: [
        {
          type: 'pricing',
          title: 'Consider value-based pricing',
          description: 'This project offers significant value - consider premium pricing'
        }
      ],
      metadata: {
        templateUsed: 'fintech.txt',
        processingTime: 150,
        confidenceFactors: ['High budget alignment', 'Strong expertise match']
      }
    };

    mockMarketData = {
      verticalRates: {
        'fintech.txt': {
          baseMultiplier: 1.2,
          demandLevel: 'high',
          complexityBonus: 0.1,
          riskAdjustment: -0.05,
          description: 'Financial technology projects'
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
        high: 1.1,
        expert: 1.2
      },
      experienceMultipliers: {
        entry: 0.7,
        intermediate: 0.9,
        senior: 1.0,
        expert: 1.1
      },
      riskFactors: [
        {
          type: 'red',
          category: 'budget',
          keyword: 'asap',
          impact: 15
        },
        {
          type: 'red',
          category: 'communication',
          keyword: 'urgent',
          impact: 10
        }
      ],
      opportunitySignals: [
        {
          type: 'positive',
          category: 'client',
          keyword: 'established company',
          impact: 10
        },
        {
          type: 'positive',
          category: 'project',
          keyword: 'scalable',
          impact: 8
        }
      ]
    };

    analyzer = new ProjectAnalyzer(mockMarketData);
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const defaultAnalyzer = new ProjectAnalyzer(mockMarketData);
      expect(defaultAnalyzer).toBeInstanceOf(ProjectAnalyzer);
    });

    it('should create instance with custom options', () => {
      const customAnalyzer = new ProjectAnalyzer(mockMarketData, {
        scoringWeights: {
          profitability: 0.3,
          strategicFit: 0.25,
          riskAssessment: 0.15,
          careerImpact: 0.15,
          clientQuality: 0.1,
          timeAlignment: 0.05
        }
      });
      expect(customAnalyzer).toBeInstanceOf(ProjectAnalyzer);
    });
  });

  describe('analyzeProject', () => {
    it('should analyze project successfully', () => {
      const result = analyzer.analyzeProject(mockJobData, mockBidSuggestion);

      expect(result.jobData).toBe(mockJobData);
      expect(result.bidSuggestion).toBe(mockBidSuggestion);
      expect(result.scores).toBeDefined();
      expect(result.flags).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.recommendation).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.riskFactors).toBeDefined();
      expect(result.opportunities).toBeDefined();
    });

    it('should calculate profitability score correctly', () => {
      const result = analyzer.analyzeProject(mockJobData, mockBidSuggestion);

      expect(result.scores.profitability).toBeGreaterThan(0);
      expect(result.scores.profitability).toBeLessThanOrEqual(100);
    });

    it('should calculate strategic fit score correctly', () => {
      const result = analyzer.analyzeProject(mockJobData, mockBidSuggestion);

      expect(result.scores.strategicFit).toBeGreaterThan(0);
      expect(result.scores.strategicFit).toBeLessThanOrEqual(100);
    });

    it('should calculate risk assessment score correctly', () => {
      const result = analyzer.analyzeProject(mockJobData, mockBidSuggestion);

      expect(result.scores.riskAssessment).toBeGreaterThan(0);
      expect(result.scores.riskAssessment).toBeLessThanOrEqual(100);
    });

    it('should calculate career impact score correctly', () => {
      const result = analyzer.analyzeProject(mockJobData, mockBidSuggestion);

      expect(result.scores.careerImpact).toBeGreaterThan(0);
      expect(result.scores.careerImpact).toBeLessThanOrEqual(100);
    });

    it('should calculate client quality score correctly', () => {
      const result = analyzer.analyzeProject(mockJobData, mockBidSuggestion);

      expect(result.scores.clientQuality).toBeGreaterThan(0);
      expect(result.scores.clientQuality).toBeLessThanOrEqual(100);
    });

    it('should calculate time alignment score correctly', () => {
      const result = analyzer.analyzeProject(mockJobData, mockBidSuggestion);

      expect(result.scores.timeAlignment).toBeGreaterThan(0);
      expect(result.scores.timeAlignment).toBeLessThanOrEqual(100);
    });

    it('should detect red flags', () => {
      const jobDataWithRedFlags = {
        ...mockJobData,
        description: mockJobData.description + ' We need this done ASAP and urgently!'
      };

      const result = analyzer.analyzeProject(jobDataWithRedFlags, mockBidSuggestion);

      expect(result.flags.red.length).toBeGreaterThan(0);
      expect(result.flags.red.some(flag => flag.keyword === 'asap')).toBe(true);
      expect(result.flags.red.some(flag => flag.keyword === 'urgent')).toBe(true);
    });

    it('should detect green flags', () => {
      const jobDataWithGreenFlags = {
        ...mockJobData,
        description: mockJobData.description + ' This is for an established company and needs to be scalable.'
      };

      const result = analyzer.analyzeProject(jobDataWithGreenFlags, mockBidSuggestion);

      expect(result.flags.green.length).toBeGreaterThan(0);
      expect(result.flags.green.some(flag => flag.keyword === 'established company')).toBe(true);
      expect(result.flags.green.some(flag => flag.keyword === 'scalable')).toBe(true);
    });

    it('should generate appropriate recommendation for high-scoring project', () => {
      const highValueJob = {
        ...mockJobData,
        budget: {
          type: 'range',
          low: 50000,
          high: 100000,
          currency: 'USD'
        }
      };

      const highValueBid = {
        ...mockBidSuggestion,
        suggestedBid: {
          amount: 75000,
          hourlyRate: 120,
          confidence: 0.95
        },
        budgetAlignment: {
          status: 'good',
          percentage: 0.9,
          recommendation: 'Excellent budget alignment'
        }
      };

      const result = analyzer.analyzeProject(highValueJob, highValueBid);

      expect(['TAKE', 'CONSIDER']).toContain(result.recommendation);
    });

    it('should generate appropriate recommendation for low-scoring project', () => {
      const lowValueJob = {
        ...mockJobData,
        budget: {
          type: 'range',
          low: 100,
          high: 500,
          currency: 'USD'
        },
        description: 'We need this done ASAP and urgently! No budget specified.'
      };

      const lowValueBid = {
        ...mockBidSuggestion,
        suggestedBid: {
          amount: 300,
          hourlyRate: 25,
          confidence: 0.3
        },
        budgetAlignment: {
          status: 'under',
          percentage: 0.3,
          recommendation: 'Very low budget'
        }
      };

      const result = analyzer.analyzeProject(lowValueJob, lowValueBid);

      expect(['CAUTION', 'PASS']).toContain(result.recommendation);
    });

    it('should handle analysis errors gracefully', () => {
      // Create invalid data that might cause errors
      const invalidJobData = {
        ...mockJobData,
        budget: null as any,
        description: undefined as any
      };

      const result = analyzer.analyzeProject(invalidJobData, mockBidSuggestion);

      expect(result.recommendation).toBe('MANUAL_REVIEW');
      expect(result.reasoning).toContain('Error in analysis');
    });

    it('should include specific reasoning in recommendation', () => {
      const result = analyzer.analyzeProject(mockJobData, mockBidSuggestion);

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.riskFactors.length).toBeGreaterThanOrEqual(0);
      expect(result.opportunities.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate weighted overall score correctly', () => {
      const result = analyzer.analyzeProject(mockJobData, mockBidSuggestion);

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.overallScore)).toBe(true);
    });

    it('should handle jobs with not-specified budget', () => {
      const jobDataWithoutBudget = {
        ...mockJobData,
        budget: {
          type: 'not-specified',
          currency: 'USD'
        }
      };

      const result = analyzer.analyzeProject(jobDataWithoutBudget, mockBidSuggestion);

      expect(result.scores.riskAssessment).toBeLessThan(70); // Should be lower due to budget risk
    });

    it('should handle entry-level projects', () => {
      const entryLevelJob = {
        ...mockJobData,
        experience: 'entry'
      };

      const result = analyzer.analyzeProject(entryLevelJob, mockBidSuggestion);

      expect(result.scores.riskAssessment).toBeLessThan(70); // Should be lower due to entry-level risk
    });
  });

  describe('scoring logic', () => {
    it('should score high-value projects better', () => {
      const highValueJob = {
        ...mockJobData,
        budget: {
          type: 'range',
          low: 50000,
          high: 100000,
          currency: 'USD'
        }
      };

      const highValueBid = {
        ...mockBidSuggestion,
        suggestedBid: {
          amount: 75000,
          hourlyRate: 120,
          confidence: 0.95
        }
      };

      const highValueResult = analyzer.analyzeProject(highValueJob, highValueBid);

      const lowValueJob = {
        ...mockJobData,
        budget: {
          type: 'range',
          low: 100,
          high: 500,
          currency: 'USD'
        }
      };

      const lowValueBid = {
        ...mockBidSuggestion,
        suggestedBid: {
          amount: 300,
          hourlyRate: 25,
          confidence: 0.3
        }
      };

      const lowValueResult = analyzer.analyzeProject(lowValueJob, lowValueBid);

      expect(highValueResult.scores.profitability).toBeGreaterThan(lowValueResult.scores.profitability);
    });

    it('should score modern technology stacks better', () => {
      const modernTechJob = {
        ...mockJobData,
        description: mockJobData.description + ' Using React, TypeScript, AWS, Docker, and Kubernetes.'
      };

      const result = analyzer.analyzeProject(modernTechJob, mockBidSuggestion);

      expect(result.scores.careerImpact).toBeGreaterThan(40); // Should be higher due to modern tech
    });

    it('should score complex projects better for strategic fit', () => {
      const complexJob = {
        ...mockJobData,
        complexity: 'expert'
      };

      const result = analyzer.analyzeProject(complexJob, mockBidSuggestion);

      expect(result.scores.strategicFit).toBeGreaterThan(30); // Should be higher due to complexity
    });
  });
}); 