// src/core/ConfigManager.ts - Unified configuration management
import fs from 'fs';
import path from 'path';
import { AppConfig } from '../types';

export interface EncryptedCredential {
  iv: string;
  encrypted: string;
}

export interface Credentials {
  apiKey: EncryptedCredential;
  apiSecret: EncryptedCredential;
  accessToken: EncryptedCredential;
  refreshToken: EncryptedCredential;
  encryptedAt: string;
}

export interface DaemonStatus {
  running: boolean;
  port: number;
  startTime: number;
  callbacks: number;
  messages: number;
  pid: number;
}

export interface TrackedJob {
  id: string;
  title: string;
  trackedAt: string;
  status: 'interested' | 'applied' | 'response' | 'interview' | 'rejected' | 'hired' | 'not-interested';
  proposalPath?: string;
  notes?: string;
}

export interface UnifiedConfig {
  version: string;
  lastUpdated: string;
  credentials: Credentials;
  daemon: DaemonStatus;
  jobs: {
    tracked: TrackedJob[];
  };
  upworkApi: AppConfig['upworkApi'];
  user: AppConfig['user'];
  templates: AppConfig['templates'];
  ai: AppConfig['ai'];
  output: AppConfig['output'];
}

export class ConfigManager {
  private configFile: string;
  private config: UnifiedConfig | null = null;

  constructor(configFile: string = 'bidgen.json') {
    this.configFile = path.resolve(configFile);
    this.loadConfig();
  }

