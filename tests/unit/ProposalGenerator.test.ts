// tests/unit/ProposalGenerator.test.ts
import { ProposalGenerator, ProposalGenerationResult } from '../../src/services/ProposalGenerator';
import { JobData } from '../../src/types/JobData';
import fs from 'fs';
import path from 'path';

// Mock fs
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn()
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ProposalGenerator', () => {
  let generator: ProposalGenerator;
  let mockJobData: JobData;
  const mockTemplateName = 'test-template.txt';
  const mockTemplateContent = 'Hello [Client], I can help you [Key Outcome or Problem — 3–7 words] for your [Job Title] project.';

  beforeEach(() => {
    generator = new ProposalGenerator();
    jest.clearAllMocks();

    mockJobData = {
      id: 'test-job-1',
      title: 'React Developer Needed',
      description: 'We need a React developer to build a modern web application with TypeScript and Node.js backend. The project involves creating a dashboard with real-time data visualization and user authentication.',
      experience: 'expert',
      budget: {
        type: 'range',
        low: 5000,
        high: 10000,
        currency: 'USD'
      },
      proposals: 15,
      client: {
        location: 'United States',
        avgHourlyRate: 75,
        totalSpent: 50000,
        hireRate: 85,
        totalReviews: 20,
        avgRating: 4.8
      },
      projectType: 'fixed-price',
      skills: ['React', 'TypeScript', 'Node.js'],
      url: 'https://www.upwork.com/jobs/~0123456789',
      applicationRequirements: {
        secretWords: ['REACT2024'],
        portfolioRequests: ['Portfolio/work examples requested'],
        technicalQuestions: ['Technical approach questions included'],
        specificRequests: ['Please provide examples of React projects'],
        hasStructuredApplication: true
      },
      postedDate: '2024-01-15T10:00:00Z',
      complexity: 'medium'
    };

    // Mock template file
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(mockTemplateContent);
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const defaultGenerator = new ProposalGenerator();
      expect(defaultGenerator).toBeInstanceOf(ProposalGenerator);
    });

    it('should create instance with custom options', () => {
      const customGenerator = new ProposalGenerator({
        includeProjectDetails: false,
        includeApplicationRequirements: false,
        maxDescriptionLength: 200
      });
      expect(customGenerator).toBeInstanceOf(ProposalGenerator);
    });
  });

  describe('buildProposal', () => {
    it('should generate proposal successfully', () => {
      const result = generator.buildProposal(mockJobData, mockTemplateName);

      expect(result.success).toBe(true);
      expect(result.proposal).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.templateUsed).toBe(mockTemplateName);
      expect(result.metadata?.customizationCount).toBeGreaterThan(0);
      expect(result.metadata?.processingTime).toBeGreaterThan(0);
    });

    it('should replace template placeholders correctly', () => {
      const result = generator.buildProposal(mockJobData, mockTemplateName);

      expect(result.proposal).toContain('Hello there');
      expect(result.proposal).toContain('React Developer Needed');
      expect(result.proposal).not.toContain('[Client]');
      expect(result.proposal).not.toContain('[Job Title]');
    });

    it('should include application requirements when enabled', () => {
      const result = generator.buildProposal(mockJobData, mockTemplateName);

      expect(result.proposal).toContain('REACT2024');
      expect(result.proposal).toContain('Application Requirements Addressed');
      expect(result.proposal).toContain('Portfolio/Work Examples');
      expect(result.proposal).toContain('Technical Approach');
    });

    it('should include project details when enabled', () => {
      const result = generator.buildProposal(mockJobData, mockTemplateName);

      expect(result.proposal).toContain('Project Details');
      expect(result.proposal).toContain('React Developer Needed');
      expect(result.proposal).toContain('expert');
      expect(result.proposal).toContain('$5000 - $10000');
    });

    it('should handle missing template file', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = generator.buildProposal(mockJobData, 'nonexistent-template.txt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template file not found');
    });

    it('should handle file read errors', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = generator.buildProposal(mockJobData, mockTemplateName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Proposal generation failed');
    });

    it('should work with custom options', () => {
      const customGenerator = new ProposalGenerator({
        includeProjectDetails: false,
        includeApplicationRequirements: false
      });

      const result = customGenerator.buildProposal(mockJobData, mockTemplateName);

      expect(result.success).toBe(true);
      expect(result.proposal).not.toContain('Project Details');
      expect(result.proposal).not.toContain('Application Requirements Addressed');
    });

    it('should extract key outcome from job description', () => {
      const result = generator.buildProposal(mockJobData, mockTemplateName);

      // Should extract a meaningful outcome from the description
      expect(result.proposal).not.toContain('[Key Outcome or Problem — 3–7 words]');
      expect(result.proposal).toContain('build React Developer Needed');
    });

    it('should handle jobs without application requirements', () => {
      const jobDataWithoutRequirements = {
        ...mockJobData,
        applicationRequirements: {
          secretWords: [],
          portfolioRequests: [],
          technicalQuestions: [],
          specificRequests: [],
          hasStructuredApplication: false
        }
      };

      const result = generator.buildProposal(jobDataWithoutRequirements, mockTemplateName);

      expect(result.success).toBe(true);
      expect(result.proposal).not.toContain('REACT2024');
      expect(result.proposal).not.toContain('Application Requirements Addressed');
    });

    it('should handle jobs with not-specified budget', () => {
      const jobDataWithoutBudget = {
        ...mockJobData,
        budget: {
          type: 'not-specified',
          currency: 'USD'
        }
      };

      const result = generator.buildProposal(jobDataWithoutBudget, mockTemplateName);

      expect(result.success).toBe(true);
      expect(result.proposal).toContain('$N/A - $N/A');
    });
  });

  describe('validateTemplate', () => {
    it('should return true for existing template', () => {
      mockFs.existsSync.mockReturnValue(true);

      const result = generator.validateTemplate(mockTemplateName);

      expect(result).toBe(true);
    });

    it('should return false for non-existing template', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = generator.validateTemplate('nonexistent-template.txt');

      expect(result).toBe(false);
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return list of available templates', () => {
      const mockFiles = ['template1.txt', 'template2.txt', 'readme.md', 'template3.txt'];
      
      // Mock fs.readdirSync
      const originalReaddirSync = fs.readdirSync;
      fs.readdirSync = jest.fn().mockReturnValue(mockFiles);

      const result = generator.getAvailableTemplates();

      expect(result).toEqual(['template1.txt', 'template2.txt', 'template3.txt']);

      // Restore original function
      fs.readdirSync = originalReaddirSync;
    });

    it('should return empty array when templates directory does not exist', () => {
      // Mock fs.readdirSync to throw error
      const originalReaddirSync = fs.readdirSync;
      fs.readdirSync = jest.fn().mockImplementation(() => {
        throw new Error('Directory not found');
      });

      const result = generator.getAvailableTemplates();

      expect(result).toEqual([]);

      // Restore original function
      fs.readdirSync = originalReaddirSync;
    });
  });

  describe('description summary extraction', () => {
    it('should truncate long descriptions', () => {
      const longDescription = 'A'.repeat(200);
      const jobDataWithLongDescription = {
        ...mockJobData,
        description: longDescription
      };

      const result = generator.buildProposal(jobDataWithLongDescription, mockTemplateName);

      expect(result.success).toBe(true);
      expect(result.proposal).toContain('A'.repeat(100) + '...');
    });

    it('should keep short descriptions as-is', () => {
      const shortDescription = 'Short description';
      const jobDataWithShortDescription = {
        ...mockJobData,
        description: shortDescription
      };

      const result = generator.buildProposal(jobDataWithShortDescription, mockTemplateName);

      expect(result.success).toBe(true);
      expect(result.proposal).toContain(shortDescription);
    });
  });
}); 