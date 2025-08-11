// tests/unit/ManualEntry.test.ts
import { ManualEntry, ManualEntryResult } from '../../src/runners/ManualEntry';
import { JobData } from '../../src/types/JobData';
import inquirer from 'inquirer';

// Mock inquirer
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

const mockInquirer = inquirer as jest.Mocked<typeof inquirer>;

describe('ManualEntry', () => {
  let manualEntry: ManualEntry;
  const mockUrl = 'https://www.upwork.com/jobs/~0123456789';

  beforeEach(() => {
    manualEntry = new ManualEntry();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const defaultEntry = new ManualEntry();
      expect(defaultEntry).toBeInstanceOf(ManualEntry);
    });

    it('should create instance with custom options', () => {
      const customEntry = new ManualEntry({
        testMode: true,
        skipValidation: true
      });
      expect(customEntry).toBeInstanceOf(ManualEntry);
    });
  });

  describe('collectJobDataManually', () => {
    it('should collect and process job data successfully', async () => {
      const mockAnswers = {
        title: 'Test Job Title',
        description: 'This is a test job description that is long enough to pass validation',
        experience: 'Expert',
        budgetLow: '1000',
        budgetHigh: '5000',
        proposals: '10',
        clientLocation: 'United States',
        projectType: 'Fixed Price',
        skills: 'JavaScript, React, Node.js',
        hasSecretWords: true,
        secretWords: 'TEST, SECRET',
        hasPortfolioRequest: true,
        hasTechnicalQuestions: false,
        additionalRequirements: 'None'
      };

      mockInquirer.prompt.mockResolvedValue(mockAnswers);

      const result = await manualEntry.collectJobDataManually(mockUrl);

      expect(result.success).toBe(true);
      expect(result.jobData).toBeDefined();
      expect(result.jobData?.title).toBe('Test Job Title');
      expect(result.jobData?.experience).toBe('expert');
      expect(result.jobData?.projectType).toBe('fixed-price');
      expect(result.jobData?.budget.low).toBe(1000);
      expect(result.jobData?.budget.high).toBe(5000);
      expect(result.jobData?.applicationRequirements.secretWords).toEqual(['TEST', 'SECRET']);
      expect(result.jobData?.applicationRequirements.portfolioRequests).toContain('Portfolio/work examples requested');
    });

    it('should handle N/A budget values', async () => {
      const mockAnswers = {
        title: 'Test Job Title',
        description: 'This is a test job description that is long enough to pass validation',
        experience: 'Entry Level',
        budgetLow: 'N/A',
        budgetHigh: 'N/A',
        proposals: 'Unknown',
        clientLocation: 'Canada',
        projectType: 'Hourly',
        skills: 'Python, Django',
        hasSecretWords: false,
        secretWords: '',
        hasPortfolioRequest: false,
        hasTechnicalQuestions: true,
        additionalRequirements: 'None'
      };

      mockInquirer.prompt.mockResolvedValue(mockAnswers);

      const result = await manualEntry.collectJobDataManually(mockUrl);

      expect(result.success).toBe(true);
      expect(result.jobData?.budget.type).toBe('not-specified');
      expect(result.jobData?.budget.low).toBeUndefined();
      expect(result.jobData?.budget.high).toBeUndefined();
      expect(result.jobData?.proposals).toBeUndefined();
    });

    it('should handle validation errors', async () => {
      const mockAnswers = {
        title: 'Test',
        description: 'Short',
        experience: 'Intermediate',
        budgetLow: '1000',
        budgetHigh: '5000',
        proposals: '10',
        clientLocation: 'United States',
        projectType: 'Both',
        skills: 'JavaScript',
        hasSecretWords: false,
        secretWords: '',
        hasPortfolioRequest: false,
        hasTechnicalQuestions: false,
        additionalRequirements: 'None'
      };

      mockInquirer.prompt.mockResolvedValue(mockAnswers);

      const result = await manualEntry.collectJobDataManually(mockUrl);

      // With validation enabled, this should still work but with warnings
      expect(result.success).toBe(true);
      expect(result.jobData).toBeDefined();
    });

    it('should handle inquirer errors', async () => {
      mockInquirer.prompt.mockRejectedValue(new Error('Inquirer error'));

      const result = await manualEntry.collectJobDataManually(mockUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Manual data entry failed');
    });

    it('should work with skipValidation option', async () => {
      const skipValidationEntry = new ManualEntry({ skipValidation: true });
      
      const mockAnswers = {
        title: 'Test',
        description: 'Short',
        experience: 'Expert',
        budgetLow: '1000',
        budgetHigh: '5000',
        proposals: '10',
        clientLocation: 'United States',
        projectType: 'Fixed Price',
        skills: 'JavaScript',
        hasSecretWords: false,
        secretWords: '',
        hasPortfolioRequest: false,
        hasTechnicalQuestions: false,
        additionalRequirements: 'None'
      };

      mockInquirer.prompt.mockResolvedValue(mockAnswers);

      const result = await skipValidationEntry.collectJobDataManually(mockUrl);

      expect(result.success).toBe(true);
      expect(result.jobData).toBeDefined();
    });
  });

  describe('getTestJobData', () => {
    it('should return test job data with correct structure', () => {
      const result = manualEntry.getTestJobData(mockUrl);

      expect(result.success).toBe(true);
      expect(result.jobData).toBeDefined();
      expect(result.jobData?.title).toBe('React Native Expert for Powered Pregnancy App Avatar');
      expect(result.jobData?.experience).toBe('expert');
      expect(result.jobData?.budget.low).toBe(15000);
      expect(result.jobData?.budget.high).toBe(20000);
      expect(result.jobData?.applicationRequirements.secretWords).toContain('BABYAI');
      expect(result.jobData?.applicationRequirements.hasStructuredApplication).toBe(true);
    });

    it('should include all required application requirements', () => {
      const result = manualEntry.getTestJobData(mockUrl);

      expect(result.jobData?.applicationRequirements.portfolioRequests).toContain('Portfolio/work examples requested');
      expect(result.jobData?.applicationRequirements.technicalQuestions).toContain('Technical approach questions included');
      expect(result.jobData?.applicationRequirements.specificRequests).toHaveLength(3);
    });

    it('should generate unique IDs for different calls', () => {
      const result1 = manualEntry.getTestJobData(mockUrl);
      const result2 = manualEntry.getTestJobData(mockUrl);

      expect(result1.jobData?.id).not.toBe(result2.jobData?.id);
      expect(result1.jobData?.id).toMatch(/^test-\d+$/);
      expect(result2.jobData?.id).toMatch(/^test-\d+$/);
    });
  });

  describe('data processing', () => {
    it('should process skills correctly', async () => {
      const mockAnswers = {
        title: 'Test Job',
        description: 'This is a test job description that is long enough to pass validation',
        experience: 'Expert',
        budgetLow: '1000',
        budgetHigh: '5000',
        proposals: '10',
        clientLocation: 'United States',
        projectType: 'Both',
        skills: 'JavaScript, React, Node.js, TypeScript',
        hasSecretWords: false,
        secretWords: '',
        hasPortfolioRequest: false,
        hasTechnicalQuestions: false,
        additionalRequirements: 'None'
      };

      mockInquirer.prompt.mockResolvedValue(mockAnswers);

      const result = await manualEntry.collectJobDataManually(mockUrl);

      expect(result.jobData?.skills).toEqual(['JavaScript', 'React', 'Node.js', 'TypeScript']);
    });

    it('should handle empty skills', async () => {
      const mockAnswers = {
        title: 'Test Job',
        description: 'This is a test job description that is long enough to pass validation',
        experience: 'Expert',
        budgetLow: '1000',
        budgetHigh: '5000',
        proposals: '10',
        clientLocation: 'United States',
        projectType: 'Both',
        skills: 'Not specified',
        hasSecretWords: false,
        secretWords: '',
        hasPortfolioRequest: false,
        hasTechnicalQuestions: false,
        additionalRequirements: 'None'
      };

      mockInquirer.prompt.mockResolvedValue(mockAnswers);

      const result = await manualEntry.collectJobDataManually(mockUrl);

      expect(result.jobData?.skills).toEqual([]);
    });

    it('should process secret words correctly', async () => {
      const mockAnswers = {
        title: 'Test Job',
        description: 'This is a test job description that is long enough to pass validation',
        experience: 'Expert',
        budgetLow: '1000',
        budgetHigh: '5000',
        proposals: '10',
        clientLocation: 'United States',
        projectType: 'Both',
        skills: 'JavaScript',
        hasSecretWords: true,
        secretWords: 'WORD1, WORD2, WORD3',
        hasPortfolioRequest: false,
        hasTechnicalQuestions: false,
        additionalRequirements: 'None'
      };

      mockInquirer.prompt.mockResolvedValue(mockAnswers);

      const result = await manualEntry.collectJobDataManually(mockUrl);

      expect(result.jobData?.applicationRequirements.secretWords).toEqual(['WORD1', 'WORD2', 'WORD3']);
    });

    it('should handle additional requirements', async () => {
      const mockAnswers = {
        title: 'Test Job',
        description: 'This is a test job description that is long enough to pass validation',
        experience: 'Expert',
        budgetLow: '1000',
        budgetHigh: '5000',
        proposals: '10',
        clientLocation: 'United States',
        projectType: 'Both',
        skills: 'JavaScript',
        hasSecretWords: false,
        secretWords: '',
        hasPortfolioRequest: false,
        hasTechnicalQuestions: false,
        additionalRequirements: 'Custom requirement here'
      };

      mockInquirer.prompt.mockResolvedValue(mockAnswers);

      const result = await manualEntry.collectJobDataManually(mockUrl);

      expect(result.jobData?.applicationRequirements.specificRequests).toContain('Custom requirement here');
    });
  });

  describe('experience level mapping', () => {
    it('should map experience levels correctly', async () => {
      const testCases = [
        { input: 'Entry Level', expected: 'entry' },
        { input: 'Intermediate', expected: 'intermediate' },
        { input: 'Expert', expected: 'expert' },
        { input: 'Not specified', expected: 'not-specified' },
        { input: 'Unknown', expected: 'not-specified' }
      ];

      for (const testCase of testCases) {
        const mockAnswers = {
          title: 'Test Job',
          description: 'This is a test job description that is long enough to pass validation',
          experience: testCase.input,
          budgetLow: '1000',
          budgetHigh: '5000',
          proposals: '10',
          clientLocation: 'United States',
          projectType: 'Both',
          skills: 'JavaScript',
          hasSecretWords: false,
          secretWords: '',
          hasPortfolioRequest: false,
          hasTechnicalQuestions: false,
          additionalRequirements: 'None'
        };

        mockInquirer.prompt.mockResolvedValue(mockAnswers);

        const result = await manualEntry.collectJobDataManually(mockUrl);
        expect(result.jobData?.experience).toBe(testCase.expected);
      }
    });
  });

  describe('project type mapping', () => {
    it('should map project types correctly', async () => {
      const testCases = [
        { input: 'Fixed Price', expected: 'fixed-price' },
        { input: 'Hourly', expected: 'hourly' },
        { input: 'Both', expected: 'both' },
        { input: 'Not specified', expected: 'not-specified' },
        { input: 'Unknown', expected: 'not-specified' }
      ];

      for (const testCase of testCases) {
        const mockAnswers = {
          title: 'Test Job',
          description: 'This is a test job description that is long enough to pass validation',
          experience: 'Expert',
          budgetLow: '1000',
          budgetHigh: '5000',
          proposals: '10',
          clientLocation: 'United States',
          projectType: testCase.input,
          skills: 'JavaScript',
          hasSecretWords: false,
          secretWords: '',
          hasPortfolioRequest: false,
          hasTechnicalQuestions: false,
          additionalRequirements: 'None'
        };

        mockInquirer.prompt.mockResolvedValue(mockAnswers);

        const result = await manualEntry.collectJobDataManually(mockUrl);
        expect(result.jobData?.projectType).toBe(testCase.expected);
      }
    });
  });
}); 