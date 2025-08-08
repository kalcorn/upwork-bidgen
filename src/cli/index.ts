#!/usr/bin/env node

import inquirer from 'inquirer';
import Table from 'cli-table3';
import { UpWorkAPI, JobData } from '../core/UpWorkAPI';
import { CredentialsManager } from '../core/CredentialsManager';
import { JobsManager } from '../core/JobsManager';
import { InteractiveTable, TableColumn } from '../core/InteractiveTable';
import config from '../config';
import colors from 'colors';
import { countryToAlpha3 } from 'country-to-iso';

// Helper function to format job data for table display
function createJobTableColumns(): TableColumn[] {
  const formatDollarAmount = (amountString: string) => {
    const amount = parseFloat(amountString);
    if (amount % 1 !== 0) {
      return amount.toFixed(2);
    } else {
      return amount.toFixed(0);
    }
  };

  const applyJobStatusStyling = (content: string | { content: string; href?: string }, job: JobData): string | { content: string; href?: string } => {
    if (job.status === 'applied') {
      return typeof content === 'object' 
        ? { ...content, content: colors.green(content.content) }
        : colors.green(content);
    } else if (job.status === 'not-interested') {
      return typeof content === 'object'
        ? { ...content, content: colors.gray(content.content) }
        : colors.gray(content);
    }
    return content;
  };

  const formatSpend = (amount: string) => {
    const num = parseFloat(amount);
    if (num >= 1000000) return `$${(num/1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num/1000).toFixed(0)}k`;
    return `$${formatDollarAmount(num.toString())}`;
  };

  const formatDuration = (duration: string) => {
    return duration
      .replace('Less than 1 month', '< 1mo')
      .replace('1 to 3 months', '1-3 mo')
      .replace('3 to 6 months', '3-6 mo')
      .replace('More than 6 months', '6 mo+')
      .replace(' months', 'mo')
      .replace(' month', 'mo');
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

  const abbreviateCountry = (country: string) => {
    if (!country) return 'N/A';
    const alpha3 = countryToAlpha3(country);
    return alpha3 || country;
  };

  return [
    {
      header: '#',
      width: 6,
      getValue: (job: JobData, index: number) => applyJobStatusStyling((index + 1).toString(), job)
    },
    {
      header: 'Job Title',
      width: 75,
      getValue: (job: JobData, _index: number) => {
        const titleWithPremium = job.premium ? `⚡ ${job.title}` : job.title;
        const titleContent = job.ciphertext 
          ? { content: titleWithPremium, href: generateUpWorkJobURL(job.title, job.ciphertext) }
          : titleWithPremium;
        return applyJobStatusStyling(titleContent, job);
      }
    },
    {
      header: 'Budget',
      width: 16,
      getValue: (job: JobData) => {
        let budget: string;
        if (job.hourlyBudgetMin || job.hourlyBudgetMax) {
          const minRate = job.hourlyBudgetMin?.displayValue || job.hourlyBudgetMin?.rawValue || '?';
          const maxRate = job.hourlyBudgetMax?.displayValue || job.hourlyBudgetMax?.rawValue || '?';
          const formattedMin = minRate !== '?' ? formatDollarAmount(minRate) : '?';
          const formattedMax = maxRate !== '?' ? formatDollarAmount(maxRate) : '?';
          budget = `$${formattedMin}-${formattedMax}/hr`;
        } else if (job.amount && job.amount.rawValue && job.amount.rawValue !== '0.0') {
          const formattedAmount = formatDollarAmount(job.amount.displayValue || job.amount.rawValue);
          budget = `$${formattedAmount}`;
        } else {
          budget = 'TBD';
        }
        return applyJobStatusStyling(budget, job);
      }
    },
    {
      header: 'Duration',
      width: 10,
      getValue: (job: JobData) => applyJobStatusStyling(job.durationLabel ? formatDuration(job.durationLabel) : 'N/A', job)
    },
    {
      header: 'Appl.',
      width: 9,
      getValue: (job: JobData) => applyJobStatusStyling(`${job.totalApplicants || 0}`, job)
    },
    {
      header: 'Hired',
      width: 8,
      getValue: (job: JobData) => applyJobStatusStyling(job.freelancersToHire ? `0/${job.freelancersToHire}` : '1', job)
    },
    {
      header: 'Client Rep.',
      width: 22,
      getValue: (job: JobData) => applyJobStatusStyling(formatClientInfo(job.client), job)
    },
    {
      header: 'Location',
      width: 15,
      getValue: (job: JobData) => applyJobStatusStyling(abbreviateCountry(job.client?.location?.country || ''), job)
    },
    {
      header: 'Pref. Loc.',
      width: 15,
      getValue: (job: JobData) => {
        const prefLoc = job.preferredFreelancerLocation && job.preferredFreelancerLocation.length > 0 
          ? job.preferredFreelancerLocation.map(abbreviateCountry).join(', ') 
          : 'Any';
        return applyJobStatusStyling(prefLoc, job);
      }
    },
    {
      header: 'Posted',
      width: 19,
      getValue: (job: JobData) => {
        const postedDate = job.publishedDateTime 
          ? new Date(job.publishedDateTime).toLocaleString('en-US',
              { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '') 
          : 'N/A';
        return applyJobStatusStyling(postedDate, job);
      }
    }
  ];
}

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
  const jobsManager = new JobsManager();

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

  console.log('🔍 Searching for relevant jobs on UpWork...');
  const searchResults = await upworkApi.searchJobs(config.upwork.searchFilters);

  if (!searchResults || searchResults.jobs.length === 0) {
    console.log('❌ No jobs found matching your criteria. Try adjusting the filters in `src/config/index.ts`.');
    return;
  }

  // Store pagination info for later use
  const initialPaginationInfo = {
    nextCursor: searchResults.nextOffset,
    hasMore: searchResults.hasMore
  };

  // Filter and sort jobs
  let filteredJobs = searchResults.jobs.filter(job => {
    // Filter out jobs where location is mandatory and "United States" is not included
    if (job.preferredFreelancerLocationMandatory && 
        job.preferredFreelancerLocation && 
        !job.preferredFreelancerLocation.includes("United States")) {
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

  // Integrate job statuses
  filteredJobs.forEach(job => {
    const trackedJob = jobsManager.getTrackedJob(job.id);
    if (trackedJob) {
      job.status = trackedJob.status;
    }
  });

  // Sort by published date descending (most recent first) - prioritize publishedDateTime consistently
  filteredJobs = filteredJobs.sort((a, b) => {
    // Always prioritize publishedDateTime when available for both jobs
    const dateA = a.publishedDateTime ? new Date(a.publishedDateTime).getTime() : new Date(a.createdDateTime || 0).getTime();
    const dateB = b.publishedDateTime ? new Date(b.publishedDateTime).getTime() : new Date(b.createdDateTime || 0).getTime();
    
    return dateB - dateA; // Descending order (most recent first)
  });
  

  console.log(`✅ Found ${searchResults.total} jobs. After filtering: ${filteredJobs.length} jobs displayed.`);

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

  // 4. Job browsing with visual table-based navigation
  await startTableBasedJobBrowsing(filteredJobs, jobsManager, upworkApi, initialPaginationInfo);
}


// Main job browsing using InteractiveTable class
async function startTableBasedJobBrowsing(
  jobs: JobData[], 
  jobsManager: any, 
  upworkApi: any, 
  paginationInfo?: { nextCursor: string | null, hasMore: boolean }
): Promise<void> {
  if (jobs.length === 0) {
    console.log('\n❌ No jobs available.');
    return;
  }
  
  let nextCursor: string | null = paginationInfo?.nextCursor || null;
  let hasMoreApiData = paginationInfo?.hasMore ?? true;
  
  // Track job IDs to prevent duplicates
  const jobIds = new Set<string>(jobs.map(job => job.id));
  
  // Create the interactive table with job-specific configuration
  const interactiveTable = new InteractiveTable<JobData>({
    title: '🤖 Welcome to the UpWork Bid Generator',
    columns: createJobTableColumns(),
    pageSize: 15,
    onSelect: async (job: JobData, _index: number) => {
      interactiveTable.suspend();
      await processSelectedJob(job, jobsManager, upworkApi);
      interactiveTable.resume();
    },
    onQuit: () => {
      console.log('\nThank you for using the UpWork Bid Generator!');
    },
    onLoadMore: async (): Promise<boolean> => {
      return await loadMoreJobs(upworkApi, jobsManager, interactiveTable, nextCursor, hasMoreApiData, jobIds, (cursor, hasMore) => {
        nextCursor = cursor;
        hasMoreApiData = hasMore;
      });
    },
    onKeyPress: async (key: string, job: JobData) => {
      if (key === 'n') {
        if (job.status === 'not-interested') {
          // Undo not-interested - remove from tracking
          jobsManager.removeTrackedJob(job.id);
          delete job.status;
        } else {
          // Mark as not-interested
          jobsManager.markAsNotInterested(job.id, job.title);
          job.status = 'not-interested';
        }
      }
    },
    getDynamicControls: (job: JobData) => {
      return job.status === 'not-interested' ? 'I[n]terested' : '[N]ot Interested';
    }
  });
  
  // Set the initial jobs data
  interactiveTable.setData(jobs);
  
  // Start the interactive table
  await interactiveTable.start();
}

// Load more jobs function
async function loadMoreJobs(
  upworkApi: any, 
  jobsManager: any, 
  interactiveTable: any,
  currentCursor: string | null,
  hasMoreApiData: boolean,
  jobIds: Set<string>,
  updatePaginationState: (cursor: string | null, hasMore: boolean) => void
): Promise<boolean> {
  try {
    if (!hasMoreApiData) {
      return false;
    }
    
    // Create pagination parameters for next batch
    const searchFilters = {
      ...config.upwork.searchFilters,
      marketPlaceJobFilter: {
        ...config.upwork.searchFilters.marketPlaceJobFilter,
        pagination_eq: {
          after: currentCursor || "0",
          first: 50
        }
      }
    };

    const searchResults = await upworkApi.searchJobs(searchFilters);
    
    if (!searchResults || searchResults.jobs.length === 0) {
      updatePaginationState(null, false);
      return false;
    }

    // Filter new jobs same as initial filtering
    let newFilteredJobs = searchResults.jobs.filter((job: JobData) => {
      // Filter out jobs where location is mandatory and "United States" is not included
      if (job.preferredFreelancerLocationMandatory && 
          job.preferredFreelancerLocation && 
          !job.preferredFreelancerLocation.includes("United States")) {
        return false;
      }
      
      // Filter out jobs already applied to (check both UpWork API and local tracking)
      if (job.applied || jobsManager.hasApplied(job.id)) {
        return false;
      }

      // Filter out jobs marked as not interested
      if (jobsManager.isNotInterested(job.id)) {
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

    // Sort this batch by posted date descending (most recent first)
    newFilteredJobs = newFilteredJobs.sort((a: JobData, b: JobData) => {
      const dateA = a.publishedDateTime ? new Date(a.publishedDateTime).getTime() : new Date(a.createdDateTime || 0).getTime();
      const dateB = b.publishedDateTime ? new Date(b.publishedDateTime).getTime() : new Date(b.createdDateTime || 0).getTime();
      return dateB - dateA; // Descending order
    });

    // Filter out duplicates using job ID set
    const uniqueNewJobs = newFilteredJobs.filter((job: JobData) => {
      if (jobIds.has(job.id)) {
        return false; // Skip duplicate
      }
      jobIds.add(job.id); // Add to set for future deduplication
      return true;
    });

    if (uniqueNewJobs.length > 0) {
      interactiveTable.addData(uniqueNewJobs);
    }

    updatePaginationState(searchResults.nextOffset, searchResults.hasMore);
    
    return uniqueNewJobs.length > 0;
    
  } catch (error) {
    console.error('❌ Error loading more jobs:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Process a single selected job
async function processSelectedJob(selectedJob: JobData, jobsManager: any, upworkApi: any): Promise<void> {
  console.log(`\n👍 You selected: ${selectedJob.title}`);
  console.log(`📋 Job ID: ${selectedJob.id}`);
  console.log(`🔐 CypherText: ${selectedJob.ciphertext || 'N/A'}`);
  
  // Generate UpWork URL for comprehensive job details fetching
  let jobUrl = '';
  if (selectedJob.ciphertext) {
    jobUrl = generateUpWorkJobURL(selectedJob.title, selectedJob.ciphertext);
    console.log(`🔗 UpWork URL: ${jobUrl}`);
  }


  // Fetch comprehensive job details
  let comprehensiveJobData: JobData | null = null;
  try {
    comprehensiveJobData = await upworkApi.getJobDetails(selectedJob.id);
  } catch (error) {
    console.error('❌ Error fetching job details:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Show full job description
  const jobData = comprehensiveJobData || selectedJob;
  console.log('\n📝 DESCRIPTION:');
  console.log('='.repeat(80));
  console.log(jobData.description || 'No description available');
  console.log('='.repeat(80));

  // Start job navigation menu
  await handleJobNavigation(selectedJob, comprehensiveJobData, jobsManager, upworkApi, []);
}

// Handle job navigation with keyboard controls
async function handleJobNavigation(
  selectedJob: JobData,
  comprehensiveJobData: JobData | null,
  jobsManager: any,
  _upworkApi: any,
  _allJobs: JobData[]
): Promise<void> {
  while (true) {
    const { jobAction } = await inquirer.prompt([
      {
        type: 'list',
        name: 'jobAction',
        message: '🎮 Choose action for this job:',
        choices: [
          { name: '📝 Apply (generate proposal)', value: 'apply' },
          { name: '❌ Not interested', value: 'not_interested' },
          { name: '⏭️ Skip job', value: 'skip' },
          { name: '🚪 Quit', value: 'quit' }
        ],
        pageSize: 4
      }
    ]);
    
    switch (jobAction) {
      case 'apply':
        const applied = await handleApplyToJob(selectedJob, comprehensiveJobData, jobsManager);
        if (applied) return; // Exit after successful application
        continue;
        
      case 'not_interested':
        await handleNotInterested(selectedJob, jobsManager);
        return; // Exit after marking as not interested
        
      case 'skip':
        console.log('\n⏭️ Skipping this job...');
        return; // Exit and return to job selection
        
      case 'quit':
        console.log('\n👋 Goodbye!');
        process.exit(0);
    }
  }
}

// Handle marking job as not interested
async function handleNotInterested(selectedJob: JobData, jobsManager: any): Promise<void> {
  const { notes } = await inquirer.prompt([
    {
      type: 'input',
      name: 'notes',
      message: 'Add notes (optional):',
      default: ''
    }
  ]);

  const success = jobsManager.markAsNotInterested(selectedJob.id, selectedJob.title, notes || undefined);
  
  if (success) {
    console.log('✅ Job marked as not interested. It will not appear in future searches.');
    showStats(jobsManager);
  } else {
    console.log('❌ Failed to mark job as not interested.');
  }
}





// Handle applying to job
async function handleApplyToJob(
  selectedJob: JobData, 
  comprehensiveJobData: JobData | null,
  jobsManager: any
): Promise<boolean> {
  console.log('\n🔄 Preparing to generate proposal...');
  
  // Import ProposalGenerator
  const { ProposalGenerator } = await import('../services/ProposalGenerator');
  const proposalGenerator = new ProposalGenerator();
  
  // Get available templates and recommendation
  const availableTemplates = proposalGenerator.getAvailableTemplates();
  const recommended = proposalGenerator.getRecommendedTemplate(comprehensiveJobData || selectedJob);
  
  if (availableTemplates.length === 0) {
    console.log('❌ No templates found in ./templates/ directory');
    return false;
  }
  
  // Create choices for template selection
  const templateChoices = availableTemplates.map(filename => {
    const displayName = filename === recommended.filename ? 
      `${proposalGenerator.getTemplateDisplayName(filename)} (Recommended)` :
      proposalGenerator.getTemplateDisplayName(filename);
    
    return {
      name: displayName,
      value: filename,
      short: filename.replace('.txt', '')
    };
  });
  
  console.log(`💡 Recommended template: ${recommended.displayName}`);
  
  // Prompt for template selection
  const { selectedTemplate } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedTemplate',
      message: 'Choose a template for your proposal:',
      choices: templateChoices,
      default: recommended.filename,
      pageSize: 12
    }
  ]);
  
  console.log(`📝 Using template: ${proposalGenerator.getTemplateDisplayName(selectedTemplate)}`);
  
  let proposalPath: string | undefined;
  
  try {
    const result = await proposalGenerator.generateProposal(comprehensiveJobData || selectedJob, selectedTemplate);
    
    if (result.success) {
      console.log('✅ Proposal generated successfully!');
      console.log(`📁 Saved to: ${result.outputPath}`);
      console.log(`📄 Template used: ${result.templateUsed}`);
      proposalPath = result.outputPath;
      
      // Optionally show a preview
      const { showPreview } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'showPreview',
          message: 'Show preview?',
          default: false
        }
      ]);
      
      if (showPreview && result.proposalContent) {
        console.log('\n' + '='.repeat(60));
        console.log('📄 PROPOSAL PREVIEW');
        console.log('='.repeat(60));
        console.log(result.proposalContent.substring(0, 500) + (result.proposalContent.length > 500 ? '...\n\n[Preview truncated]' : ''));
        console.log('='.repeat(60));
      }
    } else {
      console.log('❌ Failed to generate proposal:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Error generating proposal:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }

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

    const success = jobsManager.markAsApplied(
      selectedJob.id,
      selectedJob.title,
      proposalPath,
      notes || undefined
    );

    if (success) {
      console.log('✅ Job marked as applied!');
      showStats(jobsManager);
    } else {
      console.log('❌ Failed to mark job as applied');
    }
  }
  
  return true;
}



// Show job tracking statistics  
function showStats(jobsManager: any): void {
  const stats = jobsManager.getStats();
  console.log('\n📊 TRACKING STATISTICS:');
  console.log(`   📝 Applied: ${stats.applied}`);
  console.log(`   💬 Responses: ${stats.responses}`);
  console.log(`   🎯 Interviews: ${stats.interviews}`);
  console.log(`   ✅ Hired: ${stats.hired}`);
  console.log(`   ❌ Rejected: ${stats.rejected}`);
  console.log(`   🚫 Not Interested: ${stats.notInterested}`);
  console.log(`   📊 Total Tracked: ${stats.total}`);
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
  } else if (args.includes('--introspect-job')) {
    // Job type introspection mode - supports type name parameter
    const typeArgIndex = args.indexOf('--introspect-job') + 1;
    const typeName = args[typeArgIndex] || 'MarketplaceJobPosting';
    
    console.log(`🔍 Introspecting ${typeName} type...`);
    const upworkApi = new UpWorkAPI(config);
    const authResult = await upworkApi.authenticate();

    if (!authResult.success) {
      console.log(`❌ Authentication failed: ${authResult.message}`);
      return;
    }

    const typeData = await upworkApi.introspectType(typeName);
    if (typeData) {
      console.log(`\n📋 ${typeName} Type Details:`);
      console.log('='.repeat(80));
      console.log(`Type: ${typeData.name}`);
      if (typeData.description) console.log(`Description: ${typeData.description}`);
      console.log(`Kind: ${typeData.kind}`);
      console.log('\nAvailable Fields:');
      
      if (typeData.fields) {
        typeData.fields.forEach((field: any) => {
          const getTypeName = (type: any): string => {
            if (type.name) return type.name;
            if (type.ofType) return getTypeName(type.ofType);
            return 'Unknown';
          };
          
          const typeName = getTypeName(field.type);
          console.log(`  • ${field.name}: ${typeName}`);
          if (field.description) console.log(`    - ${field.description}`);
        });
      }
      
      if (typeData.enumValues) {
        console.log('\nEnum Values:');
        typeData.enumValues.forEach((enumValue: any) => {
          console.log(`  • ${enumValue.name}`);
          if (enumValue.description) console.log(`    - ${enumValue.description}`);
          if (enumValue.deprecationReason) console.log(`    ⚠️ DEPRECATED: ${enumValue.deprecationReason}`);
        });
      }
      
      if (typeData.inputFields) {
        console.log('\nInput Fields:');
        typeData.inputFields.forEach((inputField: any) => {
          const getTypeName = (type: any): string => {
            if (type.name) return type.name;
            if (type.ofType) return getTypeName(type.ofType);
            return 'Unknown';
          };
          
          const typeName = getTypeName(inputField.type);
          console.log(`  • ${inputField.name}: ${typeName}`);
          if (inputField.description) console.log(`    - ${inputField.description}`);
        });
      }
      
      console.log('='.repeat(80));
    } else {
      console.log(`❌ Type '${typeName}' not found or no data returned.`);
    }
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