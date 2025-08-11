// tests/unit/UpWorkAPI.test.ts
import { UpWorkAPI } from '../../src/core/UpWorkAPI';
import { JobData, JobSearchParams, JobSearchResult } from '../../src/types/JobData';
import { AppConfig } from '../../src/types/Config';

// Mock the CredentialsManager
jest.mock('../../src/core/CredentialsManager');

describe('UpWorkAPI', () => {
  let api: UpWorkAPI;
  let mockConfig: AppConfig;

  beforeEach(() => {
    mockConfig = {
      upwork: {
        apiUrl: 'https://www.upwork.com/api/v2',
        graphqlUrl: 'https://www.upwork.com/graphql',
        credentialsFile: './test-credentials.json',
        requestTimeout: 30000,
        maxRetries: 3,
        retryDelay: 1000
      },
      user: {
        name: 'Test User',
        title: 'Test Developer',
        hourlyRate: { min: 50, target: 75, max: 100 },
        experienceLevel: 'intermediate',
        preferredProjectSizes: ['medium', 'large'],
        expertise: ['JavaScript', 'TypeScript'],
        portfolio: 'https://example.com',
        availability: 'Full-time',
        timezone: 'UTC-5',
        languages: ['English']
      },
      templates: {
        directory: './templates',
        defaultTemplate: 'misc.txt',
        fallbackTemplate: 'misc.txt',
        customTemplates: {}
      },
      ai: {
        claude: {
          enabled: false,
          model: '',
          maxTokens: 0,
          temperature: 0,
          systemPrompt: ''
        },
        gemini: {
          enabled: false,
          model: '',
          maxTokens: 0,
          temperature: 0
        }
      },
      output: {
        directory: './output',
        format: 'txt',
        includeMetadata: true,
        filenameTemplate: '{jobId}-proposal.txt'
      }
    };

    api = new UpWorkAPI(mockConfig);
  });


  describe('isAvailable', () => {
    it('should return false when not authenticated', () => {
      expect(api.isAvailable()).toBe(false);
    });

    it('should return true when authenticated', () => {
      // Mock the internal state to simulate authentication
      (api as any).accessToken = 'test-token';
      (api as any).credentials = { apiKey: 'test', apiSecret: 'test' };
      
      expect(api.isAvailable()).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return correct status when not authenticated', () => {
      const status = api.getStatus();
      
      expect(status.authenticated).toBe(false);
      expect(status.hasCredentials).toBe(false);
      expect(status.tokenValid).toBe(false);
    });

    it('should return correct status when authenticated', () => {
      // Mock the internal state to simulate authentication
      (api as any).accessToken = 'test-token';
      (api as any).credentials = { apiKey: 'test', apiSecret: 'test' };
      
      const status = api.getStatus();
      
      expect(status.authenticated).toBe(true);
      expect(status.hasCredentials).toBe(true);
      expect(status.tokenValid).toBe(true);
    });
  });

  describe('authenticate', () => {
    it('should handle missing credentials gracefully', async () => {
      // Mock CredentialsManager to return false for hasCredentials
      const mockCredentialsManager = {
        hasCredentials: jest.fn().mockReturnValue(false)
      };
      (api as any).credentialsManager = mockCredentialsManager;

      const result = await api.authenticate();

      expect(result.success).toBe(false);
      expect(result.message).toContain('No credentials found');
    });

    it('should handle failed credential loading', async () => {
      // Mock CredentialsManager to return true for hasCredentials but null for loadCredentials
      const mockCredentialsManager = {
        hasCredentials: jest.fn().mockReturnValue(true),
        loadCredentials: jest.fn().mockResolvedValue(null)
      };
      (api as any).credentialsManager = mockCredentialsManager;

      const result = await api.authenticate();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to load credentials');
    });
  });

  describe('testAccessToken', () => {
    it('should return false when no access token', async () => {
      const result = await api.testAccessToken();
      expect(result).toBe(false);
    });

    it('should handle GraphQL request errors gracefully', async () => {
      // Mock the makeGraphQLRequest method to throw an error
      jest.spyOn(api as any, 'makeGraphQLRequest').mockRejectedValue(new Error('Network error'));

      const result = await api.testAccessToken();
      expect(result).toBe(false);
    });
  });

  describe('refreshAccessToken', () => {
    it('should return false when no refresh token', async () => {
      const result = await api.refreshAccessToken();
      expect(result).toBe(false);
    });
  });

  describe('makeGraphQLRequest', () => {
    it('should throw error when no access token', async () => {
      await expect(api.makeGraphQLRequest('query { test }')).rejects.toThrow('No access token available');
    });
  });

  describe('getJobDetails', () => {
    it('should return null for invalid job URL', async () => {
      const result = await api.getJobDetails('invalid-url');
      expect(result).toBeNull();
    });

    it('should handle GraphQL request failures', async () => {
      // Mock the makeGraphQLRequest method to return null
      jest.spyOn(api as any, 'makeGraphQLRequest').mockResolvedValue(null);

      const result = await api.getJobDetails('https://www.upwork.com/jobs/~0123456789abcdef');
      expect(result).toBeNull();
    });
  });

  describe('searchJobs', () => {
    it('should handle GraphQL request failures', async () => {
      // Mock the makeGraphQLRequest method to return null
      jest.spyOn(api as any, 'makeGraphQLRequest').mockResolvedValue(null);

      const result = await api.searchJobs({ query: 'test' });
      expect(result).toBeNull();
    });

    it('should handle empty search results', async () => {
      // Mock the makeGraphQLRequest method to return empty results
      jest.spyOn(api as any, 'makeGraphQLRequest').mockResolvedValue({
        data: {
          marketplaceJobPostingsSearch: {
            edges: [],
            pageInfo: { hasNextPage: false, endCursor: null },
            totalCount: 0
          }
        }
      });

      const result = await api.searchJobs({ query: 'test' });
      expect(result).toEqual({
        jobs: [],
        total: 0,
        hasMore: false,
        nextOffset: null
      });
    });
  });

  describe('formatJobData', () => {
    it('should format job data correctly', () => {
      const mockUpworkJob = {
        id: 'test-job-123',
        title: 'Test Job',
        description: 'This is a test job description with "secret word" mentioned.',
        budget: {
          amount: 1000,
          currency: 'USD',
          type: 'fixed'
        },
        client: {
          id: 'test-client-123',
          name: 'Test Client',
          location: 'United States',
          rating: 4.5,
          totalSpent: 50000,
          totalHired: 10,
          totalReviews: 15,
          avgHourlyRate: 75,
          memberSince: '2020-01-01'
        },
        experience: 'intermediate',
        postedDate: '2024-01-01',
        skills: ['JavaScript', 'TypeScript']
      };

      const result = (api as any).formatJobData(mockUpworkJob);

      expect(result).toMatchObject({
        id: 'test-job-123',
        title: 'Test Job',
        description: 'This is a test job description with "secret word" mentioned.',
        budget: {
          low: 800,
          high: 1200,
          type: 'fixed',
          currency: 'USD'
        },
        client: {
          id: 'test-client-123',
          name: 'Test Client',
          location: 'United States',
          rating: 4.5,
          totalSpent: 50000,
          totalHired: 10,
          totalReviews: 15,
          avgHourlyRate: 75,
          memberSince: '2020-01-01'
        },
        experience: 'intermediate',
        postedDate: '2024-01-01',
        skills: ['JavaScript', 'TypeScript'],
        projectType: 'misc',
        complexity: 'medium',
        budgetType: 'fixed'
      });

      // Check that secret words were extracted
      expect(result.secretWords).toContain('secret word');
    });
  });

  describe('extractApplicationRequirements', () => {
    it('should extract secret words from description', () => {
      const description = 'Please mention "blue sky" in your proposal and include "green grass" somewhere.';
      
      const result = (api as any).extractApplicationRequirements(description);
      
      expect(result.secretWords).toContain('blue sky');
      expect(result.secretWords).toContain('green grass');
    });

    it('should detect application requirements', () => {
      const description = 'Please attach your portfolio and provide a cover letter with samples.';
      
      const result = (api as any).extractApplicationRequirements(description);
      
      expect(result.attachments).toBe(true);
      expect(result.portfolio).toBe(true);
      expect(result.coverLetter).toBe(true);
    });

    it('should extract questions from description', () => {
      const description = `
        Please answer these questions:
        - What is your experience level?
        - How long will this take?
        - Can you provide references?
      `;
      
      const result = (api as any).extractApplicationRequirements(description);
      
      expect(result.questions.length).toBeGreaterThan(0);
      expect(result.questions.some(q => q.includes('experience level'))).toBe(true);
    });
  });

  describe('mapExperienceLevel', () => {
    it('should map UpWork experience levels correctly', () => {
      const mapper = (api as any).mapExperienceLevel;
      
      expect(mapper('entry')).toBe('entry');
      expect(mapper('intermediate')).toBe('intermediate');
      expect(mapper('expert')).toBe('expert');
      expect(mapper('unknown')).toBe('unknown');
      expect(mapper('Entry')).toBe('entry');
      expect(mapper('EXPERT')).toBe('expert');
    });
  });

  describe('extractJobId', () => {
    it('should extract job ID from valid URLs', () => {
      const extractor = (api as any).extractJobId;
      
      expect(extractor('https://www.upwork.com/jobs/~0123456789abcdef')).toBe('0123456789abcdef');
      expect(extractor('https://www.upwork.com/jobs/~fedcba9876543210')).toBe('fedcba9876543210');
    });

    it('should return null for invalid URLs', () => {
      const extractor = (api as any).extractJobId;
      
      expect(extractor('https://www.upwork.com/jobs/')).toBeNull();
      expect(extractor('https://example.com/jobs/~123')).toBeNull();
      expect(extractor('not-a-url')).toBeNull();
    });
  });
}); 