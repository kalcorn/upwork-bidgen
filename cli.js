#!/usr/bin/env node

const inquirer = require('inquirer').default || require('inquirer');
const { collectJobDataManually, getTestJobData } = require('./lib/manualEntry');
const { UpWorkAPI } = require('./lib/upworkApi');
const { buildProposal } = require('./lib/generatePrompt');
const { runClaude } = require('./lib/claudeRunner');
const { calculateBidSuggestion } = require('./lib/bidCalculator');
const { analyzeProject } = require('./lib/projectAnalyzer');
const config = require('./config');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function runCommand(command, label) {
  console.log(`\n=== Output from ${label} ===`);
  const proc = exec(command);
  proc.stdout.on('data', data => process.stdout.write(data));
  proc.stderr.on('data', data => process.stderr.write(data));
}

function displayAnalysisResults(bidSuggestion, projectAnalysis, template, aiChoice) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 PROJECT ANALYSIS RESULTS');
  console.log('='.repeat(60));
  
  // Project Recommendation
  const recommendationColor = {
    'TAKE': '\x1b[32m',      // Green
    'CONSIDER': '\x1b[33m',   // Yellow
    'CAUTION': '\x1b[31m',    // Red
    'PASS': '\x1b[91m'        // Bright Red
  };
  
  const color = recommendationColor[projectAnalysis.recommendation] || '\x1b[37m';
  console.log(`\n🎯 RECOMMENDATION: ${color}${projectAnalysis.recommendation}\x1b[0m`);
  console.log(`📈 Project Score: ${projectAnalysis.overallScore}/100`);
  
  // Bid Suggestion
  console.log('\n💰 BID SUGGESTION:');
  console.log(`   Recommended: ${bidSuggestion.recommendation}`);
  console.log(`   Confidence: ${bidSuggestion.confidence.toUpperCase()}`);
  console.log(`   Budget Alignment: ${bidSuggestion.budgetAlignment ? bidSuggestion.budgetAlignment.status.toUpperCase() : 'N/A'}`);
  
  // Risk Factors
  if (projectAnalysis.riskFactors.length > 0) {
    console.log('\n⚠️ RISK FACTORS:');
    projectAnalysis.riskFactors.forEach(risk => {
      console.log(`   • ${risk}`);
    });
  }
  
  // Opportunities
  if (projectAnalysis.opportunities.length > 0) {
    console.log('\n✅ OPPORTUNITIES:');
    projectAnalysis.opportunities.forEach(opportunity => {
      console.log(`   • ${opportunity}`);
    });
  }
  
  // Red/Green Flags Summary
  if (projectAnalysis.flags.red.length > 0) {
    console.log(`\n🚩 Red Flags: ${projectAnalysis.flags.red.length}`);
  }
  if (projectAnalysis.flags.green.length > 0) {
    console.log(`\n🟢 Green Flags: ${projectAnalysis.flags.green.length}`);
  }
  
  console.log('\n' + '='.repeat(60));
}

