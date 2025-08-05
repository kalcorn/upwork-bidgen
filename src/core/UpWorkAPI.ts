// src/core/UpWorkAPI.ts - UpWork GraphQL API client for job data retrieval
import axios, { AxiosResponse, AxiosError } from 'axios';
import inquirer from 'inquirer';
import { CredentialsManager } from './CredentialsManager';
import {
  UpWorkCredentials,
  GraphQLRequest,
  GraphQLResponse,
  JobSearchResponse,
  JobDetailsResponse
} from '../types/API';
// JobData interface with working scalar fields only (complex objects removed due to GraphQL errors)
export interface JobData {
  id: string;
  title: string;
  description: string;
  ciphertext?: string;
  duration?: string;
  durationLabel?: string;
  engagement?: string;
  recordNumber?: string;
  experienceLevel: string;
  category?: string;
  subcategory?: string;
  freelancersToHire?: number;
  enterprise?: boolean;
  relevanceEncoded?: string;
  totalApplicants?: number; // This is the proposal count field!
  preferredFreelancerLocation?: string[];
  preferredFreelancerLocationMandatory?: boolean;
  premium?: boolean;
  clientNotSureFields?: string;
  clientPrivateFields?: string;
  applied?: boolean;
  createdDateTime?: string;
  publishedDateTime?: string;
  renewedDateTime?: string;
  hourlyBudgetType?: string;
  localJobUserDistance?: string;
  totalFreelancersToHire?: number;
  teamId?: string;
  amount?: {
    rawValue?: string;
    currency?: string;
    displayValue?: string;
  };
  hourlyBudgetMin?: {
    rawValue?: string;
    currency?: string;
    displayValue?: string;
  };
  hourlyBudgetMax?: {
    rawValue?: string;
    currency?: string;
    displayValue?: string;
  };
  client?: {
    totalHires?: number;
    totalPostedJobs?: number;
    totalSpent?: {
      rawValue?: number;
      currency?: string;
      displayValue?: string;
    };
    verificationStatus?: string;
    location?: {
      country?: string;
      city?: string;
      state?: string;
      timezone?: string;
    };
    totalReviews?: number;
    totalFeedback?: number;
    companyName?: string;
    hasFinancialPrivacy?: boolean;
  } | undefined;
}

export interface JobSearchParams {
  sortAttributes?: { field: string }[];
  searchType?: string;
  marketPlaceJobFilter?: {
    hourlyRate_eq?: { rangeStart: number; rangeEnd: number; };
    budgetRange_eq?: { rangeStart: number; rangeEnd: number; };
    proposalRange_eq?: { rangeStart: number; rangeEnd: number; };
    pagination_eq?: { after: string; first: number; };
    categoryIds_any?: number[];
  };
}

export interface JobSearchResult {
  jobs: JobData[];
  total: number;
  hasMore: boolean;
  nextOffset: string | null;
}

export interface JobUrlParseResult {
  jobId: string;
  isValid: boolean;
  error?: string;
}
import { AppConfig } from '../types/Config';

export class UpWorkAPI {
  private config: AppConfig;
  private graphqlURL: string;
  private credentialsManager: CredentialsManager;
  private credentials: UpWorkCredentials | null;
  private accessToken: string | null;
  private refreshToken: string | null;

  constructor(config: AppConfig) {
    this.config = config;
    this.graphqlURL = 'https://api.upwork.com/graphql';
    this.credentialsManager = new CredentialsManager(config.upwork.credentialsFile);
    this.credentials = null;
    this.accessToken = null;
    this.refreshToken = null;
  }