  /**
   * Load configuration from unified file
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8');
        this.config = JSON.parse(data);
      } else {
        // Initialize with default structure if file doesn't exist
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      console.error('Error loading unified config:', error instanceof Error ? error.message : 'Unknown error');
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Save configuration to unified file
   */
  private saveConfig(): boolean {
    try {
      if (!this.config) return false;
      
      this.config.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving unified config:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Get default configuration structure
   */
  private getDefaultConfig(): UnifiedConfig {
    return {
      version: "1.0",
      lastUpdated: new Date().toISOString(),
      credentials: {
        apiKey: { iv: "", encrypted: "" },
        apiSecret: { iv: "", encrypted: "" },
        accessToken: { iv: "", encrypted: "" },
        refreshToken: { iv: "", encrypted: "" },
        encryptedAt: ""
      },
      daemon: {
        running: false,
        port: 0,
        startTime: 0,
        callbacks: 0,
        messages: 0,
        pid: 0
      },
      jobs: {
        tracked: []
      },
      upworkApi: {
        apiUrl: 'https://www.upwork.com/api/v2',
        graphqlUrl: 'https://www.upwork.com/graphql',
        credentialsFile: './.upwork-credentials.json', // Legacy reference, will be migrated
        requestTimeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        useApi: true,
        oauthRedirectUri: 'https://home.alcorn.dev:8947/oauth/callback',
        searchFilters: {
          sortAttributes: [{ field: "RECENCY" }],
          searchType: "USER_JOBS_SEARCH",
          marketPlaceJobFilter: {
            hourlyRate_eq: { rangeStart: 75, rangeEnd: null },
            budgetRange_eq: { rangeStart: 500, rangeEnd: null },
            pagination_eq: { after: "0", first: 50 },
            categoryIds_any: [
              "531770282580668420", // Data Science & Analytics
              "531770282580668419", // IT & Networking
              "1737190722360750082", // AI Apps & Integration
              "531770282589057025", // Desktop Application Development
              "531770282589057026", // Ecommerce Development
              "531770282589057027", // Game Design & Development
              "531770282589057024", // Mobile Development
              "531770282589057032", // Other - Software Development
              "531770282589057028", // Scripts & Utilities
              "531770282584862733"  // Web Development
            ],
            proposalRange_eq: { rangeStart: 0, rangeEnd: 20 }
          }
        }
      },
      user: {
        name: 'Chris Alcorn',
        title: 'Senior Full-Stack Developer',
        hourlyRate: { min: 75, target: 95, max: 125 },
        experienceLevel: 'senior',
        preferredProjectSizes: ['large', 'medium', 'small'],
        expertise: [
          'JavaScript/TypeScript', 'React/Next.js', 'Node.js/Express',
          'Python/Django', 'AWS/DevOps', 'Database Design',
          'API Development', 'System Architecture'
        ],
        portfolio: 'https://alcorn.dev',
        availability: 'Full-time',
        timezone: 'UTC-5',
        languages: ['English']
      },
      templates: {
        directory: './templates',
        defaultTemplate: 'corporate-general.txt',
        fallbackTemplate: 'misc.txt'
      },
      ai: {
        claude: {
          enabled: true,
          model: 'claude-3-sonnet-20240229',
          maxTokens: 4000,
          temperature: 0.7
        },
        gemini: {
          enabled: false,
          model: 'gemini-pro',
          maxTokens: 4000,
          temperature: 0.7
        }
      },
      output: {
        directory: './output',
        format: 'txt',
        includeMetadata: true
      }
    };
  }

  // Credentials Management
  getCredentials(): Credentials | null {
    return this.config?.credentials || null;
  }

  updateCredentials(credentials: Credentials): boolean {
    if (!this.config) return false;
    this.config.credentials = credentials;
    return this.saveConfig();
  }

  // Daemon Management
  getDaemonStatus(): DaemonStatus | null {
    return this.config?.daemon || null;
  }

  updateDaemonStatus(daemon: Partial<DaemonStatus>): boolean {
    if (!this.config) return false;
    this.config.daemon = { ...this.config.daemon, ...daemon };
    return this.saveConfig();
  }

  // Jobs Management
  getTrackedJobs(): TrackedJob[] {
    return this.config?.jobs.tracked || [];
  }

  addTrackedJob(job: TrackedJob): boolean {
    if (!this.config) return false;
    
    // Remove existing job with same ID if it exists
    this.config.jobs.tracked = this.config.jobs.tracked.filter(j => j.id !== job.id);
    
    // Add the job
    this.config.jobs.tracked.push(job);
    
    // Sort by tracked date (newest first)
    this.config.jobs.tracked.sort((a, b) => 
      new Date(b.trackedAt).getTime() - new Date(a.trackedAt).getTime()
    );
    
    return this.saveConfig();
  }

  updateJobStatus(jobId: string, status: TrackedJob['status'], notes?: string): boolean {
    if (!this.config) return false;
    
    const job = this.config.jobs.tracked.find(j => j.id === jobId);
    if (!job) return false;
    
    job.status = status;
    if (notes) job.notes = notes;
    
    return this.saveConfig();
  }

  isJobTracked(jobId: string): boolean {
    return this.config?.jobs.tracked.some(j => j.id === jobId) || false;
  }

  shouldFilterFromSearch(jobId: string): boolean {
    const job = this.config?.jobs.tracked.find(j => j.id === jobId);
    if (!job) return false;
    return ['not-interested', 'applied', 'response', 'interview', 'hired'].includes(job.status);
  }

  removeTrackedJob(jobId: string): boolean {
    if (!this.config) return false;
    
    const initialLength = this.config.jobs.tracked.length;
    this.config.jobs.tracked = this.config.jobs.tracked.filter(j => j.id !== jobId);
    
    if (this.config.jobs.tracked.length < initialLength) {
      return this.saveConfig();
    }
    
    return false; // Job wasn't found
  }

  // App Configuration Access
  getAppConfig(): AppConfig | null {
    if (!this.config) return null;
    
    return {
      upworkApi: this.config.upworkApi,
      user: this.config.user,
      templates: this.config.templates,
      ai: this.config.ai,
      output: this.config.output
    };
  }

  updateAppConfig(updates: Partial<AppConfig>): boolean {
    if (!this.config) return false;
    
    if (updates.upworkApi) this.config.upworkApi = { ...this.config.upworkApi, ...updates.upworkApi };
    if (updates.user) this.config.user = { ...this.config.user, ...updates.user };
    if (updates.templates) this.config.templates = { ...this.config.templates, ...updates.templates };
    if (updates.ai) this.config.ai = { ...this.config.ai, ...updates.ai };
    if (updates.output) this.config.output = { ...this.config.output, ...updates.output };
    
    return this.saveConfig();
  }

  // Statistics
  getJobStats(): {
    total: number;
    interested: number;
    applied: number;
    responses: number;
    interviews: number;
    hired: number;
    rejected: number;
    notInterested: number;
  } {
    const jobs = this.getTrackedJobs();
    return {
      total: jobs.length,
      interested: jobs.filter(j => j.status === 'interested').length,
      applied: jobs.filter(j => j.status === 'applied').length,
      responses: jobs.filter(j => j.status === 'response').length,
      interviews: jobs.filter(j => j.status === 'interview').length,
      hired: jobs.filter(j => j.status === 'hired').length,
      rejected: jobs.filter(j => j.status === 'rejected').length,
      notInterested: jobs.filter(j => j.status === 'not-interested').length
    };
  }
}