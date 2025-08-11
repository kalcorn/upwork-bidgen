#!/usr/bin/env node

// tests/integration/UpWorkAPI.integration.test.ts - Integration tests for UpWork API
import { UpWorkAPI } from '../../src/core/UpWorkAPI';
import { ConfigManager } from '../../src/core/ConfigManager';

describe('UpWork API Integration Tests', () => {
  let upworkApi: UpWorkAPI;

  beforeAll(() => {
    const configManager = new ConfigManager();
    const appConfig = configManager.getAppConfig();
    if (!appConfig) {
      throw new Error('Failed to load application configuration');
    }
    upworkApi = new UpWorkAPI(appConfig);
  });

  describe('Authentication', () => {
    it('should authenticate successfully with valid credentials', async () => {
      const authResult = await upworkApi.authenticate();
      expect(authResult.success).toBe(true);
    }, 30000);
  });

  describe('Job Search', () => {
    it('should search for jobs successfully', async () => {
      const searchResults = await upworkApi.searchJobs({
        query: 'WordPress',
        limit: 5
      });
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
      
      if (searchResults.length > 0) {
        const firstJob = searchResults[0];
        expect(firstJob).toHaveProperty('id');
        expect(firstJob).toHaveProperty('title');
        expect(firstJob).toHaveProperty('description');
      }
    }, 30000);

    it('should handle empty search results gracefully', async () => {
      const searchResults = await upworkApi.searchJobs({
        query: 'very-specific-unique-term-that-should-not-exist',
        limit: 5
      });
      
      expect(Array.isArray(searchResults)).toBe(true);
    }, 30000);
  });

  describe('Job Details', () => {
    it('should fetch job details by ID', async () => {
      // First search for a job to get a valid ID
      const searchResults = await upworkApi.searchJobs({
        query: 'WordPress',
        limit: 1
      });
      
      if (searchResults.length > 0) {
        const jobId = searchResults[0].id;
        const jobData = await upworkApi.getJobDetails(jobId);
        
        expect(jobData).toHaveProperty('id');
        expect(jobData).toHaveProperty('title');
        expect(jobData).toHaveProperty('description');
        expect(jobData).toHaveProperty('budget');
        expect(jobData).toHaveProperty('client');
      }
    }, 30000);
  });


  describe('GraphQL Requests', () => {
    it('should make GraphQL requests successfully', async () => {
      const query = `
        query SearchJobs {
          marketplaceJobPostingsSearch(
            searchType: USER_JOBS_SEARCH
          ) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      `;
      
      const result = await upworkApi.makeGraphQLRequest(query);
      
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('marketplaceJobPostingsSearch');
    }, 30000);
  });
}); 