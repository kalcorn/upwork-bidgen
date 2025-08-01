// config.js - Business configuration for intelligent bid calculation
module.exports = {
  // Base business parameters
  targetHourlyRate: 95,
  minHourlyRate: 75,
  
  // Risk tolerance and business preferences
  riskTolerance: 'moderate', // 'conservative', 'moderate', 'aggressive'
  preferredProjectSizes: ['large', 'medium', 'small'], // Priority order - most preferred first
  preferredVerticals: ['fintech', 'healthcare', 'devops'], // Priority order
  avoidVerticals: ['gaming', 'crypto'],
  
  // Market positioning
  marketPosition: 'premium', // 'budget', 'standard', 'premium', 'luxury'
  
  // UpWork API Configuration
  upwork: {
    // Enable UpWork API (set to false to use scraping fallback)
    useApi: false,
    
    // API credentials file path (DO NOT store credentials in this file)
    credentialsFile: './.upwork-credentials.json',
    
    // API rate limiting
    maxRequestsPerMinute: 20,
    maxRequestsPerHour: 1000
  }
};
