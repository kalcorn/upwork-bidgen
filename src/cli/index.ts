#!/usr/bin/env node

import inquirer from 'inquirer';
import { GeminiRunner } from '../runners/GeminiRunner';
import { ClaudeRunner } from '../runners/ClaudeRunner';




import Table from 'cli-table3';
import { UpWorkAPI, JobData } from '../core/UpWorkAPI';
import { CredentialsManager } from '../core/CredentialsManager';
import { JobsManager } from '../core/JobsManager';
import { InteractiveTable, TableColumn } from '../core/InteractiveTable';
import { NavigableKeyboardMenu } from '../core/NavigableKeyboardMenu';
import { ConfigManager } from '../core/ConfigManager';
import colors from 'colors';
import { countryToAlpha3 } from 'country-to-iso';

import type { AIGenerator } from '../types/AIGenerator';

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

  const applyJobStatusStyling = (content: string | { content: string; href?: string }, job: JobData, isSelected?: boolean): string | { content: string; href?: string } => {
    // If selected, apply yellow highlighting first, then status styling
    if (isSelected) {
      if (job.status === 'applied') {
        return typeof content === 'object' 
          ? { ...content, content: colors.yellow.bold(content.content) }
          : colors.yellow.bold(content);
      } else if (job.status === 'not-interested') {
        // Apply dim yellow to each word individually to prevent wrapping issues
        const applyDimYellowPerWord = (text: string) => {
          return text.split(' ').map(word => colors.yellow.dim(word)).join(' ');
        };
        return typeof content === 'object'
          ? { ...content, content: applyDimYellowPerWord(content.content) }
          : applyDimYellowPerWord(content);
      } else {
        return typeof content === 'object'
          ? { ...content, content: colors.yellow(content.content) }
          : colors.yellow(content);
      }
    }
    
    // Normal status styling when not selected
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
      getValue: (job: JobData, index: number, isSelected?: boolean) => applyJobStatusStyling((index + 1).toString(), job, isSelected)
    },
    {
      header: 'Job Title',
      width: 75,
      getValue: (job: JobData, _index: number, isSelected?: boolean) => {
        const titleWithPremium = job.premium ? `⚡ ${job.title}` : job.title;
        const titleContent = job.ciphertext 
          ? { content: titleWithPremium, href: generateUpWorkJobURL(job.title, job.ciphertext) }
          : titleWithPremium;
        return applyJobStatusStyling(titleContent, job, isSelected);
      }
    },
    {
      header: 'Budget',
      width: 16,
      getValue: (job: JobData, _index: number, isSelected?: boolean) => {
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
        return applyJobStatusStyling(budget, job, isSelected);
      }
    },
    {
      header: 'Duration',
      width: 10,
      getValue: (job: JobData, _index: number, isSelected?: boolean) => applyJobStatusStyling(job.durationLabel ? formatDuration(job.durationLabel) : 'N/A', job, isSelected)
    },
    {
      header: 'Appl.',
      width: 9,
      getValue: (job: JobData, _index: number, isSelected?: boolean) => applyJobStatusStyling(`${job.totalApplicants || 0}`, job, isSelected)
    },
    {
      header: 'Hired',
      width: 8,
      getValue: (job: JobData, _index: number, isSelected?: boolean) => applyJobStatusStyling(job.freelancersToHire ? `0/${job.freelancersToHire}` : '1', job, isSelected)
    },
    {
      header: 'Client Rep.',
      width: 22,
      getValue: (job: JobData, _index: number, isSelected?: boolean) => applyJobStatusStyling(formatClientInfo(job.client), job, isSelected)
    },
    {
      header: 'Location',
      width: 15,
      getValue: (job: JobData, _index: number, isSelected?: boolean) => applyJobStatusStyling(abbreviateCountry(job.client?.location?.country || ''), job, isSelected)
    },
    {
      header: 'Pref. Loc.',
      width: 15,
      getValue: (job: JobData, _index: number, isSelected?: boolean) => {
        const prefLoc = job.preferredFreelancerLocation && job.preferredFreelancerLocation.length > 0 
          ? job.preferredFreelancerLocation.map(abbreviateCountry).join(', ') 
          : 'Any';
        return applyJobStatusStyling(prefLoc, job, isSelected);
      }
    },
    {
      header: 'Posted',
      width: 19,
      getValue: (job: JobData, _index: number, isSelected?: boolean) => {
        const postedDate = job.publishedDateTime 
          ? new Date(job.publishedDateTime).toLocaleString('en-US',
              { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '') 
          : 'N/A';
        return applyJobStatusStyling(postedDate, job, isSelected);
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
  const configManager = new ConfigManager();
  const appConfigResult = configManager.getAppConfig();
  if (!appConfigResult) {
    console.error('❌ Failed to load application configuration');
    process.exit(1);
  }
  const appConfig = appConfigResult;
  
  const credentialsManager = new CredentialsManager();
  const jobsManager = new JobsManager();

  // Check for credentials
  if (!credentialsManager.hasCredentials()) {
    console.log('❌ No UpWork API credentials found.');
    console.log('Please run `npx ts-node src/cli/index.ts --setup` to configure them.');
    return;
  }

  // 2. Authenticate and search for jobs
  console.log('\n🔍 Authenticating with UpWork...');
  const upworkApi = new UpWorkAPI(appConfig);
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
  const searchResults = await upworkApi.searchJobs(appConfig.upworkApi.searchFilters);

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
  await startTableBasedJobBrowsing(filteredJobs, jobsManager, upworkApi, appConfig, initialPaginationInfo);
}


// Main job browsing using InteractiveTable class
async function startTableBasedJobBrowsing(
  jobs: JobData[], 
  jobsManager: any, 
  upworkApi: any, 
  appConfig: any,
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
    },
    onLoadMore: async (): Promise<boolean> => {
      return await loadMoreJobs(upworkApi, jobsManager, interactiveTable, nextCursor, hasMoreApiData, jobIds, (cursor, hasMore) => {
        nextCursor = cursor;
        hasMoreApiData = hasMore;
      }, appConfig);
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
      } else if (key === 'a') {
        if (job.status === 'applied') {
          // Undo applied - remove from tracking
          jobsManager.removeTrackedJob(job.id);
          delete job.status;
        } else {
          // Mark as applied
          jobsManager.markAsApplied(job.id, job.title, '', new Date());
          job.status = 'applied';
        }
      }
    },
    getDynamicControls: (job: JobData) => {
      const notInterestedControl = job.status === 'not-interested' ? 'I[n]terested' : '[N]ot Interested';
      const appliedControl = job.status === 'applied' ? 'Not [A]pplied' : '[A]pplied';
      return `${notInterestedControl} | ${appliedControl}`;
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
  updatePaginationState: (cursor: string | null, hasMore: boolean) => void,
  appConfig: any
): Promise<boolean> {
  try {
    if (!hasMoreApiData) {
      return false;
    }
    
    // Create pagination parameters for next batch
    const searchFilters = {
      ...appConfig.upworkApi.searchFilters,
      marketPlaceJobFilter: {
        ...appConfig.upworkApi.searchFilters.marketPlaceJobFilter,
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

      // Don't filter out not-interested jobs - let them display with gray styling
      
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

    // Integrate job statuses for new jobs
    uniqueNewJobs.forEach((job: JobData) => {
      const trackedJob = jobsManager.getTrackedJob(job.id);
      if (trackedJob) {
        job.status = trackedJob.status;
      }
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

  // Show comprehensive job details
  const jobData = comprehensiveJobData || selectedJob;
  displayAllJobData(jobData);

  // Start job navigation menu
  await handleJobNavigation(selectedJob, comprehensiveJobData, jobsManager, upworkApi, []);
  
  // Update job status after menu operations
  const trackedJob = jobsManager.getTrackedJob(selectedJob.id);
  if (trackedJob) {
    selectedJob.status = trackedJob.status;
  }
}

// Custom display functions for specific data structures

// Display comprehensive job data without arbitrary truncation
function displayAllJobData(jobData: JobData): void {
  console.log('\n📋 COMPREHENSIVE JOB DETAILS:');
  console.log('='.repeat(80));

  const displayValue = (key: string, value: any, indent: number): void => {
    const prefix = '  '.repeat(indent);
    if (value === undefined || value === null) {
      // console.log(`${prefix}${key}: N/A`); // Optionally display N/A for null/undefined
      return;
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          console.log(`${prefix}${key}: [`);
          value.forEach((item, index) => {
            console.log(`${prefix}  - [${index}]`);
            displayObject(item, indent + 2, jobData);
          });
          console.log(`${prefix}]`);
        } else {
          // console.log(`${prefix}${key}: []`); // Optionally display empty arrays
        }
      } else {
        // Handle specific complex objects with custom formatting
        if (key === 'amount' || key === 'hourlyBudgetMin' || key === 'hourlyBudgetMax') {
          const rawValue = value.rawValue;
          const displayValue = value.displayValue;
          const currency = value.currency;
          if (rawValue || displayValue) {
            console.log(`${prefix}💰 ${key}: ${displayValue || rawValue} ${currency || ''}`.trim());
          }
        } else if (key === 'client' && value) {
          console.log(`${prefix}👤 client:`);
          displayObject(value, indent + 1, jobData);
        } else if (key === 'classification' && value) {
          console.log(`${prefix}📂 classification:`);
          displayObject(value, indent + 1, jobData);
        } else if (key === 'contractTerms' && value) {
          console.log(`${prefix}📝 contractTerms:`);
          displayObject(value, indent + 1, jobData);
        } else if (key === 'contractorSelection' && value) {
          console.log(`${prefix}🤝 contractorSelection:`);
          displayObject(value, indent + 1, jobData);
        } else if (key === 'ownership' && value) {
          console.log(`${prefix}👑 ownership:`);
          displayObject(value, indent + 1, jobData);
        } else if (key === 'activityStat' && value) {
          console.log(`${prefix}📊 activityStat:`);
          displayObject(value, indent + 1, jobData);
        } else if (key === 'annotations' && value) {
          console.log(`${prefix}🏷️ annotations:`);
          displayObject(value, indent + 1, jobData);
        } else if (key === 'attachments' && value) {
          console.log(`${prefix}📎 attachments:`);
          displayObject(value, indent + 1, jobData);
        } else if (key === 'workFlowState' && value) {
          console.log(`${prefix}🔄 workFlowState:`);
          displayObject(value, indent + 1, jobData);
        } else if (key === 'clientCompanyPublic' && value) {
          console.log(`${prefix}🏢 clientCompanyPublic:`);
          displayObject(value, indent + 1, jobData);
        } else {
          // Generic object display
          if (Object.keys(value).length > 0) {
            console.log(`${prefix}${key}: {`);
            displayObject(value, indent + 1, jobData);
            console.log(`${prefix}}`);
          } else {
            // console.log(`${prefix}${key}: {}`); // Optionally display empty objects
          }
        }
      }
    } else {
      // Primitive value
      console.log(`${prefix}${key}: ${value}`);
    }
  };

  const displayObject = (obj: any, indent: number = 0, parentJobData?: JobData): void => {
    const prefix = '  '.repeat(indent);
    
    // Handle location consolidation for clientCompanyPublic at the beginning
    if (obj.city || obj.state) {
      const location = [obj.city, obj.state].filter(Boolean).join(', ');
      if (location) {
        console.log(`${prefix}📍 Location: ${location}`);
      }
    }
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        // Special handling for description to avoid excessive logging of long text
        if (key === 'description' && typeof value === 'string') {
          console.log(`${prefix}📝 description:`);
          console.log(value);
        } else if (key === 'title' && typeof value === 'string') {
          console.log(`${prefix}📋 title: ${value}`);
        } else if (key === 'id' && typeof value === 'string') {
          console.log(`${prefix}🆔 id: ${value}`);
        } else if (key === 'ciphertext' && typeof value === 'string') {
          console.log(`${prefix}🔐 ciphertext: ${value}`);
        } else if (key === 'publishedDateTime' && typeof value === 'string') {
          console.log(`${prefix}📅 publishedDateTime: ${value}`);
        } else if (key === 'preferredFreelancerLocation' && Array.isArray(value)) {
          if (value.length > 0) {
            console.log(`${prefix}🌍 preferredFreelancerLocation: ${value.join(', ')}`);
          }
        } else if (key === 'skills' && Array.isArray(value)) {
          const skills = value.map(skill => skill.preferredLabel).filter(Boolean).join(', ');
          if (skills) console.log(`${prefix}🛠️ skills: ${skills}`);
        } else if (key === 'additionalSkills' && Array.isArray(value)) {
          // Handle additionalSkills as array of strings (flattened format)
          const additionalSkills = value.join(', ');
          if (additionalSkills) console.log(`${prefix}➕ additionalSkills: ${additionalSkills}`);
        } else if (key === 'hourlyContractTerms' && value) {
          console.log(`${prefix}hourlyContractTerms:`);
          // Handle hourly contract terms with budget consolidation
          if (value.hourlyBudgetMin && value.hourlyBudgetMax) {
            const budgetPrefix = '  '.repeat(indent + 1);
            console.log(`${budgetPrefix}💰 Budget: $${value.hourlyBudgetMin} - $${value.hourlyBudgetMax}`);
          }
          // Display other fields except budget min/max
          for (const subKey in value) {
            if (subKey !== 'hourlyBudgetMin' && subKey !== 'hourlyBudgetMax' && value[subKey] !== undefined) {
              if (subKey === 'engagementDuration' && value[subKey]?.id) {
                // Remove id from engagementDuration
                const cleanDuration = { ...value[subKey], id: undefined };
                displayValue(subKey, cleanDuration, indent + 1);
              } else {
                displayValue(subKey, value[subKey], indent + 1);
              }
            }
          }
        } else if (key === 'company' && value?.id) {
          // Remove id from company in ownership
          const cleanCompany = { ...value, id: undefined };
          displayValue('company', cleanCompany, indent);
        } else if (key === 'team' && value?.id) {
          // Remove id from team in ownership  
          const cleanTeam = { ...value, id: undefined };
          displayValue('team', cleanTeam, indent);
        } else if (key === 'city' || key === 'state') {
          // Skip individual city/state - will be handled by location consolidation
          // Don't process this field, but continue with others
        } else if (key === 'legacyType') {
          // Skip legacyType as requested
          // Don't process this field, but continue with others
        } else if (key === 'id' && (obj.company || obj.team)) {
          // Skip id in ownership contexts only  
          // Don't process this field, but continue with others
        } else if (key === 'category' && value?.preferredLabel) {
          console.log(`${prefix}📂 category: ${value.preferredLabel}`);
        } else if (key === 'attachments' && Array.isArray(value) && value.length > 0) {
          console.log(`${prefix}📎 attachments (${value.length}):`);
          value.forEach((attachment, index) => {
            const attachmentPrefix = '  '.repeat(indent + 1);
            console.log(`${attachmentPrefix}[${index}]`);
            
            // Generate download URL if we have attachment id and job id
            if (attachment.id && parentJobData?.id) {
              const downloadUrl = `https://www.upwork.com/att/download/openings/${parentJobData.id}/attachments/${attachment.id}/download`;
              console.log(`${attachmentPrefix}  📥 downloadUrl: ${downloadUrl}`);
            }
            
            // Display other attachment properties
            for (const attKey in attachment) {
              if (attKey !== 'id' && attachment[attKey] !== undefined) {
                console.log(`${attachmentPrefix}  ${attKey}: ${attachment[attKey]}`);
              }
            }
            
            // Still show the id for reference
            if (attachment.id) {
              console.log(`${attachmentPrefix}  id: ${attachment.id}`);
            }
          });
        } else if (key === 'screeningQuestions' && Array.isArray(value)) {
          if (value.length > 0) {
            console.log(`${prefix}❓ SCREENING QUESTIONS (${value.length}):`);
            value.forEach((sq, index) => {
              if (sq.question) {
                console.log(`${prefix}  ${index + 1}. ${sq.question}`);
              }
            });
          }
        } else if (key === 'tags' && Array.isArray(value)) {
          // Remove annotations.tags as requested
          // Don't process this field, but continue with others
        } else if (key === 'customFields' && Array.isArray(value)) {
          if (value.length > 0) {
            const formattedFields = value.map(field => `${field.key}: ${field.value}`).join(', ');
            console.log(`${prefix}customFields: ${formattedFields}`);
          }
        } else {
          displayValue(key, value, indent);
        }
      }
    }
  };

  displayObject(jobData, 0, jobData);
  console.log('='.repeat(80));
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
    // Determine if job is currently marked as not-interested
    const isNotInterested = selectedJob.status === 'not-interested';
    
    // Build menu options based on job status
    const menuOptions = [
      { key: 'p', label: 'Generate proposal', value: 'proposal' }
    ];
    
    // Add interest toggle option - show only the appropriate action
    if (isNotInterested) {
      menuOptions.push({ key: 'n', label: 'Interested', value: 'mark-interested' });
    } else {
      menuOptions.push({ key: 'n', label: 'Not interested', value: 'mark-not-interested' });
    }
    
    menuOptions.push({ key: 'esc', label: 'Back to job list', value: 'back' });
    
    const choice = await NavigableKeyboardMenu.choose(
      '🎮 Choose action for this job:',
      menuOptions
    );
    
    switch (choice) {
      case 'proposal':
        const applied = await handleApplyToJob(selectedJob, comprehensiveJobData, jobsManager);
        if (applied) return; // Exit after successful application
        continue;
        
      case 'mark-interested':
        // Mark as interested - remove from tracking
        jobsManager.removeTrackedJob(selectedJob.id);
        delete selectedJob.status;
        console.log('✅ Job marked as interested');
        continue;
        
      case 'mark-not-interested':
        // Mark as not interested and return to job list
        jobsManager.markAsNotInterested(selectedJob.id, selectedJob.title);
        selectedJob.status = 'not-interested';
        console.log('🚫 Job marked as not interested');
        console.log('\n⬅️ Returning to job list...');
        return; // Exit and return to job selection
        
      case 'back':
        console.log('\n⬅️ Returning to job list...');
        return; // Exit and return to job selection
        
      case 'escape-key-pressed':
        console.log('\n⬅️ Returning to job list...');
        return; // Exit and return to job selection
    }
  }
}






// Handle applying to job
async function handleApplyToJob(
  selectedJob: JobData, 
  comprehensiveJobData: JobData | null,
  _jobsManager: any
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

  // Check for available AI runners (run in parallel to reduce delay)
  

  // Check for available AI runners (run in parallel to reduce delay)
  const claudeRunner = new ClaudeRunner();
  const geminiRunner = new GeminiRunner('gemini-2.5-flash'); // Instantiate GeminiRunner with hardcoded model
  const results = await Promise.allSettled([
    claudeRunner.isAvailable(),
    geminiRunner.isAvailable()
  ]);
  
  const isClaudeAvailable = results[0].status === 'fulfilled' && results[0].value;
  const isGeminiAvailable = results[1].status === 'fulfilled' && results[1].value;

  const aiChoices = [];
  if (isClaudeAvailable) {
    aiChoices.push({ name: "Claude", value: "claude" });
  }
  if (isGeminiAvailable) {
    aiChoices.push({ name: "Gemini", value: "gemini" });
  }
  aiChoices.push({ name: "None (manual proposal)", value: "none" });

  // Prompt for AI selection
  const { selectedAI } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedAI',
      message: 'Which AI would you like to use to generate your proposal?',
      choices: aiChoices,
      default: isGeminiAvailable ? 'gemini' : (isClaudeAvailable ? 'claude' : 'none') // Default to Gemini if available
    }
  ]);

  try {
    let success = false; // Keep success variable

    let proposalResult;
    let runnerToUse: AIGenerator | null = null; // Explicitly type the runner

    if (selectedAI === 'claude') {
      runnerToUse = claudeRunner;
    } else if (selectedAI === 'gemini') {
      runnerToUse = geminiRunner; // Use the already instantiated geminiRunner
    }

    proposalResult = await proposalGenerator.generateProposal(comprehensiveJobData || selectedJob, selectedTemplate, runnerToUse);

    if (proposalResult.success) {
      success = true;
      console.log('✅ Proposal generated successfully!');
      console.log(`📁 Saved to: ${proposalResult.outputPath}`);
      console.log(`📄 Template used: ${proposalResult.templateUsed}`);
    } else {
      console.log('❌ Failed to generate proposal:', proposalResult.error);
    }

    // The file is now saved by ProposalGenerator, so this block is removed.
    // Ensure the function returns true if successful, false otherwise.
    return success;
  } catch (error) {
    console.log('❌ Error generating proposal:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }

  return true;
}



// Show job tracking statistics  


// Argument parsing for special modes
(async (): Promise<void> => {
  const args = process.argv.slice(2);

  if (args.includes('--setup')) {
    // Simplified setup flow
    const credentialsManager = new CredentialsManager();
    await credentialsManager.setupCredentials();
  } else if (args.includes('--introspect')) {
    // Schema introspection mode
    console.log('🔍 Introspecting UpWork GraphQL Schema...');
    const configManager = new ConfigManager();
    const appConfig = configManager.getAppConfig();
    if (!appConfig) {
      console.error('❌ Failed to load application configuration');
      process.exit(1);
    }
    const upworkApi = new UpWorkAPI(appConfig);
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
    const configManager = new ConfigManager();
    const appConfig = configManager.getAppConfig();
    if (!appConfig) {
      console.error('❌ Failed to load application configuration');
      process.exit(1);
    }
    const upworkApi = new UpWorkAPI(appConfig);
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
    const configManager = new ConfigManager();
    const appConfig = configManager.getAppConfig();
    if (!appConfig) {
      console.error('❌ Failed to load application configuration');
      process.exit(1);
    }
    const upworkApi = new UpWorkAPI(appConfig);
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
    const configManager = new ConfigManager();
    const appConfig = configManager.getAppConfig();
    if (!appConfig) {
      console.error('❌ Failed to load application configuration');
      process.exit(1);
    }
    const upworkApi = new UpWorkAPI(appConfig);
    const authResult = await upworkApi.authenticate();

    if (!authResult.success) {
      console.log(`❌ Authentication failed: ${authResult.message}`);
      return;
    }

    const searchResults = await upworkApi.searchJobs(appConfig.upworkApi.searchFilters);
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