(async () => {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  let urlArg = args.find(arg => arg.startsWith('--url='));
  let templateArg = args.find(arg => arg.startsWith('--template='));
  let aiArg = args.find(arg => arg.startsWith('--ai='));
  let modeArg = args.find(arg => arg.startsWith('--mode='));
  let testArg = args.find(arg => arg === '--test');
  let helpArg = args.find(arg => arg === '--help' || arg === '-h');
  
  // Show help if requested
  if (helpArg) {
    console.log(`
🤖 UpWork Bid Generator - CLI Usage

USAGE:
  node cli.js [OPTIONS]

OPTIONS:
  --url=<URL>           UpWork job URL (required)
  --mode=<MODE>         Data collection mode: manual, api, or smart
  --template=<NAME>     Template file name (e.g., ai-ml.txt, fintech.txt)
  --ai=<ENGINE>         AI engine: Claude, ChatGPT, or Gemini
  --test                Use test data (bypasses interactive prompts)
  --help, -h           Show this help message

MODES:
  manual               Manual data entry (copy/paste from UpWork page)
  api                  UpWork API integration (requires API credentials)
  smart                Automatic mode selection with fallbacks

EXAMPLES:
  node cli.js --url="https://upwork.com/jobs/..." --mode=manual --template=ai-ml.txt --ai=Claude
  node cli.js --url="https://upwork.com/jobs/..." --mode=api --template=fintech.txt --ai=ChatGPT
  node cli.js --url="https://upwork.com/jobs/..." --mode=smart --template=startup-general.txt --ai=Gemini
  node cli.js --url="https://upwork.com/jobs/..." --test --template=ai-ml.txt --ai=Claude

AVAILABLE TEMPLATES:
  ${fs.readdirSync(path.join(__dirname, 'templates')).filter(f => f.endsWith('.txt')).join(', ')}

AVAILABLE AI ENGINES:
  Claude, ChatGPT, Gemini
`);
    process.exit(0);
  }
  
  let url = urlArg ? urlArg.split('=')[1] : null;
  let template = templateArg ? templateArg.split('=')[1] : null;
  let aiChoice = aiArg ? aiArg.split('=')[1] : null;
  let mode = modeArg ? modeArg.split('=')[1] : null;
  
  // If test mode is enabled, force manual mode with test data
  if (testArg) {
    mode = 'test';
  }

  // Validate AI choice if provided
  if (aiChoice && !['Claude', 'ChatGPT', 'Gemini'].includes(aiChoice)) {
    console.error('❌ Invalid AI choice. Must be: Claude, ChatGPT, or Gemini');
    process.exit(1);
  }

  // Validate mode if provided
  if (mode && !['manual', 'api', 'smart', 'test'].includes(mode)) {
    console.error('❌ Invalid mode. Must be: manual, api, smart, or test');
    process.exit(1);
  }

  // Select mode if not provided
  if (!mode) {
    const response = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Select data collection mode:',
        choices: [
          { name: '📝 Manual Entry (copy/paste from UpWork page)', value: 'manual' },
          { name: '🔌 UpWork API (requires API credentials)', value: 'api' },
          { name: '🧠 Smart Mode (automatic with fallbacks)', value: 'smart' },
          { name: '🧪 Test Mode (sample data for testing)', value: 'test' }
        ],
        default: 'manual'
      }
    ]);
    mode = response.mode;
  }

  // Only prompt for URL if not in test mode
  if (!url && mode !== 'test') {
    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'url',
        message: 'Enter the UpWork job URL:',
      }
    ]);
    url = response.url;
  }

  // For test mode, use a default URL if none provided
  if (mode === 'test' && !url) {
    url = 'https://upwork.com/jobs/test';
  }

  // Initialize job data retrieval based on mode
  let jobData;
  
  switch (mode) {
    case 'manual':
      console.log('📝 Using Manual Data Entry Mode...');
      jobData = await collectJobDataManually(url);
      break;
      
    case 'test':
      console.log('🧪 Using Test Mode...');
      jobData = getTestJobData(url);
      break;
      
    case 'api':
      console.log('🔌 Using UpWork API Mode...');
      if (!config.upwork.useApi) {
        console.error('❌ UpWork API is not configured. Please set up API credentials first.');
        console.error('   Use manual mode instead: --mode=manual');
        process.exit(1);
      }
      try {
        const upworkApi = new UpWorkAPI(config);
        jobData = await upworkApi.getJobDetails(url);
      } catch (error) {
        console.error('❌ API failed:', error.message);
        console.error('   Falling back to manual mode...');
        jobData = await collectJobDataManually(url);
      }
      break;
      
    case 'smart':
      console.log('🧠 Using Smart Mode (API first, then manual fallback)...');
      if (config.upwork.useApi) {
        try {
          const upworkApi = new UpWorkAPI(config);
          jobData = await upworkApi.getJobDetails(url);
          console.log('✅ API mode successful!');
        } catch (error) {
          console.log('⚠️ API failed, falling back to manual mode...');
          jobData = await collectJobDataManually(url);
        }
      } else {
        console.log('⚠️ API not configured, using manual mode...');
        jobData = await collectJobDataManually(url);
      }
      break;
      
    default:
      console.error('❌ Invalid mode:', mode);
      process.exit(1);
  }
  
  // Calculate bid suggestion and project analysis
  console.log('\n🔍 Analyzing project opportunity...');
  const bidSuggestion = calculateBidSuggestion(jobData);
  const projectAnalysis = analyzeProject(jobData, bidSuggestion);
  
  // Display analysis results
  displayAnalysisResults(bidSuggestion, projectAnalysis, template, aiChoice);
  
  const templates = fs.readdirSync(path.join(__dirname, 'templates')).filter(f => f.endsWith('.txt'));

  // Use command line arguments or prompt for template and AI choice
  if (!template) {
    const response = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: 'Choose a template:',
        choices: templates,
      }
    ]);
    template = response.template;
  } else {
    // Validate template exists
    if (!templates.includes(template)) {
      console.error(`❌ Template "${template}" not found. Available templates: ${templates.join(', ')}`);
      process.exit(1);
    }
  }

  if (!aiChoice) {
    const response = await inquirer.prompt([
      {
        type: 'list',
        name: 'aiChoice',
        message: 'Choose AI to use:',
        choices: ['Claude', 'ChatGPT', 'Gemini'],
        default: 'Claude'
      }
    ]);
    aiChoice = response.aiChoice;
  }

  const proposal = buildProposal(jobData, template);
  
  // Add analysis results to the proposal file
  const analysisSection = `\n\n${'='.repeat(60)}
📊 PROJECT ANALYSIS SUMMARY
${'='.repeat(60)}

🎯 RECOMMENDATION: ${projectAnalysis.recommendation}
📈 Project Score: ${projectAnalysis.overallScore}/100

💰 BID SUGGESTION:
${bidSuggestion.recommendation}
Confidence: ${bidSuggestion.confidence.toUpperCase()}
Budget Alignment: ${bidSuggestion.budgetAlignment.status.toUpperCase()}

📋 ANALYSIS DETAILS:
${bidSuggestion.reasoning}

${projectAnalysis.riskFactors.length > 0 ? `⚠️ RISK FACTORS:\n${projectAnalysis.riskFactors.map(r => `• ${r}`).join('\n')}\n` : ''}
${projectAnalysis.opportunities.length > 0 ? `✅ OPPORTUNITIES:\n${projectAnalysis.opportunities.map(o => `• ${o}`).join('\n')}\n` : ''}
${projectAnalysis.flags.red.length > 0 ? `🚩 Red Flags: ${projectAnalysis.flags.red.length}\n` : ''}
${projectAnalysis.flags.green.length > 0 ? `🟢 Green Flags: ${projectAnalysis.flags.green.length}\n` : ''}
${'='.repeat(60)}`;

  const fullOutput = proposal + analysisSection;
  
  const fileName = `${jobData.title.replace(/\W+/g, '_')}_proposal.txt`;
  const outputFile = path.join(__dirname, 'output', fileName);
  fs.writeFileSync(outputFile, fullOutput);
  console.log(`\n✅ Customized proposal with analysis saved to: ${outputFile}`);

  if (aiChoice === 'Claude') {
    try {
      await runClaude(outputFile);
    } catch (error) {
      console.log('⚠️ Claude enhancement failed. Proposal saved without AI enhancement.');
      console.log('   To use Claude, install: npm install -g @anthropic-ai/claude-code');
      console.log('   Then authenticate: claude auth');
    }
  } else if (aiChoice === 'ChatGPT') {
    runCommand(`notepad.exe ${outputFile}`, 'ChatGPT - please paste this manually into chat.openai.com');
  } else if (aiChoice === 'Gemini') {
    runCommand(`notepad.exe ${outputFile}`, 'Gemini - please paste this manually into gemini.google.com');
  }
})();
