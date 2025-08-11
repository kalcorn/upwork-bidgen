// src/core/UpWorkAPI.ts - UpWork GraphQL API client for job data retrieval
import axios, { AxiosResponse, AxiosError } from 'axios';
import { CredentialsManager } from './CredentialsManager';
import { UpWorkDaemon } from '../services/UpWorkDaemon';
import {
  UpWorkCredentials,
  GraphQLRequest,
  GraphQLResponse,
  JobSearchResponse,
  JobDetailsResponse
} from '../types/API';
// Comprehensive JobData interface with all discovered fields from MarketplaceJobPosting
export interface JobData {
  // Basic fields
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
  totalApplicants?: number;
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

  // New comprehensive fields from MarketplaceJobPosting introspection
  workFlowState?: {
    status?: string;
    closeResult?: string;
  };
  canClientReceiveContractProposal?: boolean;
  
  // Content structure from API
  content?: {
    title?: string;
    description?: string;
  };
  
  // Classification
  classification?: {
    category?: {
      id?: string;
      preferredLabel?: string;
      parentCategory?: {
        id?: string;
        preferredLabel?: string;
      };
    };
    subCategory?: {
      id?: string;
      preferredLabel?: string;
      parentCategory?: {
        id?: string;
        preferredLabel?: string;
      };
    };
    occupation?: {
      id?: string;
      preferredLabel?: string;
    };
    skills?: Array<{
      id?: string;
      preferredLabel?: string;
      ontologySkill?: {
        id?: string;
        preferredLabel?: string;
      };
    }>;
    additionalSkills?: Array<{
      id?: string;
      preferredLabel?: string;
      ontologySkill?: {
        id?: string;
        preferredLabel?: string;
      };
    }>;
  };

  // Contract Terms
  contractTerms?: {
    contractStartDate?: string;
    contractEndDate?: string;
    contractType?: string;
    onSiteType?: string;
    personsToHire?: number;
    experienceLevel?: string;
    notSurePersonsToHire?: boolean;
    notSureExperiencelevel?: boolean;
    fixedPriceContractTerms?: {
      amount?: {
        rawValue?: string;
        currency?: string;
        displayValue?: string;
      };
      maxAmount?: {
        rawValue?: string;
        currency?: string;
        displayValue?: string;
      };
      engagementDuration?: {
        id?: string;
        label?: string;
        weeks?: number;
      };
    };
    hourlyContractTerms?: {
      engagementDuration?: {
        id?: string;
        label?: string;
        weeks?: number;
      };
      engagementType?: string;
      notSureProjectDuration?: boolean;
      hourlyBudgetType?: string;
      hourlyBudgetMin?: string;
      hourlyBudgetMax?: string;
    };
  };

  // Contractor Selection
  contractorSelection?: {
    proposalRequirement?: {
      coverLetterRequired?: boolean;
      freelancerMilestonesAllowed?: boolean;
      screeningQuestions?: Array<{
        id?: string;
        question?: string;
        required?: boolean;
        options?: Array<{
          id?: string;
          option?: string;
        }>;
      }>;
    };
    qualification?: any; // Will be defined based on actual API response
    location?: any; // Will be defined based on actual API response
  };

  // Ownership
  ownership?: {
    company?: {
      id?: string;
      name?: string;
      description?: string;
    };
    team?: {
      id?: string;
      name?: string;
      description?: string;
    };
  };

  // Client Company Public Info
  clientCompanyPublic?: {
    id?: string;
    legacyType?: string;
    teamsEnabled?: boolean;
    canHire?: boolean;
    hidden?: boolean;
    country?: {
      name?: string;
    };
    state?: string;
    city?: string;
    timezone?: string;
    accountingEntity?: string;
    billingType?: string;
    agencyDetails?: any; // Will be defined based on actual API response
  };

  // Activity Statistics
  activityStat?: {
    applicationsBidStats?: {
      avgRateBid?: {
        rawValue?: string;
        currency?: string;
        displayValue?: string;
      };
      minRateBid?: {
        rawValue?: string;
        currency?: string;
        displayValue?: string;
      };
      maxRateBid?: {
        rawValue?: string;
        currency?: string;
        displayValue?: string;
      };
      avgInterviewedRateBid?: {
        rawValue?: string;
        currency?: string;
        displayValue?: string;
      };
    };
    jobActivity?: {
      lastClientActivity?: string;
      invitesSent?: number;
      totalInvitedToInterview?: number;
      totalHired?: number;
      totalUnansweredInvites?: number;
      totalOffered?: number;
      totalRecommended?: number;
    };
  };

  // Annotations
  annotations?: {
    tags?: string[];
    customFields?: Array<{
      key?: string;
      value?: string;
    }>;
  };

