const inquirer = require('inquirer').default || require('inquirer');

/**
 * Manual data entry mode for UpWork job information
 * Collects all necessary data through interactive prompts
 */
async function collectJobDataManually(url) {
  console.log('📝 Manual Data Entry Mode');
  console.log('Please provide the job information from the UpWork page...\n');

  const questions = [
    {
      type: 'input',
      name: 'title',
      message: '📋 Job Title:',
      validate: (input) => {
        if (!input || input.trim().length < 5) {
          return 'Job title must be at least 5 characters long';
        }
        return true;
      }
    },
    {
      type: 'editor',
      name: 'description',
      message: '📝 Job Description (opens in editor):',
      validate: (input) => {
        if (!input || input.trim().length < 50) {
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
      filter: (input) => {
        // Remove currency symbols and commas, keep only numbers
        const cleaned = input.replace(/[$,€£¥]/g, '').trim();
        return cleaned || 'N/A';
      },
      validate: (input) => {
        if (input === 'N/A') return true;
        const num = parseFloat(input);
        if (isNaN(num) || num < 0) {
          return 'Please enter a valid number or N/A';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'budgetHigh',
      message: '💰 Budget (High):',
      filter: (input) => {
        const cleaned = input.replace(/[$,€£¥]/g, '').trim();
        return cleaned || 'N/A';
      },
      validate: (input) => {
        if (input === 'N/A') return true;
        const num = parseFloat(input);
        if (isNaN(num) || num < 0) {
          return 'Please enter a valid number or N/A';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'proposals',
      message: '📊 Number of Proposals:',
      filter: (input) => {
        const cleaned = input.replace(/[^\d]/g, '').trim();
        return cleaned || 'Unknown';
      },
      validate: (input) => {
        if (input === 'Unknown') return true;
        const num = parseInt(input);
        if (isNaN(num) || num < 0) {
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
      when: (answers) => answers.hasSecretWords,
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

  try {
    const answers = await inquirer.prompt(questions);
    
    // Process and structure the data
    const jobData = {
      title: answers.title.trim(),
      description: answers.description.trim(),
      experience: answers.experience,
      budgetLow: answers.budgetLow,
      budgetHigh: answers.budgetHigh,
      proposals: answers.proposals,
      clientLocation: answers.clientLocation,
      projectType: answers.projectType,
      skills: answers.skills,
      url: url,
      applicationRequirements: {
        secretWords: answers.secretWords ? answers.secretWords.split(',').map(s => s.trim()).filter(s => s) : [],
        portfolioRequests: answers.hasPortfolioRequest ? ['Portfolio/work examples requested'] : [],
        technicalQuestions: answers.hasTechnicalQuestions ? ['Technical approach questions included'] : [],
        specificRequests: answers.additionalRequirements !== 'None' ? [answers.additionalRequirements] : [],
        hasStructuredApplication: answers.hasSecretWords || answers.hasPortfolioRequest || answers.hasTechnicalQuestions
      }
    };

    // Display summary
    console.log('\n📊 DATA ENTRY SUMMARY:');
    console.log(`   📋 Title: "${jobData.title}"`);
    console.log(`   👨‍💼 Experience: ${jobData.experience}`);
    console.log(`   💰 Budget: $${jobData.budgetLow} - $${jobData.budgetHigh}`);
    console.log(`   📊 Proposals: ${jobData.proposals}`);
    console.log(`   🌍 Location: ${jobData.clientLocation}`);
    console.log(`   ⏰ Type: ${jobData.projectType}`);
    console.log(`   🔑 Secret Words: ${jobData.applicationRequirements.secretWords.join(', ') || 'None'}`);
    console.log(`   📁 Portfolio Request: ${jobData.applicationRequirements.portfolioRequests.length > 0 ? 'Yes' : 'No'}`);
    console.log(`   ❓ Technical Questions: ${jobData.applicationRequirements.technicalQuestions.length > 0 ? 'Yes' : 'No'}`);

    return jobData;

  } catch (error) {
    console.error('❌ Error during manual data entry:', error.message);
    throw new Error('Manual data entry failed');
  }
}

/**
 * Test mode for manual data entry - uses sample data for automated testing
 * This allows testing the full pipeline without interactive prompts
 */
function getTestJobData(url) {
  console.log('🧪 Test Mode - Using Sample Data');
  
  const testData = {
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
    experience: 'Expert',
    budgetLow: '15000',
    budgetHigh: '20000',
    proposals: '25',
    clientLocation: 'United States',
    projectType: 'Both',
    skills: 'React Native, AI, AR/3D, Mobile Development, Camera Integration',
    url: url,
    applicationRequirements: {
      secretWords: ['BABYAI'],
      portfolioRequests: ['Portfolio/work examples requested'],
      technicalQuestions: ['Technical approach questions included'],
      specificRequests: [
        'Links to 3 React Native apps you\'ve built (App Store/Play Store/GitHub)',
        'Example of past AR/3D work (video preferred)',
        'Describe how you\'d implement real-time baby sleep tracking via smartphone camera'
      ],
      hasStructuredApplication: true
    }
  };

  // Display summary
  console.log('\n📊 TEST DATA SUMMARY:');
  console.log(`   📋 Title: "${testData.title}"`);
  console.log(`   👨‍💼 Experience: ${testData.experience}`);
  console.log(`   💰 Budget: $${testData.budgetLow} - $${testData.budgetHigh}`);
  console.log(`   📊 Proposals: ${testData.proposals}`);
  console.log(`   🌍 Location: ${testData.clientLocation}`);
  console.log(`   ⏰ Type: ${testData.projectType}`);
  console.log(`   🔑 Secret Words: ${testData.applicationRequirements.secretWords.join(', ') || 'None'}`);
  console.log(`   📁 Portfolio Request: ${testData.applicationRequirements.portfolioRequests.length > 0 ? 'Yes' : 'No'}`);
  console.log(`   ❓ Technical Questions: ${testData.applicationRequirements.technicalQuestions.length > 0 ? 'Yes' : 'No'}`);

  return testData;
}

module.exports = { collectJobDataManually, getTestJobData }; 