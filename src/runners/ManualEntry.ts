// src/runners/ManualEntry.ts - Manual data entry mode for UpWork job information
import inquirer from 'inquirer';
import { JobData, ExperienceLevel, ProjectType } from '../types/JobData';

export interface ManualEntryOptions {
  testMode?: boolean;
  skipValidation?: boolean;
}

export interface ManualEntryResult {
  success: boolean;
  jobData?: JobData;
  error?: string;
}

export interface ManualEntryAnswers {
  title: string;
  description: string;
  experience: ExperienceLevel | 'Not specified';
  budgetLow: string;
  budgetHigh: string;
  proposals: string;
  clientLocation: string;
  projectType: ProjectType | 'Not specified';
  skills: string;
  hasSecretWords: boolean;
  secretWords: string;
  hasPortfolioRequest: boolean;
  hasTechnicalQuestions: boolean;
  additionalRequirements: string;
}

export class ManualEntry {
  private options: Required<ManualEntryOptions>;

  constructor(options: ManualEntryOptions = {}) {
    this.options = {
      testMode: options.testMode || false,
      skipValidation: options.skipValidation || false
    };
  }

  /**
   * Collect job data through interactive prompts
   */
  async collectJobDataManually(url: string): Promise<ManualEntryResult> {
    try {
      console.log('📝 Manual Data Entry Mode');
      console.log('Please provide the job information from the UpWork page...\n');

      const questions = [
        {
          type: 'input',
          name: 'title',
          message: '📋 Job Title:',
          validate: (input: string) => {
            if (!this.options.skipValidation && (!input || input.trim().length < 5)) {
              return 'Job title must be at least 5 characters long';
            }
            return true;
          }
        },
        {
          type: 'editor',
          name: 'description',
          message: '📝 Job Description (opens in editor):',
          validate: (input: string) => {
            if (!this.options.skipValidation && (!input || input.trim().length < 50)) {
              return 'Job description must be at least 50 characters long';
            }
            return true;
          }
        },
        {
          type: 'list',
          name: 'experience',
          message: '👨‍💼 Experience Level:',
          choices: [
            'Entry Level',
            'Intermediate',
            'Expert',
            'Not specified'
          ],
          default: 'Not specified'
        },
        {
          type: 'input',
          name: 'budgetLow',
          message: '💰 Budget (Low):',
          filter: (input: string) => {
            // Remove currency symbols and commas, keep only numbers
            const cleaned = input.replace(/[$,€£¥]/g, '').trim();
            return cleaned || 'N/A';
          },
          validate: (input: string) => {
            if (input === 'N/A') return true;
            const num = parseFloat(input);
            if (!this.options.skipValidation && (isNaN(num) || num < 0)) {
              return 'Please enter a valid number or N/A';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'budgetHigh',
          message: '💰 Budget (High):',
          filter: (input: string) => {
            const cleaned = input.replace(/[$,€£¥]/g, '').trim();
            return cleaned || 'N/A';
          },
          validate: (input: string) => {
            if (input === 'N/A') return true;
            const num = parseFloat(input);
            if (!this.options.skipValidation && (isNaN(num) || num < 0)) {
              return 'Please enter a valid number or N/A';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'proposals',
          message: '📊 Number of Proposals:',
          filter: (input: string) => {
            const cleaned = input.replace(/[^\d]/g, '').trim();
            return cleaned || 'Unknown';
          },
          validate: (input: string) => {
            if (input === 'Unknown') return true;
            const num = parseInt(input);
            if (!this.options.skipValidation && (isNaN(num) || num < 0)) {
              return 'Please enter a valid number or Unknown';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'clientLocation',
          message: '🌍 Client Location:',
          default: 'Not specified'
        },
        {
          type: 'list',
          name: 'projectType',
          message: '⏰ Project Type:',
          choices: [
            'Fixed Price',
            'Hourly',
            'Both',
            'Not specified'
          ],
          default: 'Not specified'
        },
        {
          type: 'input',
          name: 'skills',
          message: '🛠️ Required Skills (comma-separated):',
          default: 'Not specified'
        },
        {
          type: 'confirm',
          name: 'hasSecretWords',
          message: '🔑 Does the job include secret words or specific application requirements?',
          default: false
        },
        {
          type: 'input',
          name: 'secretWords',
          message: '🔑 Secret Words (comma-separated):',
          when: (answers: ManualEntryAnswers) => answers.hasSecretWords,
          default: ''
        },
        {
          type: 'confirm',
          name: 'hasPortfolioRequest',
          message: '📁 Does the job request portfolio/work examples?',
          default: false
        },
        {
          type: 'confirm',
          name: 'hasTechnicalQuestions',
          message: '❓ Does the job include technical questions or approach requirements?',
          default: false
        },
        {
          type: 'input',
          name: 'additionalRequirements',
          message: '📋 Any other specific application requirements:',
          default: 'None'
        }
      ];

      const answers = await inquirer.prompt(questions) as ManualEntryAnswers;
      
      // Process and structure the data
      const jobData: JobData = {
        id: `manual-${Date.now()}`,
        title: answers.title.trim(),
        description: answers.description.trim(),
        experience: this.mapExperienceLevel(answers.experience),
        budget: {
          type: answers.budgetLow === 'N/A' ? 'not-specified' : 'range',
          low: answers.budgetLow === 'N/A' ? 0 : parseFloat(answers.budgetLow),
          high: answers.budgetHigh === 'N/A' ? 0 : parseFloat(answers.budgetHigh),
          currency: 'USD'
        },
        proposals: answers.proposals === 'Unknown' ? 'Unknown' : answers.proposals,
        client: {
          id: 'unknown',
          name: 'Unknown Client',
          location: answers.clientLocation,
          rating: 0,
          totalSpent: 0,
          totalHired: 0,
          totalReviews: 0,
          avgHourlyRate: 0,
          memberSince: new Date().toISOString(),
          hireRate: 0
        },
        projectType: this.mapProjectType(answers.projectType),
        skills: answers.skills === 'Not specified' ? [] : answers.skills.split(',').map(s => s.trim()).filter(s => s),
        url: url,
        applicationRequirements: {
          secretWords: answers.secretWords ? answers.secretWords.split(',').map(s => s.trim()).filter(s => s) : [],
          questions: [],
          attachments: false,
          portfolio: answers.hasPortfolioRequest,
          coverLetter: false,
          portfolioRequests: answers.hasPortfolioRequest ? ['Portfolio/work examples requested'] : [],
          technicalQuestions: answers.hasTechnicalQuestions ? ['Technical approach questions included'] : [],
          specificRequests: answers.additionalRequirements !== 'None' ? [answers.additionalRequirements] : [],
          hasStructuredApplication: answers.hasSecretWords || answers.hasPortfolioRequest || answers.hasTechnicalQuestions
        },
        postedDate: new Date().toISOString(),
        complexity: 'medium',
        secretWords: [],
        budgetType: answers.budgetLow === 'N/A' ? 'not-specified' : 'range'
      };

      // Display summary
      this.displaySummary(jobData);

      return {
        success: true,
        jobData
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error during manual data entry:', errorMessage);
      
      return {
        success: false,
        error: `Manual data entry failed: ${errorMessage}`
      };
    }
  }

  /**
   * Get test job data for automated testing
   */
  getTestJobData(url: string): ManualEntryResult {
    console.log('🧪 Test Mode - Using Sample Data');
    
    const testData: JobData = {
      id: `test-${Date.now()}`,
      title: 'React Native Expert for Powered Pregnancy App Avatar',
      description: `We are developing a cutting-edge pregnancy app that uses AI-powered avatars to help expectant mothers track their pregnancy journey. The app will feature real-time baby sleep tracking via smartphone camera, AR/3D visualization of the baby's development, and personalized health insights.

Key Features:
- React Native mobile app (iOS/Android)
- AI-powered avatar generation
- Real-time baby sleep tracking via camera
- AR/3D visualization features
- Health data integration
- Push notifications

Budget: $15,000–$20,000+ (flexible for elite talent)
Milestone-based payments or hourly rate.

How to Apply:
1. Reply with:
   - Links to 3 React Native apps you've built (App Store/Play Store/GitHub)
   - Example of past AR/3D work (video preferred)
   - Describe how you'd implement real-time baby sleep tracking via smartphone camera
2. Include the word "BABYAI" so we know you read this.`,
      experience: 'expert',
      budget: {
        type: 'range',
        low: 15000,
        high: 20000,
        currency: 'USD'
      },
              proposals: '25',
      client: {
        id: 'test-client',
        name: 'Test Client',
        location: 'United States',
        rating: 0,
        totalSpent: 0,
        totalHired: 0,
        totalReviews: 0,
        avgHourlyRate: 0,
        memberSince: new Date().toISOString(),
        hireRate: 0
      },
      projectType: 'both',
      skills: ['React Native', 'AI', 'AR/3D', 'Mobile Development', 'Camera Integration'],
      url: url,
      applicationRequirements: {
        secretWords: ['BABYAI'],
        questions: [],
        attachments: false,
        portfolio: true,
        coverLetter: false,
        portfolioRequests: ['Portfolio/work examples requested'],
        technicalQuestions: ['Technical approach questions included'],
        specificRequests: [
          'Links to 3 React Native apps you\'ve built (App Store/Play Store/GitHub)',
          'Example of past AR/3D work (video preferred)',
          'Describe how you\'d implement real-time baby sleep tracking via smartphone camera'
        ],
        hasStructuredApplication: true
      },
      postedDate: new Date().toISOString(),
      complexity: 'expert',
      secretWords: ['BABYAI'],
      budgetType: 'range'
    };

    // Display summary
    this.displaySummary(testData);

    return {
      success: true,
      jobData: testData
    };
  }

  /**
   * Map experience level string to enum
   */
  private mapExperienceLevel(experience: string): ExperienceLevel {
    switch (experience.toLowerCase()) {
      case 'entry level':
        return 'entry';
      case 'intermediate':
        return 'intermediate';
      case 'expert':
        return 'expert';
      default:
        return 'not-specified';
    }
  }

  /**
   * Map project type string to enum
   */
  private mapProjectType(projectType: string): ProjectType {
    switch (projectType.toLowerCase()) {
      case 'fixed price':
        return 'fixed-price';
      case 'hourly':
        return 'hourly';
      case 'both':
        return 'both';
      default:
        return 'not-specified';
    }
  }

  /**
   * Display job data summary
   */
  private displaySummary(jobData: JobData): void {
    const budgetLow = jobData.budget.low || 'N/A';
    const budgetHigh = jobData.budget.high || 'N/A';
    const proposals = jobData.proposals || 'Unknown';
    const secretWords = jobData.applicationRequirements.secretWords.join(', ') || 'None';
    const portfolioRequest = jobData.applicationRequirements.portfolioRequests.length > 0 ? 'Yes' : 'No';
    const technicalQuestions = jobData.applicationRequirements.technicalQuestions.length > 0 ? 'Yes' : 'No';

    console.log('\n📊 DATA ENTRY SUMMARY:');
    console.log(`   📋 Title: "${jobData.title}"`);
    console.log(`   👨‍💼 Experience: ${jobData.experience}`);
    console.log(`   💰 Budget: $${budgetLow} - $${budgetHigh}`);
    console.log(`   📊 Proposals: ${proposals}`);
    console.log(`   🌍 Location: ${jobData.client.location}`);
    console.log(`   ⏰ Type: ${jobData.projectType}`);
    console.log(`   🔑 Secret Words: ${secretWords}`);
    console.log(`   📁 Portfolio Request: ${portfolioRequest}`);
    console.log(`   ❓ Technical Questions: ${technicalQuestions}`);
  }
}

// Export a default instance
export const manualEntry = new ManualEntry(); 