#!/usr/bin/env node

const inquirer = require('inquirer').default || require('inquirer');
const { scrapeJob } = require('./scraper');
const { buildProposal } = require('./generatePrompt');
const { runClaude } = require('./claudeRunner');
const { calculateBidSuggestion } = require('./bidCalculator');
const { analyzeProject } = require('./projectAnalyzer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function runCommand(command, label) {
  console.log(`\n=== Output from ${label} ===`);
  const proc = exec(command);
  proc.stdout.on('data', data => process.stdout.write(data));
  proc.stderr.on('data', data => process.stderr.write(data));
}

function displayAnalysisResults(bidSuggestion, projectAnalysis) {
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
  console.log(`   Budget Alignment: ${bidSuggestion.budgetAlignment.status.toUpperCase()}`);
  
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
  
  // Pause for user to review
  console.log('\nPress Enter to continue with proposal generation...');
  try {
    if (process.platform === 'win32') {
      require('child_process').execSync('pause', {stdio: 'inherit'});
    } else {
      require('child_process').execSync('read -p ""', {stdio: 'inherit', shell: '/bin/bash'});
    }
  } catch (error) {
    // If pause fails, just continue
    console.log('(Continuing automatically...)');
  }
}

(async () => {
  const args = process.argv.slice(2);
  let urlArg = args.find(arg => arg.startsWith('--url='));
  let url = urlArg ? urlArg.split('=')[1] : null;

  if (!url) {
    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'url',
        message: 'Enter the UpWork job URL:',
      }
    ]);
    url = response.url;
  }

  const jobData = await scrapeJob(url);
  
  // Calculate bid suggestion and project analysis
  console.log('\n🔍 Analyzing project opportunity...');
  const bidSuggestion = calculateBidSuggestion(jobData);
  const projectAnalysis = analyzeProject(jobData, bidSuggestion);
  
  // Display analysis results
  displayAnalysisResults(bidSuggestion, projectAnalysis);
  
  const templates = fs.readdirSync(path.join(__dirname, 'templates')).filter(f => f.endsWith('.txt'));

  const { template, aiChoices } = await inquirer.prompt([
    {
      type: 'list',
      name: 'template',
      message: 'Choose a template:',
      choices: templates,
    },
    {
      type: 'checkbox',
      name: 'aiChoices',
      message: 'Choose AI(s) to use (Claude is default):',
      choices: ['Claude', 'ChatGPT', 'Gemini'],
      default: ['Claude']
    }
  ]);

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

  for (const ai of aiChoices) {
    if (ai === 'Claude') {
      runClaude(outputFile);
    } else if (ai === 'ChatGPT') {
      runCommand(`notepad.exe ${outputFile}`, 'ChatGPT - please paste this manually into chat.openai.com');
    } else if (ai === 'Gemini') {
      runCommand(`notepad.exe ${outputFile}`, 'Gemini - please paste this manually into gemini.google.com');
    }
  }
})();
