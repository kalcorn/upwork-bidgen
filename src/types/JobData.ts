// Job data type definitions

export interface JobData {
  id: string;
  title: string;
  description: string;
  budget: BudgetInfo;
  client: ClientInfo;
  experience: ExperienceLevel;
  postedDate: string;
  skills: string[];
  applicationRequirements: ApplicationRequirements;
  projectType: ProjectType;
  complexity: ComplexityLevel;
  estimatedHours?: number;
  secretWords: string[];
  budgetLow?: number;
  budgetHigh?: number;
  budgetType: BudgetType;
  company?: string;
  proposals?: string;
  url?: string;
}

export interface BudgetInfo {
  low: number;
  high: number;
  type: BudgetType;
  currency: string;
}

export type BudgetType = 'fixed' | 'hourly' | 'fixed-price' | 'range' | 'not-specified' | 'unknown';

export interface ClientInfo {
  id: string;
  name: string;
  location: string;
  rating: number;
  totalSpent: number;
  totalHired: number;
  totalReviews: number;
  avgHourlyRate?: number;
  memberSince: string;
  hireRate: number;
}

export type ExperienceLevel = 'entry' | 'intermediate' | 'expert' | 'not-specified' | 'unknown';

export interface ApplicationRequirements {
  secretWords: string[];
  questions: string[];
  attachments: boolean;
  portfolio: boolean;
  coverLetter: boolean;
  portfolioRequests: string[];
  technicalQuestions: string[];
  specificRequests: string[];
  hasStructuredApplication: boolean;
}

export type ProjectType = 
  | 'web-development'
  | 'mobile-development'
  | 'ai-ml'
  | 'devops-infrastructure'
  | 'fintech'
  | 'healthcare'
  | 'ecommerce'
  | 'saas'
  | 'legacy-rescue'
  | 'corporate-general'
  | 'startup-general'
  | 'voip-telecom'
  | 'misc'
  | 'fixed-price'
  | 'hourly'
  | 'both'
  | 'not-specified';

export type ComplexityLevel = 'low' | 'medium' | 'high' | 'expert';

export interface JobSearchParams {
  query?: string;
  limit?: number;
  offset?: number;
  category?: string;
  subcategory?: string;
      fixedPriceBudget?: {
      from?: number;
      to?: number | null;
    };
  experience?: ExperienceLevel;
  location?: string;
  // Advanced search parameters
  sortAttributes?: { field: string }[];
  searchType?: string;
  marketPlaceJobFilter?: {
    hourlyRate?: {
      from?: number;
      to?: number | null;
    };
    fixedPriceBudget?: {
      from?: number;
      to?: number | null;
    };
    pagination?: {
      after?: string;
      first?: number;
    };
    categoryIds?: string[] | null;
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