#!/usr/bin/env node

import inquirer from 'inquirer';
import Table from 'cli-table3';
import { UpWorkAPI } from '../core/UpWorkAPI';
import { CredentialsManager } from '../core/CredentialsManager';
import { AppliedJobsManager } from '../core/AppliedJobsManager';
import config from '../config';

// Generate UpWork job URL from title and ciphertext only
function generateUpWorkJobURL(title: string, ciphertext: string): string {
  // Convert title to URL-safe format following UpWork's pattern
  const urlTitle = title
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special chars except spaces
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Remove consecutive dashes
    .replace(/^-|-$/g, '') // Remove leading/trailing dashes
    .substring(0, 95); // Truncate to observed length limit
  
  // Handle ciphertext that may already have ~ prefix
  const cleanCiphertext = ciphertext.startsWith('~') ? ciphertext : `~${ciphertext}`;
  
  return `https://www.upwork.com/jobs/${urlTitle}_${cleanCiphertext}/`;
}


// Main application logic
async function main() {
  console.log('🤖 Welcome to the UpWork Bid Generator');
  console.log('='.repeat(40));

  // 1. Initialize managers
  const credentialsManager = new CredentialsManager(config.upwork.credentialsFile);
  const appliedJobsManager = new AppliedJobsManager();

  // Check for credentials
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

  /*
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
  */

  console.log('\n🔍 Searching for relevant jobs on UpWork...');
  const searchResults = await upworkApi.searchJobs(config.upwork.searchFilters);

  if (!searchResults || searchResults.jobs.length === 0) {
    console.log('\n❌ No jobs found matching your criteria. Try adjusting the filters in `src/config/index.ts`.');
    return;
  }

  // Filter and sort jobs
  let filteredJobs = searchResults.jobs.filter(job => {
    // Filter out jobs where location is mandatory and "United States" is not included
    if (job.preferredFreelancerLocationMandatory && 
        job.preferredFreelancerLocation && 
        !job.preferredFreelancerLocation.includes("United States")) {
      return false;
    }
    
    // Filter out jobs already applied to (check both UpWork API and local tracking)
    if (job.applied || appliedJobsManager.hasApplied(job.id)) {
      return false;
    }
    
    // Filter out jobs with 0 hires and unverified payment method
    if (job.client && 
        (job.client.totalHires === 0 || !job.client.totalHires) && 
        job.client.verificationStatus !== 'VERIFIED') {
      return false;
    }
    
    return true;
  });

  // Sort by posted date descending (most recent first)
  filteredJobs = filteredJobs.sort((a, b) => {
    const dateA = new Date(a.publishedDateTime || a.createdDateTime || 0).getTime();
    const dateB = new Date(b.publishedDateTime || b.createdDateTime || 0).getTime();
    return dateB - dateA; // Descending order
  });

  console.log(`\n✅ Found ${searchResults.total} jobs. After filtering: ${filteredJobs.length} jobs displayed.`);

  if (filteredJobs.length === 0) {
    console.log('\n❌ No jobs remain after filtering. Jobs were filtered out for:');
    console.log('   • Already applied');
    console.log('   • Location restrictions (non-US required)');
    console.log('   • Unverified clients with 0 hires');
    return;
  }

  // 3. Display jobs in a table
  const table = new Table({
    head: ['#', 'Job Title', 'Budget', 'Duration', 'Appl.', 'Hired', 'Client Rep.', 'Location', 'Pref. Loc.', 'Posted'],
    colWidths: [4, 75, 16, 10, 9, 8, 22, 15, 15, 19],
    style: {
      head: ['cyan'],
      border: ['grey']
    },
    wordWrap: true,
  });

  filteredJobs.forEach((job, index) => {
    // Format budget info
    const formatDollarAmount = (amountString: string) => {
      const amount = parseFloat(amountString);
      if (amount % 1 !== 0) {
        return amount.toFixed(2);
      } else {
        return amount.toFixed(0);
      }
    };

    let budgetInfo = '';
    if (job.hourlyBudgetMin || job.hourlyBudgetMax) {
      const minRate = job.hourlyBudgetMin?.displayValue || job.hourlyBudgetMin?.rawValue || '?';
      const maxRate = job.hourlyBudgetMax?.displayValue || job.hourlyBudgetMax?.rawValue || '?';
      const formattedMin = minRate !== '?' ? formatDollarAmount(minRate) : '?';
      const formattedMax = maxRate !== '?' ? formatDollarAmount(maxRate) : '?';
      budgetInfo = `$${formattedMin}-${formattedMax}/hr`;
    } else if (job.amount && job.amount.rawValue && job.amount.rawValue !== '0.0') {
      const formattedAmount = formatDollarAmount(job.amount.displayValue || job.amount.rawValue);
      budgetInfo = `$${formattedAmount}`;
    } else {
      budgetInfo = 'TBD';
    }

    // Format duration (shortened)
    const formatDuration = (duration: string) => {
      return duration
        .replace('Less than 1 month', '< 1mo')
        .replace('1 to 3 months', '1-3 mo')
        .replace('3 to 6 months', '3-6 mo')
        .replace('More than 6 months', '6 mo+')
        .replace(' months', 'mo')
        .replace(' month', 'mo');
    };

    const shortDuration = job.durationLabel ? formatDuration(job.durationLabel) : 'N/A';

    // Format client info (enhanced)
    const formatSpend = (amount: string) => {
      const num = parseFloat(amount);
      if (num >= 1000000) return `$${(num/1000000).toFixed(1)}M`;
      if (num >= 1000) return `$${(num/1000).toFixed(0)}k`;
      return `$${formatDollarAmount(num.toString())}`;
    };

    const formatClientInfo = (client: any) => {
      const status = client?.verificationStatus === 'VERIFIED' ? '✓' : 'X';
      const hires = client?.totalHires || 0;
      const rating = client?.totalFeedback ? client.totalFeedback.toFixed(1) : '0.0';
      const spend = client?.totalSpent?.displayValue 
        ? formatSpend(client.totalSpent.displayValue) 
        : '$0';
      
      return `${status} ${hires}h ${rating}★ ${spend}`;
    };

    const clientInfo = formatClientInfo(job.client);

    // Format hired count (how many hired out of how many needed)
    const hiredInfo = job.freelancersToHire 
      ? `0/${job.freelancersToHire}` // We don't have actual hired count, so assume 0 hired so far
      : '1'; // If no specific count, assume hiring 1 person

    // Format date (short)
    const date = job.publishedDateTime ? new Date(job.publishedDateTime).toLocaleString('en-US',
      { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '') : 'N/A';

    // Format client location
    const clientLocation = job.client?.location?.country || 'N/A';

    // Format preferred freelancer location
    const prefLocation = job.preferredFreelancerLocation && job.preferredFreelancerLocation.length > 0 
      ? job.preferredFreelancerLocation.join(', ') 
      : 'Any';

    // Truncate job title if too long
    //const title = job.title.length > 42 ? `${job.title.substring(0, 39)}...` : job.title;

    // Add premium symbol to job title if premium
    const titleWithPremium = job.premium ? `⚡ ${job.title}` : job.title;
    
    // Create title cell with hyperlink if ciphertext is available
    const titleCell = job.ciphertext 
      ? { content: titleWithPremium, href: generateUpWorkJobURL(job.title, job.ciphertext) }
      : titleWithPremium;

    table.push([
      index + 1,
      titleCell,
      budgetInfo,
      shortDuration,
      `${job.totalApplicants || 0}`,
      hiredInfo,
      clientInfo,
      clientLocation,
      prefLocation,
      date,
    ]);
  });

  console.log('\n' + table.toString());

  // 4. Prompt for job number selection
  const { jobNumber } = await inquirer.prompt([
    {
      type: 'number',
      name: 'jobNumber',
      message: 'Enter job number to generate proposal for:',
      validate: (input) => {
        if (!input || input < 1 || input > filteredJobs.length) {
          return `Please enter a number between 1 and ${filteredJobs.length}`;
        }
        return true;
      }
    },
  ]);

  const selectedJobId = filteredJobs[jobNumber - 1]?.id;

  // Find the full job data for the selected job
  const selectedJob = filteredJobs.find(job => job.id === selectedJobId);
  if (!selectedJob) {
    console.error('❌ An error occurred while selecting the job.');
    return;
  }

  console.log(`\n👍 You selected: ${selectedJob.title}`);
  console.log(`📋 Job ID: ${selectedJob.id}`);
  console.log(`🔐 CypherText: ${selectedJob.ciphertext || 'N/A'}`);
  
  // Generate and display the UpWork URL without escape sequences
  if (selectedJob.ciphertext) {
    const jobUrl = generateUpWorkJobURL(selectedJob.title, selectedJob.ciphertext);
    console.log(`🔗 UpWork URL: ${jobUrl}`);
  }
  
  console.log(`📝 Description: ${selectedJob.description}...`);
  console.log(`🎯 Experience Level: ${selectedJob.experienceLevel}`);
  console.log(`📊 Total Applicants: ${selectedJob.totalApplicants || 'N/A'}`);
  console.log(`📅 Posted: ${selectedJob.publishedDateTime || selectedJob.createdDateTime || 'N/A'}`);
  console.log(`🏢 Category: ${selectedJob.category || 'N/A'} / ${selectedJob.subcategory || 'N/A'}`);
  console.log(`⭐ Premium: ${selectedJob.premium ? 'Yes' : 'No'}`);
  console.log(`🏢 Enterprise: ${selectedJob.enterprise ? 'Yes' : 'No'}`);
  console.log(`💼 Budget Type: ${selectedJob.hourlyBudgetType || 'N/A'}`);
  console.log(`👥 Freelancers to Hire: ${selectedJob.freelancersToHire || selectedJob.totalFreelancersToHire || 'N/A'}`);
  console.log(`✅ Already Applied: ${selectedJob.applied ? 'Yes' : 'No'}`);

  // Ask if user wants to mark as applied
  const { markAsApplied } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'markAsApplied',
      message: 'Mark this job as applied to?',
      default: false
    }
  ]);

  if (markAsApplied) {
    const { notes } = await inquirer.prompt([
      {
        type: 'input',
        name: 'notes',
        message: 'Add notes (optional):',
        default: ''
      }
    ]);

    const success = appliedJobsManager.markAsApplied(
      selectedJob.id,
      selectedJob.title,
      undefined, // proposalPath - will be added when proposal generation is implemented
      notes || undefined
    );

    if (success) {
      console.log('✅ Job marked as applied!');
      const stats = appliedJobsManager.getStats();
      console.log(`📊 Total applied jobs: ${stats.total}`);
    } else {
      console.log('❌ Failed to mark job as applied');
    }
  }

  console.log('\n👋 All done! Goodbye!');
}