  // Additional fields that may be available
  attachments?: any[];
  segmentationData?: any;
  additionalSearchInfo?: any;
  clientProposals?: any;
  customFields?: any;
  status?: 'interested' | 'applied' | 'response' | 'interview' | 'rejected' | 'hired' | 'not-interested';
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
    this.credentialsManager = new CredentialsManager();
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
        
        // Ensure daemon is running even with existing token (for API calls that may need OAuth refresh)
        await this.ensureDaemonRunning();
        
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
   * Ensure daemon is running for OAuth callbacks
   */
  private async ensureDaemonRunning(): Promise<void> {
    // Check if daemon is running
    const isDaemonRunning = await UpWorkDaemon.isDaemonRunning();
    if (!isDaemonRunning) {
      console.log('🔄 Starting UpWork daemon...');
      
      try {
        // Launch daemon as a background process using the same approach as the daemon CLI
        await new Promise<void>((resolve, reject) => {
          const { spawn } = require('child_process');
          const path = require('path');
          
          const daemonScript = path.resolve(__dirname, '../cli/daemon.ts');
          const daemonProcess = spawn(process.execPath, ['-r', 'ts-node/register', daemonScript, '_daemon_process'], {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore']
          });
          
          daemonProcess.unref();
          
          daemonProcess.on('error', (error: any) => {
            console.error('Daemon spawn error:', error.message);
            reject(error);
          });
          
          // Give daemon time to start
          setTimeout(() => resolve(), 2000);
        });
        
        // Wait a moment for daemon to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify it actually started
        const isNowRunning = await UpWorkDaemon.isDaemonRunning();
        if (isNowRunning) {
          console.log('✅ Daemon started successfully');
        } else {
          console.log('⚠️  Daemon may have failed to start - continuing without daemon');
        }
      } catch (error) {
        console.error('❌ Failed to start daemon:', error instanceof Error ? error.message : 'Unknown error');
        console.log('⚠️  Continuing without daemon - OAuth may require manual intervention');
      }
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
   * Start OAuth 2.0 authorization flow using daemon
   */
  private async startAuthorizationFlow(): Promise<{
    success: boolean;
    message: string;
    authorizationCode?: string;
  }> {
    try {
      // Ensure daemon is running for OAuth callback
      await this.ensureDaemonRunning();

      // Get public callback URL for UpWork API
      const daemon = new UpWorkDaemon();
      const callbackUrl = daemon.getPublicCallbackUrl();
      
      // Build authorization URL with public callback
      const authUrl = `https://www.upwork.com/ab/account-security/oauth2/authorize?client_id=${this.credentials!.apiKey}&response_type=code&redirect_uri=${encodeURIComponent(callbackUrl)}`;

      console.log('\n🌐 Opening browser for UpWork authorization...');
      console.log(`🔗 Authorization URL: ${authUrl}`);
      
      // Try to open browser automatically
      try {
        const { default: open } = await import('open');
        await open(authUrl);
        console.log('✅ Browser opened automatically');
      } catch {
        console.log('⚠️  Could not open browser automatically. Please visit the URL above.');
      }

      console.log('⏳ Waiting for OAuth callback...');
      
      // Poll for callback with timeout
      const maxWaitTime = 300000; // 5 minutes
      const pollInterval = 2000;   // 2 seconds
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWaitTime) {
        const pendingCallbacks = await UpWorkDaemon.getPendingCallbacks();
        
        if (pendingCallbacks.length > 0) {
          // Get the most recent callback
          const latestCallback = pendingCallbacks.sort((a, b) => b.timestamp - a.timestamp)[0];
          
          if (latestCallback) {
            console.log('✅ OAuth callback received!');
            
            // Clean up the callback
            try {
              await fetch(`https://home.alcorn.dev:8947/oauth/callback/${latestCallback.id}`, { 
                method: 'DELETE' 
              });
            } catch {
              // Ignore cleanup errors
            }
            
            return {
              success: true,
              message: 'Authorization code received from daemon.',
              authorizationCode: latestCallback.code
            };
          }
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        process.stdout.write('.');
      }
      
      console.log('\n⏰ OAuth callback timeout. Please try again.');
      
      return {
        success: false,
        message: 'OAuth callback timeout. Authorization may have been cancelled or failed.'
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
      
      // Use public callback URL for consistency with authorization
      const daemon = new UpWorkDaemon();
      const callbackUrl = daemon.getPublicCallbackUrl();
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        client_id: this.credentials!.apiKey,
        client_secret: this.credentials!.apiSecret,
        redirect_uri: callbackUrl
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
   * Get job details from UpWork job ID
   */
  async getJobDetails(jobId: string): Promise<JobData | null> {
    try {
      // Authenticate first
      const authResult = await this.authenticate();
      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.message}`);
      }

      if (!jobId) {
        throw new Error('Job ID is required');
      }

      // Load job details query from centralized GraphQL queries
      const { GraphQLQueries } = require('../graphql');
      const query = GraphQLQueries.jobDetails;

      const response = await this.makeGraphQLRequest<JobDetailsResponse>(query, { jobId });
      
      if (!response || !response.data?.marketplaceJobPosting) {
        throw new Error(`No job data found for job ID: ${jobId}. The job may not exist or you may not have access to it.`);
      }

      const formattedData = this.formatJobData(response.data.marketplaceJobPosting);
      
      return formattedData;

    } catch (error) {
      console.error('Exception in getJobDetails:');
      throw error; // Re-throw the error so CLI can see it
    }
  }


  /**
   * Format raw job data into standardized format
   */
  private formatJobData(jobData: any): JobData {
    // Handle both search results and detailed job data formats
    const isDetailedData = jobData.content || jobData.classification || jobData.contractTerms;
    
    if (isDetailedData) {
      // This is comprehensive job data from marketplaceJobPosting
      return {
        // Basic fields
        id: jobData.id,
        title: jobData.content?.title || jobData.title,
        description: jobData.content?.description || jobData.description,
        ciphertext: jobData.ciphertext,
        duration: jobData.duration,
        durationLabel: jobData.durationLabel,
        engagement: jobData.engagement,
        recordNumber: jobData.recordNumber,
        experienceLevel: jobData.experienceLevel || jobData.contractTerms?.experienceLevel,
        category: jobData.category,
        subcategory: jobData.subcategory,
        freelancersToHire: jobData.freelancersToHire || jobData.contractTerms?.personsToHire,
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
        client: jobData.client,
        
        // Comprehensive fields
        workFlowState: jobData.workFlowState,
        canClientReceiveContractProposal: jobData.canClientReceiveContractProposal,
        classification: jobData.classification,
        contractTerms: jobData.contractTerms,
        contractorSelection: jobData.contractorSelection,
        ownership: jobData.ownership,
        clientCompanyPublic: jobData.clientCompanyPublic,
        activityStat: jobData.activityStat,
        annotations: jobData.annotations,
        attachments: jobData.attachments,
        segmentationData: jobData.segmentationData,
        additionalSearchInfo: jobData.additionalSearchInfo,
        clientProposals: jobData.clientProposals,
        customFields: jobData.customFields
      };
    } else {
      // This is basic search result data - pass through existing fields
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
  }


  /**
   * Search for jobs with filters
   */
  /**
   * Introspect specific GraphQL type to get all its fields
   */
  async introspectType(typeName: string): Promise<any> {
    try {
      const { GraphQLQueries } = require('../graphql');
      const query = GraphQLQueries.introspectType;

      const response = await this.makeGraphQLRequest(query, { typeName });
      if (!response || !response.data?.__type) {
        console.log(`No type data returned for: ${typeName}`);
        return null;
      }

      return response.data.__type;
    } catch (error) {
      console.error(`Failed to introspect type ${typeName}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Introspect GraphQL schema to discover available fields
   */
  async introspectJobSchema(): Promise<any> {
    try {
      const { GraphQLQueries } = require('../graphql');
      const query = GraphQLQueries.introspectSchema;

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
      // Load categories query from centralized GraphQL queries
      const { GraphQLQueries } = require('../graphql');
      const query = GraphQLQueries.categories;

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
      // Load job search query from centralized GraphQL queries
      const { GraphQLQueries } = require('../graphql');
      const query = GraphQLQueries.jobSearch;

      const variables = {
        sortAttributes: filters.sortAttributes || [{ field: "RECENCY" }],
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
          pagination_eq: filters.marketPlaceJobFilter?.pagination_eq || this.config.upwork.searchFilters.marketPlaceJobFilter.pagination_eq,
          ...(filters.marketPlaceJobFilter?.categoryIds_any && {
            categoryIds_any: filters.marketPlaceJobFilter.categoryIds_any
          })
        }
      };

      // console.log('🔍 DEBUG: Executing job search with variables:', JSON.stringify(variables, null, 2));

      const response = await this.makeGraphQLRequest<JobSearchResponse>(query, variables);
      if (!response || !response.data?.marketplaceJobPostingsSearch) {
        console.log('No search results returned from API');
        return null;
      }

      // Debug: Raw API response (commented out for cleaner output)
      // console.log('\n🔍 Raw API Response:');
      // console.log('='.repeat(60));
      // console.log(JSON.stringify(response, null, 2));
      // console.log('='.repeat(60));

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


 