  /**
   * Initialize authentication with OAuth 2.0 flow
   */
  async authenticate(): Promise<{ success: boolean; message: string }> {
    try {
      // Check if credentials exist
      if (!this.credentialsManager.hasCredentials()) {
        console.log('🔐 No UpWork credentials found');
        console.log('   Run: npm run setup to configure API access');
        console.log('   Note: Manual entry mode will be used instead');
        return {
          success: false,
          message: 'No credentials found. Using manual entry mode.'
        };
      }

      // Load credentials securely
      this.credentials = await this.credentialsManager.loadCredentials();
      if (!this.credentials) {
        return {
          success: false,
          message: 'Failed to load credentials. Using manual entry mode.'
        };
      }

      // Use existing access token if available
      if (this.credentials.accessToken) {
        this.accessToken = this.credentials.accessToken;
        this.refreshToken = this.credentials.refreshToken || null;
        console.log('✅ Using existing access token from credentials file.');
        return {
          success: true,
          message: 'Authentication successful with stored token'
        };
      }

      // If no token, start the interactive OAuth flow.
      console.log('🔄 No access token found, starting OAuth 2.0 flow...');
      const oauthResult = await this.performOAuth2Flow();
      if (!oauthResult.success) {
        return oauthResult;
      }

      console.log('✅ UpWork API authentication successful.');
      return {
        success: true,
        message: 'OAuth 2.0 authentication successful'
      };

    } catch (error) {
      console.error('❌ Authentication failed:', error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        message: 'Authentication failed. Using manual entry mode.'
      };
    }
  }

