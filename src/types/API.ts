// API type definitions

export interface UpWorkCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  refreshToken?: string;
}

export interface AuthResult {
  success: boolean;
  message: string;
  token?: string;
  expiresAt?: Date;
}

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
}

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: Record<string, any>;
}

export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: string[];
  extensions?: Record<string, any>;
}

export interface UpWorkJobResponse {
  id: string;
  title: string;
  description: string;
  experienceLevel: string;
}

export interface JobSearchResponse {
  marketplaceJobPostingsSearch: {
    edges: Array<{
      node: UpWorkJobResponse;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
    totalCount: number;
  };
}

export interface JobDetailsResponse {
  marketplaceJobPosting: UpWorkJobResponse;
}

export interface APIError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, any>;
}

export interface APIRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}


export interface UpWorkAPIConfig {
  apiUrl: string;
  graphqlUrl: string;
  credentials: UpWorkCredentials;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
} 