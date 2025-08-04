#!/usr/bin/env node

import inquirer from 'inquirer';
import { UpWorkAPI } from '../core/UpWorkAPI';
import { ProposalGenerator } from '../services/ProposalGenerator';
import { ClaudeRunner } from '../runners/ClaudeRunner';
import { GeminiRunner } from '../runners/GeminiRunner';
import { BidCalculator } from '../services/BidCalculator';
import { CredentialsManager } from '../core/CredentialsManager';
import config from '../config';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { JobData } from '../types/JobData';

// Helper to run external commands (for opening notepad)
function runCommand(command: string, label: string): void {
  console.log(`\n=== ${label} ===`);
  const proc = exec(command);
  proc.stdout?.on('data', (data: Buffer) => process.stdout.write(data.toString()));
  proc.stderr?.on('data', (data: Buffer) => process.stderr.write(data.toString()));
}

// Main application logic
async function main() {
  console.log('🤖 Welcome to the UpWork Bid Generator');
  console.log('='.repeat(40));

  // 1. Check for credentials
  const credentialsManager = new CredentialsManager(config.upwork.credentialsFile);
  if (!credentialsManager.hasCredentials()) {
    console.log('❌ No UpWork API credentials found.');
    console.log('Please run `npx ts-node src/cli/index.ts --setup` to configure them.');
    return;
  }

  // 2. Authenticate and search for jobs
  console.log('\n🔍 Authenticating with UpWork...');
  const upworkApi = new UpWorkAPI(config);
  const authResult = await upworkApi.authenticate();

  if (!authResult.success) {
    console.log(`❌ Authentication failed: ${authResult.message}`);
    return;
  }

  console.log('\n📚 Fetching job categories...');
  const categories = await upworkApi.getCategories();

  if (categories) {
    console.log('\n--- Available Job Categories ---');
    categories.forEach((category: any) => {
      console.log(`- ${category.preferredLabel} (ID: ${category.id})`);
      if (category.subcategories && category.subcategories.length > 0) {
        category.subcategories.forEach((subCategory: any) => {
          console.log(`  - ${subCategory.preferredLabel} (ID: ${subCategory.id})`);
        });
      }
    });
    console.log('------------------------------');
  } else {
    console.log('⚠️ Could not fetch job categories.');
  }

  console.log('\n🔍 Searching for relevant jobs on UpWork...');
  const searchResults = await upworkApi.searchJobs(config.upwork.searchFilters);

  if (!searchResults || searchResults.jobs.length === 0) {
    console.log('\n❌ No jobs found matching your criteria. Try adjusting the filters in `src/config/index.ts`.');
    return;
  }

  console.log(`\n✅ Found ${searchResults.total} jobs. Displaying the first ${searchResults.jobs.length}.`);

  // 3. Let the user select a job
  const jobChoices = searchResults.jobs.map(job => ({
    name: `($${job.budget.low}-$${job.budget.high}) ${job.title}`,
    value: job.id, // Use job ID as the unique value
  }));

  const { selectedJobId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedJobId',
      message: 'Select a job to generate a proposal for:',
      choices: jobChoices,
      pageSize: 15 // Show more items at once
    },
  ]);

  // Find the full job data for the selected job
  const selectedJob = searchResults.jobs.find(job => job.id === selectedJobId);
  if (!selectedJob) {
    console.error('❌ An error occurred while selecting the job.');
    return;
  }

  console.log(`\n👍 You selected: ${selectedJob.title}`);

  // 4. Generate the proposal
  const jobData: JobData = selectedJob;

  // Simplified bid calculation
  const bidCalculator = new BidCalculator();
  const bidSuggestion = bidCalculator.calculateBid({ jobData, userConfig: config.user, marketData: {}, options: {} });

  // Let user choose a template
  const templates = fs.readdirSync(path.join(__dirname, '../../templates')).filter(f => f.endsWith('.txt'));
  const { template } = await inquirer.prompt([
    {
      type: 'list',
      name: 'template',
      message: 'Choose a proposal template:',
      choices: templates,
    },
  ]);

  // Build the proposal content
  const proposalGenerator = new ProposalGenerator();
  const proposalBody = proposalGenerator.buildProposal(jobData, template);

  // Create a simple summary to append to the file
  const summarySection = `\n\n${'='.repeat(60)}
📝 PROPOSAL SUMMARY
${'='.repeat(60)}

📄 Job Title: ${jobData.title}
🔗 UpWork Link: https://www.upwork.com/jobs/${jobData.id}

💰 Client Budget: $${jobData.budget.low} - $${jobData.budget.high} (${jobData.budget.type})

💵 Our Suggested Bid: $${bidSuggestion.suggestedBid.amount} (${bidSuggestion.suggestedBid.type})
   Reasoning: ${bidSuggestion.reasoning}

${'='.repeat(60)}`;

  const fullOutput = proposalBody + summarySection;

  // Save the file
  const fileName = `${jobData.title.replace(/\W+/g, '_')}_proposal.txt`;
  const outputFile = path.join(__dirname, '../../output', fileName);
  fs.writeFileSync(outputFile, fullOutput);
  console.log(`\n✅ Customized proposal saved to: ${outputFile}`);

  // 5. Offer AI Enhancement
  const { aiChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'aiChoice',
      message: 'Choose an AI to enhance the proposal:',
      choices: ['Claude', 'Gemini', 'ChatGPT (manual)', 'None'],
      default: 'Claude',
    },
  ]);

  try {
    if (aiChoice === 'Claude') {
      const claudeRunner = new ClaudeRunner();
      await claudeRunner.enhanceProposal(outputFile);
    } else if (aiChoice === 'Gemini') {
      const geminiRunner = new GeminiRunner();
      await geminiRunner.enhanceProposal(outputFile);
    } else if (aiChoice === 'ChatGPT (manual)') {
      runCommand(`notepad.exe ${outputFile}`, 'Please copy the content and paste it into ChatGPT.');
    }
  } catch (error) {
    console.log(`\n⚠️ AI enhancement with ${aiChoice} failed. The proposal file is saved and ready for manual editing.`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('\n👋 All done! Goodbye!');
}

// Argument parsing for special modes (like --setup)
(async (): Promise<void> => {
  const args = process.argv.slice(2);
  if (args.includes('--setup')) {
    // Simplified setup flow
    const credentialsManager = new CredentialsManager(config.upwork.credentialsFile);
    await credentialsManager.setupCredentials();
  } else {
    await main();
  }
})();