// Argument parsing for special modes
(async (): Promise<void> => {
  const args = process.argv.slice(2);

  if (args.includes('--setup')) {
    // Simplified setup flow
    const credentialsManager = new CredentialsManager(config.upwork.credentialsFile);
    await credentialsManager.setupCredentials();
  } else if (args.includes('--introspect')) {
    // Schema introspection mode
    console.log('🔍 Introspecting UpWork GraphQL Schema...');
    const upworkApi = new UpWorkAPI(config);
    const authResult = await upworkApi.authenticate();

    if (!authResult.success) {
      console.log(`❌ Authentication failed: ${authResult.message}`);
      return;
    }

    await upworkApi.introspectJobSchema();
  } else if (args.includes('--categories')) {
    // Categories discovery mode
    console.log('📚 Fetching UpWork job categories...');
    const upworkApi = new UpWorkAPI(config);
    const authResult = await upworkApi.authenticate();

    if (!authResult.success) {
      console.log(`❌ Authentication failed: ${authResult.message}`);
      return;
    }

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
    }
  } else if (args.includes('--search')) {
    // Search mode (existing functionality)
    console.log('🔍 Searching for jobs...');
    const upworkApi = new UpWorkAPI(config);
    const authResult = await upworkApi.authenticate();

    if (!authResult.success) {
      console.log(`❌ Authentication failed: ${authResult.message}`);
      return;
    }

    const searchResults = await upworkApi.searchJobs(config.upwork.searchFilters);
    if (searchResults) {
      console.log(`\n✅ Found ${searchResults.total} jobs. Displaying detailed information:\n`);

      searchResults.jobs.forEach((job, index) => {
        // Format budget info
        let budgetInfo = '';
        if (job.hourlyBudgetMin || job.hourlyBudgetMax) {
          const min = job.hourlyBudgetMin ? `$${job.hourlyBudgetMin.displayValue || job.hourlyBudgetMin.rawValue}` : '';
          const max = job.hourlyBudgetMax ? `$${job.hourlyBudgetMax.displayValue || job.hourlyBudgetMax.rawValue}` : '';
          budgetInfo = `${min}${min && max ? '-' : ''}${max}/hr`;
        } else if (job.amount && job.amount.rawValue && job.amount.rawValue !== '0.0') {
          budgetInfo = `$${job.amount.displayValue || job.amount.rawValue}`;
        } else {
          budgetInfo = 'Budget TBD';
        }

        // Format duration (shortened)
        const formatDuration = (duration: string) => {
          return duration
            .replace('Less than 1 month', '<1mo')
            .replace('1 to 3 months', '1-3mo')
            .replace('3 to 6 months', '3-6mo')
            .replace('More than 6 months', '6mo+')
            .replace(' months', 'mo')
            .replace(' month', 'mo');
        };

        // Format published date (shorter format)
        const publishedDate = job.publishedDateTime ? new Date(job.publishedDateTime).toLocaleString() : 'N/A';

        // Format client verification status (short)
        const clientStatus = job.client?.verificationStatus === 'VERIFIED' ? '✓' : '○';
        const hires = job.client?.totalHires || 0;

        // Format duration
        const duration = job.durationLabel ? formatDuration(job.durationLabel) : '';

        // Single line format: #. Title • Budget • Duration • Date • Applies • Client
        console.log(`${(index + 1).toString().padStart(2, ' ')}. ${job.title} • 💰${budgetInfo} • ⏱${duration} • 📅${publishedDate} • 👥${job.totalApplicants || 0} applies • ${clientStatus}${hires}h`);
      });

      // Add clear end marker to prevent infinite scrolling
      console.log(`\n📋 End of results (${searchResults.jobs.length} jobs displayed)\n`);
    }
  } else {
    await main();
  }
})();