  /**
   * Perform OAuth 2.0 flow to get access tokens
   */
  private async performOAuth2Flow(): Promise<{ success: boolean; message: string }> {
    try {
      // Start authorization flow
      const authResult = await this.startAuthorizationFlow();
      if (!authResult.success) {
        return authResult;
      }

      // Exchange authorization code for access token
      const tokenResult = await this.getAccessTokenFromCode(authResult.authorizationCode!);
      if (!tokenResult.success) {
        return tokenResult;
      }

      // Save credentials
      await this.credentialsManager.saveCredentials({
        ...this.credentials!,
        accessToken: this.accessToken!,
        refreshToken: this.refreshToken || ''
      });

      return {
        success: true,
        message: 'OAuth 2.0 flow completed successfully'
      };

    } catch (error) {
      return {
        success: false,
        message: `OAuth 2.0 flow failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Start OAuth 2.0 authorization flow
   */
  private async startAuthorizationFlow(): Promise<{
    success: boolean;
    message: string;
    authorizationCode?: string;
  }> {
    try {
      const authUrl = `https://www.upwork.com/ab/account-security/oauth2/authorize?client_id=${this.credentials!.apiKey}&response_type=code&redirect_uri=${encodeURIComponent(this.config.upwork.oauthRedirectUri)}`;

      console.log('\n🌐 Please visit this URL in your browser to authorize the application:');
      console.log(authUrl);
      console.log('\nAfter authorizing, you will be redirected to a localhost URL.');

      const { redirectUrl } = await inquirer.prompt([
        {
          type: 'input',
          name: 'redirectUrl',
          message: 'Paste the full redirect URL here:',
        }
      ]);

      const code = new URL(redirectUrl).searchParams.get('code');

      if (!code) {
        return {
          success: false,
          message: 'Could not find authorization code in the URL.'
        }
      }

      return {
        success: true,
        message: 'Authorization code received.',
        authorizationCode: code
      };

    } catch (error) {
      return {
        success: false,
        message: `Authorization flow failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async getAccessTokenFromCode(authorizationCode: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const tokenUrl = 'https://www.upwork.com/api/v3/oauth2/token';
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        client_id: this.credentials!.apiKey,
        client_secret: this.credentials!.apiSecret,
        redirect_uri: this.config.upwork.oauthRedirectUri
      });

      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokenData = response.data;
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token;

      return {
        success: true,
        message: 'Access token obtained successfully'
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }







  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      if (!this.refreshToken) {
        return false;
      }

      const tokenUrl = 'https://www.upwork.com/services/api/auth/token';
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.credentials!.apiKey,
        client_secret: this.credentials!.apiSecret
      });

      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokenData = response.data;
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token;

      // Save updated credentials
      await this.credentialsManager.saveCredentials({
        ...this.credentials!,
        accessToken: this.accessToken || '',
        ...(this.refreshToken && { refreshToken: this.refreshToken })
      });

      return true;

    } catch (error) {
      console.error('Failed to refresh access token:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Make GraphQL request to UpWork API
   */
  async makeGraphQLRequest<T = any>(
    query: string,
    variables: Record<string, any> = {}
  ): Promise<GraphQLResponse<T> | null> {
    try {
      if (!this.accessToken) {
        throw new Error('No access token available');
      }

      const request: GraphQLRequest = {
        query,
        variables
      };

      const response: AxiosResponse<GraphQLResponse<T>> = await axios.post(
        this.graphqlURL,
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.upwork.requestTimeout
        }
      );

      if (response.data.errors) {
        const errorMessage = response.data.errors.map((e: any) => e.message).join(', ');
        throw new Error(`GraphQL errors: ${errorMessage}`);
      }

      return response.data;

    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        // Token expired, try to refresh
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the request
          return this.makeGraphQLRequest(query, variables);
        } else {
          // Refresh failed, clear only tokens and start OAuth flow
          console.log('🔄 Access token expired and refresh failed. Starting reauthorization...');
          await this.credentialsManager.clearTokens();
          this.accessToken = null;
          this.refreshToken = null;
          
          // Start OAuth flow (will reuse existing API keys)
          await this.authenticate();
          
          // Retry the request with new token
          return this.makeGraphQLRequest(query, variables);
        }
      }

      console.error('GraphQL request failed:', error instanceof Error ? error.message : 'Unknown error');
      throw error; // Re-throw the error so CLI can see it
    }
  }

  /**
   * Get job details from UpWork URL
   */
  async getJobDetails(jobUrl: string): Promise<JobData | null> {
    try {
      // Authenticate first
      const authResult = await this.authenticate();
      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.message}`);
      }

      const jobId = this.extractJobId(jobUrl);
      if (!jobId) {
        throw new Error('Invalid job URL');
      }

      const query = `
        query GetJobDetails($jobId: ID!) {
          marketplaceJobPosting(id: $jobId) {
            id
            title
            description
            budget {
              amount
              currency
              type
            }
            client {
              id
              name
              location
              rating
              totalSpent
              totalHired
              totalReviews
              avgHourlyRate
              memberSince
            }
            experience
            postedDate
            skills
            applicationRequirements {
              secretWords
              questions
              attachments
              portfolio
              coverLetter
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest<JobDetailsResponse>(query, { jobId });
      if (!response || !response.data?.marketplaceJobPosting) {
        throw new Error(`No job data found for job ID: ${jobId}. The job may not exist or you may not have access to it.`);
      }

      return this.formatJobData(response.data.marketplaceJobPosting);

    } catch (error) {
      console.error('Failed to get job details:', error instanceof Error ? error.message : 'Unknown error');
      throw error; // Re-throw the error so CLI can see it
    }
  }

  /**
   * Extract job ID from UpWork URL
   */
  private extractJobId(url: string): string | null {
    // Try different URL patterns
    const patterns = [
      /\/jobs\/~([a-f0-9]+)/,  // Old format: /jobs/~0123456789
      /\/jobs\/([a-f0-9]+)/,   // New format: /jobs/0123456789
      /\/jobs\/[^\/]+\~([a-f0-9]+)/  // Format with title: /jobs/title~0123456789
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1] || null;
      }
    }

    return null;
  }

  /**
   * Format raw job data into standardized format
   */
  private formatJobData(jobData: any): JobData {
    // Pass through working scalar fields only (complex objects removed due to GraphQL subselection errors)
    return {
      id: jobData.id,
      title: jobData.title,
      description: jobData.description,
      ciphertext: jobData.ciphertext,
      duration: jobData.duration,
      durationLabel: jobData.durationLabel,
      engagement: jobData.engagement,
      recordNumber: jobData.recordNumber,
      experienceLevel: jobData.experienceLevel,
      category: jobData.category,
      subcategory: jobData.subcategory,
      freelancersToHire: jobData.freelancersToHire,
      enterprise: jobData.enterprise,
      relevanceEncoded: jobData.relevanceEncoded,
      totalApplicants: jobData.totalApplicants,
      preferredFreelancerLocation: jobData.preferredFreelancerLocation,
      preferredFreelancerLocationMandatory: jobData.preferredFreelancerLocationMandatory,
      premium: jobData.premium,
      clientNotSureFields: jobData.clientNotSureFields,
      clientPrivateFields: jobData.clientPrivateFields,
      applied: jobData.applied,
      createdDateTime: jobData.createdDateTime,
      publishedDateTime: jobData.publishedDateTime,
      renewedDateTime: jobData.renewedDateTime,
      hourlyBudgetType: jobData.hourlyBudgetType,
      localJobUserDistance: jobData.localJobUserDistance,
      totalFreelancersToHire: jobData.totalFreelancersToHire,
      teamId: jobData.teamId,
      amount: jobData.amount,
      hourlyBudgetMin: jobData.hourlyBudgetMin,
      hourlyBudgetMax: jobData.hourlyBudgetMax,
      client: jobData.client ? {
        totalHires: jobData.client.totalHires,
        totalPostedJobs: jobData.client.totalPostedJobs,
        totalSpent: jobData.client.totalSpent,
        verificationStatus: jobData.client.verificationStatus,
        location: jobData.client.location,
        totalReviews: jobData.client.totalReviews,
        totalFeedback: jobData.client.totalFeedback,
        companyName: jobData.client.companyName,
        hasFinancialPrivacy: jobData.client.hasFinancialPrivacy
      } : undefined
    };
  }


  /**
   * Search for jobs with filters
   */
  /**
   * Introspect GraphQL schema to discover available fields
   */
  async introspectJobSchema(): Promise<any> {
    try {
      const query = `
        query IntrospectJobSchema {
          __schema {
            types {
              name
              description
              fields {
                name
                type {
                  name
                  ofType {
                    name
                  }
                }
                description
              }
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);
      if (!response || !response.data?.__schema) {
        console.log('No schema data returned from introspection');
        return null;
      }

      // Filter for job-related types
      const jobTypes = response.data.__schema.types.filter((type: any) =>
        type.name && (
          type.name.includes('Job') ||
          type.name.includes('Marketplace') ||
          type.name.includes('Posting')
        )
      );

      console.log('\n🔍 Job-related GraphQL Types:');
      console.log('='.repeat(60));
      jobTypes.forEach((type: any) => {
        console.log(`\n📋 Type: ${type.name}`);
        if (type.description) console.log(`   Description: ${type.description}`);
        if (type.fields) {
          console.log('   Available Fields:');
          type.fields.forEach((field: any) => {
            const typeName = field.type?.name || field.type?.ofType?.name || 'Unknown';
            console.log(`     • ${field.name}: ${typeName}`);
            if (field.description) console.log(`       - ${field.description}`);
          });
        }
      });
      console.log('='.repeat(60));

      return jobTypes;
    } catch (error) {
      console.error('Failed to introspect schema:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Get available job categories
   */
  async getCategories(): Promise<any> {
    try {
      const query = `
        query GetCategories {
          ontologyCategories {
            id
            preferredLabel
            subcategories {
              id
              preferredLabel
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);
      if (!response || !response.data?.ontologyCategories) {
        console.log('No categories returned from API');
        return null;
      }

      return response.data.ontologyCategories;
    } catch (error) {
      console.error('Failed to get categories:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Search for jobs using GraphQL with filtering
   */
  async searchJobs(filters: JobSearchParams = {}): Promise<JobSearchResult | null> {
    try {
      // Use the search format you provided
      const query = `
                                query SearchJobs($sortAttributes: [MarketplaceJobPostingSearchSortAttribute!], $searchType: MarketplaceJobPostingSearchType!, $marketPlaceJobFilter: MarketplaceJobPostingsSearchFilter!) {
          marketplaceJobPostingsSearch(
            sortAttributes: $sortAttributes
            searchType: $searchType
            marketPlaceJobFilter: $marketPlaceJobFilter
          ) {
            edges {
              node {
                id
                title
                description
                ciphertext
                duration
                durationLabel
                engagement
                recordNumber
                experienceLevel
                category
                subcategory
                freelancersToHire
                enterprise
                relevanceEncoded
                totalApplicants
                preferredFreelancerLocation
                preferredFreelancerLocationMandatory
                premium
                clientNotSureFields
                clientPrivateFields
                applied
                createdDateTime
                publishedDateTime
                renewedDateTime
                hourlyBudgetType
                localJobUserDistance
                totalFreelancersToHire
                teamId
                amount {
                  rawValue
                  currency
                  displayValue
                }
                hourlyBudgetMin {
                  rawValue
                  currency
                  displayValue
                }
                hourlyBudgetMax {
                  rawValue
                  currency
                  displayValue
                }
                weeklyBudget {
                  rawValue
                  currency
                  displayValue
                }
                engagementDuration {
                  id
                  label
                  weeks
                }
                relevance {
                  id
                  effectiveCandidates
                  recommendedEffectiveCandidates
                  uniqueImpressions
                  publishTime
                  hoursInactive
                }
                client {
                  totalHires
                  totalPostedJobs
                  totalSpent {
                    rawValue
                    currency
                    displayValue
                  }
                  verificationStatus
                  location {
                    country
                    city
                    state
                    timezone
                  }
                  totalReviews
                  totalFeedback
                  companyName
                  hasFinancialPrivacy
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
            totalCount
          }
        }
      `;

      const variables = {
        sortAttributes: filters.sortAttributes || { field: ["RECENCY"] },
        searchType: filters.searchType || "USER_JOBS_SEARCH",
        marketPlaceJobFilter: {
          ...filters.marketPlaceJobFilter,
          ...(filters.marketPlaceJobFilter?.hourlyRate_eq && {
            hourlyRate_eq: filters.marketPlaceJobFilter.hourlyRate_eq
          }),
          ...(filters.marketPlaceJobFilter?.budgetRange_eq && {
            budgetRange_eq: filters.marketPlaceJobFilter.budgetRange_eq
          }),
          ...(filters.marketPlaceJobFilter?.proposalRange_eq && {
            proposalRange_eq: filters.marketPlaceJobFilter.proposalRange_eq
          }),
          pagination_eq: filters.marketPlaceJobFilter?.pagination_eq || config.upwork.searchFilters.marketPlaceJobFilter.pagination_eq,
          ...(filters.marketPlaceJobFilter?.categoryIds_any && {
            categoryIds_any: filters.marketPlaceJobFilter.categoryIds_any
          })
        }
      };

      console.log('🔍 Executing job search with variables:', JSON.stringify(variables, null, 2));

      const response = await this.makeGraphQLRequest<JobSearchResponse>(query, variables);
      if (!response || !response.data?.marketplaceJobPostingsSearch) {
        console.log('No search results returned from API');
        return null;
      }

      // Debug: Raw API response (disabled for cleaner output)
      console.log('\n🔍 Raw API Response:');
      console.log('='.repeat(60));
      console.log(JSON.stringify(response, null, 2));
      console.log('='.repeat(60));

      const searchData = response.data.marketplaceJobPostingsSearch;

      return {
        jobs: searchData.edges.map(edge => this.formatJobData(edge.node)),
        total: searchData.totalCount,
        hasMore: searchData.pageInfo.hasNextPage,
        nextOffset: searchData.pageInfo.endCursor || null
      };

    } catch (error) {
      console.error('Failed to search jobs:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
      return null;
    }
  }



  /**
   * Parse job URL and extract information
   */
  parseJobUrl(url: string): JobUrlParseResult {
    const jobId = this.extractJobId(url);

    if (!jobId) {
      return {
        jobId: '',
        isValid: false,
        error: 'Invalid UpWork job URL format'
      };
    }

    return {
      jobId,
      isValid: true
    };
  }


  /**
   * Check if API is available and authenticated
   */
  isAvailable(): boolean {
    return !!(this.accessToken && this.credentials);
  }

  /**
   * Get API status information
   */
  getStatus(): {
    authenticated: boolean;
    hasCredentials: boolean;
    tokenValid: boolean;
  } {
    return {
      authenticated: !!this.accessToken,
      hasCredentials: !!this.credentials,
      tokenValid: !!this.accessToken
    };
  }
}

import config from '../config';

// Export singleton instance
export const upworkAPI = new UpWorkAPI(config); 