// upworkApi.js - UpWork API client for job data retrieval
const axios = require('axios');
const { CredentialsManager } = require('./credentialsManager');

class UpWorkAPI {
  constructor(config) {
    this.config = config;
    this.baseURL = 'https://www.upwork.com/api/v2';
    this.credentialsManager = new CredentialsManager(config.upwork.credentialsFile);
    this.credentials = null;
  }

  // Initialize authentication
  async authenticate() {
    try {
      // Check if credentials exist
      if (!this.credentialsManager.hasCredentials()) {
        console.log('🔐 No UpWork credentials found');
        console.log('   Run: node setup-credentials.js to configure API access');
        return {
          success: false,
          message: 'No credentials found. Run setup-credentials.js first.'
        };
      }

      // Load credentials securely
      this.credentials = await this.credentialsManager.loadCredentials();
      if (!this.credentials) {
        return {
          success: false,
          message: 'Failed to load credentials'
        };
      }

      console.log('✅ UpWork API credentials loaded securely');
      return {
        success: true,
        message: 'Authentication successful'
      };
      
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Get job details by URL or ID
  async getJobDetails(jobUrl) {
    try {
      // Extract job ID from URL
      const jobId = this.extractJobId(jobUrl);
      
      if (!jobId) {
        throw new Error('Could not extract job ID from URL');
      }

      // Ensure credentials are loaded
      if (!this.credentials) {
        const authResult = await this.authenticate();
        if (!authResult.success) {
          throw new Error('Authentication failed');
        }
      }

      // Make API request with OAuth 1.0a signature
      const response = await axios.get(`${this.baseURL}/jobs/${jobId}`, {
        headers: {
          'Authorization': this.generateOAuthHeader('GET', `${this.baseURL}/jobs/${jobId}`),
          'Content-Type': 'application/json'
        }
      });

      return this.formatJobData(response.data);
      
    } catch (error) {
      console.error('Error fetching job from UpWork API:', error.message);
      throw new Error(`UpWork API failed: ${error.message}. Please use manual mode instead.`);
    }
  }

  // Extract job ID from UpWork URL
  extractJobId(url) {
    // Example URL: https://www.upwork.com/jobs/React-Native-Expert-for-Powered-Pregnancy-App-Avatar_~021950952704480079254/
    const match = url.match(/jobs\/[^\/]+\~(\d+)/);
    return match ? match[1] : null;
  }

  // Format API response to match our expected structure
  formatJobData(apiData) {
    return {
      title: apiData.title || 'Unknown Job',
      description: apiData.description || 'No description available',
      budget: {
        low: apiData.budget?.minimum || 0,
        high: apiData.budget?.maximum || 0,
        type: apiData.budget?.type || 'unknown'
      },
      experience: apiData.experience_level || 'unknown',
      duration: apiData.duration || 'unknown',
      skills: apiData.skills || [],
      client: {
        name: apiData.client?.name || 'Unknown Client',
        rating: apiData.client?.rating || 0,
        totalSpent: apiData.client?.total_spent || 0,
        location: apiData.client?.location || 'Unknown'
      },
      postedDate: apiData.created_on || new Date().toISOString(),
      applicationRequirements: this.extractApplicationRequirements(apiData.description || '')
    };
  }

  // Extract application requirements from job description
  extractApplicationRequirements(description) {
    const requirements = {
      secretWords: [],
      specificRequests: [],
      portfolioRequests: [],
      technicalQuestions: [],
      hasStructuredApplication: false
    };

    // Look for secret words (words in ALL CAPS)
    const secretWordMatches = description.match(/\b[A-Z]{3,}\b/g);
    if (secretWordMatches) {
      requirements.secretWords = secretWordMatches;
    }

    // Look for structured application instructions
    if (description.toLowerCase().includes('how to apply') || 
        description.toLowerCase().includes('application process')) {
      requirements.hasStructuredApplication = true;
    }

    // Look for portfolio requests
    if (description.toLowerCase().includes('portfolio') || 
        description.toLowerCase().includes('links to') ||
        description.toLowerCase().includes('examples of')) {
      requirements.portfolioRequests.push('Portfolio or examples requested');
    }

    // Look for numbered application steps
    const numberedSteps = description.match(/\d+\.\s*[^.\n]+/g);
    if (numberedSteps) {
      requirements.specificRequests = numberedSteps.map(step => step.trim());
    }

    return requirements;
  }

  // Generate OAuth 1.0a signature for UpWork API
  generateOAuthHeader(method, url) {
    const crypto = require('crypto');
    
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(16).toString('hex');
    
    const params = {
      oauth_consumer_key: this.credentials.apiKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: this.credentials.accessToken,
      oauth_version: '1.0'
    };
    
    // Create signature base string
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const signatureBaseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(paramString)
    ].join('&');
    
    // Generate signature
    const signingKey = `${encodeURIComponent(this.credentials.apiSecret)}&${encodeURIComponent(this.credentials.accessTokenSecret)}`;
    const signature = crypto.createHmac('sha1', signingKey)
      .update(signatureBaseString)
      .digest('base64');
    
    // Build Authorization header
    const authParams = {
      ...params,
      oauth_signature: signature
    };
    
    const authHeader = 'OAuth ' + Object.keys(authParams)
      .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(authParams[key])}"`)
      .join(', ');
    
    return authHeader;
  }

  // Search jobs with filters
  async searchJobs(filters = {}) {
    try {
      const params = new URLSearchParams({
        q: filters.query || '',
        category2: filters.category || '',
        subcategory2: filters.subcategory || '',
        budget_min: filters.minBudget || '',
        budget_max: filters.maxBudget || '',
        paging: filters.page || '0;50'
      });

      const url = `${this.baseURL}/search/jobs?${params}`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.generateOAuthHeader('GET', url),
          'Content-Type': 'application/json'
        }
      });

      return response.data.jobs || [];
      
    } catch (error) {
      console.error('Error searching jobs:', error.message);
      return [];
    }
  }
}

module.exports = { UpWorkAPI }; 