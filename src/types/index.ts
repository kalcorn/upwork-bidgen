// Main types index file - exports all type definitions
export * from './JobData';
export * from './Config';
export * from './API';
export * from './Templates';
export * from './BidCalculation';

// Re-export commonly used types to avoid conflicts
export type { 
  JobData, 
  BudgetInfo, 
  BudgetType, 
  ClientInfo, 
  ExperienceLevel as JobExperienceLevel,
  ApplicationRequirements,
  ProjectType,
  ComplexityLevel as JobComplexityLevel,
  JobSearchParams,
  JobSearchResult,
  JobUrlParseResult
} from './JobData';

export type {
  AppConfig,
  UpWorkConfig,
  UserConfig,
  TemplateConfig,
  AIConfig,
  ClaudeConfig,
  GeminiConfig,
  OutputConfig,
  MarketData
} from './Config'; 