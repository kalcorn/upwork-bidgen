// src/config/index.ts - Personal configuration for UpWork bid generation
import { AppConfig } from '../types';

const config: AppConfig = {
  upwork: {
    apiUrl: 'https://www.upwork.com/api/v2',
    graphqlUrl: 'https://www.upwork.com/graphql',
    credentialsFile: './.upwork-credentials.json',
    requestTimeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    useApi: true,
    oauthRedirectUri: 'https://google.com/',
    searchFilters: {
            sortAttributes: [{ field: "RECENCY" }],
      searchType: "USER_JOBS_SEARCH",
      marketPlaceJobFilter: {
        hourlyRate_eq: {
          rangeStart: 75,
          rangeEnd: null
        },
        budgetRange_eq: {
          rangeStart: 500,
          rangeEnd: null
        },
        pagination_eq: {
          after: "0",
          first: 25
        },
        //jobType_eq: "HOURLY", // HOURLY | FIXED
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
        proposalRange_eq: {
          rangeStart: 0,
          rangeEnd: 20
        }
      }
    }
  },

  user: {
    name: 'Chris Alcorn',
    title: 'Senior Full-Stack Developer',
    hourlyRate: {
      min: 75,
      target: 95,
      max: 125
    },
    experienceLevel: 'senior',
    preferredProjectSizes: ['large', 'medium', 'small'],
    expertise: [
      'JavaScript/TypeScript',
      'React/Next.js',
      'Node.js/Express',
      'Python/Django',
      'AWS/DevOps',
      'Database Design',
      'API Development',
      'System Architecture'
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

export default config; 