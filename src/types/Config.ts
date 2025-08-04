// src/types/Config.ts - Simplified configuration types

export interface AppConfig {
  upwork: UpWorkConfig;
  user: UserConfig;
  templates: TemplateConfig;
  ai: AIConfig;
  output: OutputConfig;
}

export interface UpWorkConfig {
  apiUrl: string;
  graphqlUrl: string;
  credentialsFile: string;
  requestTimeout: number;
  maxRetries: number;
  retryDelay: number;
  useApi: boolean;
  oauthRedirectUri: string;
  searchFilters: any; // Added to support Phase 1
}

export interface UserConfig {
  name: string;
  title: string;
  hourlyRate: {
    min: number;
    target: number;
    max: number;
  };
  experienceLevel: string;
  preferredProjectSizes: string[];
  expertise: string[];
  portfolio: string;
  availability: string;
  timezone: string;
  languages: string[];
}

export interface TemplateConfig {
  directory: string;
  defaultTemplate: string;
  fallbackTemplate: string;
}

export interface AIConfig {
  claude: ClaudeConfig;
  gemini: GeminiConfig;
}

export interface ClaudeConfig {
  enabled: boolean;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface GeminiConfig {
  enabled: boolean;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface OutputConfig {
  directory: string;
  format: 'txt' | 'md' | 'json';
  includeMetadata: boolean;
}

// MarketData is now an empty placeholder
export interface MarketData {}