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
      type: 'input',
      name: 'jobNumber',
      message: 'Enter job number to generate proposal for:',
      validate: (input) => {
        const num = parseInt(input, 10);
        if (isNaN(num) || num < 1 || num > filteredJobs.length) {
          return `Please enter a valid number between 1 and ${filteredJobs.length}`;
        }
        return true;
      },
      filter: (input) => {
        return parseInt(input, 10);
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
  
  // Generate UpWork URL for comprehensive job details fetching
  let jobUrl = '';
  if (selectedJob.ciphertext) {
    jobUrl = generateUpWorkJobURL(selectedJob.title, selectedJob.ciphertext);
    console.log(`🔗 UpWork URL: ${jobUrl}`);
  }

  // Fetch comprehensive job details
  console.log('\n🔍 Fetching comprehensive job details...');
  try {
    const comprehensiveJobData = await upworkApi.getJobDetails(selectedJob.id);
    
    if (comprehensiveJobData) {
      console.log('\n' + '='.repeat(80));
      console.log('📋 COMPREHENSIVE JOB DETAILS');
      console.log('='.repeat(80));
      
      // Basic Information
      console.log('\n🏷️  BASIC INFORMATION:');
      console.log(`   Title: ${comprehensiveJobData.content?.title || selectedJob.title}`);
      console.log(`   ID: ${comprehensiveJobData.id || selectedJob.id}`);
      console.log(`   Workflow State: ${comprehensiveJobData.workFlowState || 'N/A'}`);
      console.log(`   Can Receive Proposals: ${comprehensiveJobData.canClientReceiveContractProposal ? 'Yes' : 'No'}`);
      
      // Description
      if (comprehensiveJobData.content?.description) {
        console.log('\n📝 DESCRIPTION:');
        console.log(`   ${comprehensiveJobData.content.description.substring(0, 500)}${comprehensiveJobData.content.description.length > 500 ? '...' : ''}`);
      }

      // Classification
      if (comprehensiveJobData.classification) {
        console.log('\n🏷️  CLASSIFICATION:');
        if (comprehensiveJobData.classification.category) {
          const cat = comprehensiveJobData.classification.category as any;
          console.log(`   Category: ${cat.preferredLabel || cat.id}`);
          if (cat.ontologyId) console.log(`     Ontology ID: ${cat.ontologyId}`);
          if (cat.definition) console.log(`     Definition: ${cat.definition}`);
          if (cat.type) console.log(`     Type: ${cat.type}`);
          if (cat.entityStatus) console.log(`     Status: ${cat.entityStatus}`);
          if (cat.createdDateTime) console.log(`     Created: ${cat.createdDateTime}`);
        }
        if (comprehensiveJobData.classification.subCategory) {
          const subCat = comprehensiveJobData.classification.subCategory as any;
          console.log(`   Subcategory: ${subCat.preferredLabel || subCat.id}`);
          if (subCat.ontologyId) console.log(`     Ontology ID: ${subCat.ontologyId}`);
          if (subCat.definition) console.log(`     Definition: ${subCat.definition}`);
          if (subCat.type) console.log(`     Type: ${subCat.type}`);
          if (subCat.entityStatus) console.log(`     Status: ${subCat.entityStatus}`);
          if (subCat.createdDateTime) console.log(`     Created: ${subCat.createdDateTime}`);
        }
        if (comprehensiveJobData.classification.occupation) {
          const occ = comprehensiveJobData.classification.occupation as any;
          console.log(`   Occupation: ${occ.preferredLabel || occ.id}`);
          if (occ.ontologyId) console.log(`     Ontology ID: ${occ.ontologyId}`);
          if (occ.definition) console.log(`     Definition: ${occ.definition}`);
          if (occ.type) console.log(`     Type: ${occ.type}`);
          if (occ.entityStatus) console.log(`     Status: ${occ.entityStatus}`);
        }
        if (comprehensiveJobData.classification.skills && comprehensiveJobData.classification.skills.length > 0) {
          console.log(`   Skills:`);
          comprehensiveJobData.classification.skills.forEach(skill => {
            const s = skill as any;
            console.log(`     • ${s.preferredLabel || s.id}`);
            if (s.ontologyId) console.log(`       Ontology ID: ${s.ontologyId}`);
            if (s.definition) console.log(`       Definition: ${s.definition.substring(0, 100)}${s.definition.length > 100 ? '...' : ''}`);
            if (s.broader) console.log(`       Broader: ${s.broader}`);
            if (s.narrower) console.log(`       Narrower: ${s.narrower}`);
            if (s.legacySkillNid) console.log(`       Legacy: ${s.legacySkillNid}`);
            if (s.entityStatus) console.log(`       Status: ${s.entityStatus}`);
          });
        }
        if (comprehensiveJobData.classification.additionalSkills && comprehensiveJobData.classification.additionalSkills.length > 0) {
          console.log(`   Additional Skills:`);
          comprehensiveJobData.classification.additionalSkills.forEach(skill => {
            const s = skill as any;
            console.log(`     • ${s.preferredLabel || s.id}`);
            if (s.ontologyId) console.log(`       Ontology ID: ${s.ontologyId}`);
            if (s.definition) console.log(`       Definition: ${s.definition.substring(0, 100)}${s.definition.length > 100 ? '...' : ''}`);
            if (s.broader) console.log(`       Broader: ${s.broader}`);
            if (s.narrower) console.log(`       Narrower: ${s.narrower}`);
            if (s.legacySkillNid) console.log(`       Legacy: ${s.legacySkillNid}`);
            if (s.entityStatus) console.log(`       Status: ${s.entityStatus}`);
          });
        }
      }

      // Contract Terms
      if (comprehensiveJobData.contractTerms) {
        console.log('\n💼 CONTRACT TERMS:');
        console.log(`   Contract Type: ${comprehensiveJobData.contractTerms.contractType || 'N/A'}`);
        console.log(`   Experience Level: ${comprehensiveJobData.contractTerms.experienceLevel || 'N/A'}${comprehensiveJobData.contractTerms.notSureExperiencelevel ? ' (Client unsure)' : ''}`);
        console.log(`   Persons to Hire: ${comprehensiveJobData.contractTerms.personsToHire || 'N/A'}${comprehensiveJobData.contractTerms.notSurePersonsToHire ? ' (Client unsure)' : ''}`);
        console.log(`   On-Site Type: ${comprehensiveJobData.contractTerms.onSiteType || 'N/A'}`);
        
        if (comprehensiveJobData.contractTerms.contractStartDate) {
          console.log(`   Start Date: ${comprehensiveJobData.contractTerms.contractStartDate}`);
        }
        if (comprehensiveJobData.contractTerms.contractEndDate) {
          console.log(`   End Date: ${comprehensiveJobData.contractTerms.contractEndDate}`);
        }

        // Fixed Price Contract Terms
        if (comprehensiveJobData.contractTerms.fixedPriceContractTerms) {
          const fixed = comprehensiveJobData.contractTerms.fixedPriceContractTerms;
          console.log('\n💰 FIXED PRICE TERMS:');
          if (fixed.amount) {
            console.log(`   Amount: ${fixed.amount.displayValue || fixed.amount.rawValue} ${fixed.amount.currency || ''}`);
          }
          if (fixed.maxAmount) {
            console.log(`   Max Amount: ${fixed.maxAmount.displayValue || fixed.maxAmount.rawValue} ${fixed.maxAmount.currency || ''}`);
          }
          if (fixed.engagementDuration) {
            console.log(`   Duration: ${fixed.engagementDuration.label} (${fixed.engagementDuration.weeks} weeks)`);
          }
        }

        // Hourly Contract Terms
        if (comprehensiveJobData.contractTerms.hourlyContractTerms) {
          const hourly = comprehensiveJobData.contractTerms.hourlyContractTerms;
          console.log('\n⏰ HOURLY TERMS:');
          if (hourly.hourlyBudgetMin || hourly.hourlyBudgetMax) {
            console.log(`   Hourly Rate: $${hourly.hourlyBudgetMin || 'N/A'} - $${hourly.hourlyBudgetMax || 'N/A'}`);
          }
          console.log(`   Budget Type: ${hourly.hourlyBudgetType || 'N/A'}`);
          console.log(`   Engagement Type: ${hourly.engagementType || 'N/A'}`);
          if (hourly.engagementDuration) {
            console.log(`   Duration: ${hourly.engagementDuration.label} (${hourly.engagementDuration.weeks} weeks)${hourly.notSureProjectDuration ? ' (Client unsure)' : ''}`);
          } else if (hourly.notSureProjectDuration) {
            console.log(`   Duration: Not specified (Client unsure)`);
          }
        }
      }

      // Proposal Requirements
      if (comprehensiveJobData.contractorSelection?.proposalRequirement) {
        const req = comprehensiveJobData.contractorSelection.proposalRequirement;
        console.log('\n📋 PROPOSAL REQUIREMENTS:');
        console.log(`   Cover Letter Required: ${req.coverLetterRequired ? 'Yes' : 'No'}`);
        console.log(`   Milestones Allowed: ${req.freelancerMilestonesAllowed ? 'Yes' : 'No'}`);
        
        if (req.screeningQuestions && req.screeningQuestions.length > 0) {
          console.log('\n❓ SCREENING QUESTIONS:');
          req.screeningQuestions.forEach((q: any, index: number) => {
            console.log(`   ${index + 1}. ${q.question}${q.required ? ' (Required)' : ''}`);
            if (q.id) console.log(`     ID: ${q.id}`);
            if (q.options && q.options.length > 0) {
              console.log(`     Options:`);
              q.options.forEach((option: any) => {
                console.log(`       - ${option.option}${option.id ? ` (ID: ${option.id})` : ''}`);
              });
            }
          });
        }
        
        // Additional contractor selection info
        if (comprehensiveJobData.contractorSelection?.qualification) {
          const qual = comprehensiveJobData.contractorSelection.qualification;
          console.log('\n✅ QUALIFICATION REQUIREMENTS:');
          console.log(`   Contractor Type: ${qual.contractorType || 'N/A'}`);
          console.log(`   English Proficiency: ${qual.englishProficiency || 'N/A'}`);
          console.log(`   Has Portfolio: ${qual.hasPortfolio ? 'Yes' : 'No'}`);
          console.log(`   Hours Worked: ${qual.hoursWorked || 'N/A'}`);
          console.log(`   Rising Talent: ${qual.risingTalent ? 'Yes' : 'No'}`);
          console.log(`   Job Success Score: ${qual.jobSuccessScore || 'N/A'}`);
          if (qual.minEarning) {
            console.log(`   Min Earning: ${qual.minEarning.displayValue || qual.minEarning.rawValue} ${qual.minEarning.currency || ''}`);
          }
          if (qual.preferredGroups) {
            console.log(`   Preferred Groups: ${qual.preferredGroups}`);
          }
          if (qual.preferenceTests) {
            console.log(`   Preference Tests: ${qual.preferenceTests}`);
          }
        }
        
        if (comprehensiveJobData.contractorSelection?.location) {
          const loc = comprehensiveJobData.contractorSelection.location;
          console.log('\n📍 LOCATION REQUIREMENTS:');
          if (loc.countries) console.log(`   Countries: ${loc.countries}`);
          if (loc.states) console.log(`   States: ${loc.states}`);
          if (loc.timezones) console.log(`   Timezones: ${loc.timezones}`);
          console.log(`   Local Check Required: ${loc.localCheckRequired ? 'Yes' : 'No'}`);
          console.log(`   Local Market: ${loc.localMarket ? 'Yes' : 'No'}`);
          if (loc.areas && loc.areas.length > 0) {
            console.log(`   Areas:`);
            loc.areas.forEach((area: any) => {
              console.log(`     • ${area.name || area.id}`);
            });
          }
          console.log(`   Not Sure Location Preference: ${loc.notSureLocationPreference ? 'Yes' : 'No'}`);
          if (loc.localDescription) console.log(`   Local Description: ${loc.localDescription}`);
          if (loc.localFlexibilityDescription) console.log(`   Local Flexibility: ${loc.localFlexibilityDescription}`);
        }
      }

      // Company Information
      if (comprehensiveJobData.clientCompanyPublic) {
        const company = comprehensiveJobData.clientCompanyPublic;
        console.log('\n🏢 CLIENT COMPANY:');
        console.log(`   ID: ${company.id || 'N/A'}`);
        console.log(`   Legacy Type: ${company.legacyType || 'N/A'}`);
        console.log(`   Can Hire: ${company.canHire ? 'Yes' : 'No'}`);
        console.log(`   Teams Enabled: ${company.teamsEnabled ? 'Yes' : 'No'}`);
        console.log(`   Hidden Profile: ${company.hidden ? 'Yes' : 'No'}`);
        console.log(`   Billing Type: ${company.billingType || 'N/A'}`);
        if (company.accountingEntity) {
          console.log(`   Accounting Entity: ${company.accountingEntity}`);
        }
        
        if (company.country || company.city || company.state) {
          let location = '';
          if (company.city) location += company.city;
          if (company.state) location += (location ? ', ' : '') + company.state;
          if (company.country) {
            const countryName = company.country.name || 'N/A';
            location += (location ? ', ' : '') + countryName;
          }
          console.log(`   Location: ${location || 'N/A'}`);
        }
        if (company.timezone) {
          console.log(`   Timezone: ${company.timezone}`);
        }
        if (company.agencyDetails) {
          console.log(`   Agency Details ID: ${company.agencyDetails.id || 'N/A'}`);
        }
      }

      // Ownership
      if (comprehensiveJobData.ownership) {
        console.log('\n🏛️  OWNERSHIP:');
        if (comprehensiveJobData.ownership.company) {
          console.log(`   Company: ${comprehensiveJobData.ownership.company.name || comprehensiveJobData.ownership.company.id}`);
          if (comprehensiveJobData.ownership.company.description) {
            console.log(`     Description: ${comprehensiveJobData.ownership.company.description}`);
          }
        }
        if (comprehensiveJobData.ownership.team) {
          console.log(`   Team: ${comprehensiveJobData.ownership.team.name || comprehensiveJobData.ownership.team.id}`);
          if (comprehensiveJobData.ownership.team.description) {
            console.log(`     Description: ${comprehensiveJobData.ownership.team.description}`);
          }
        }
      }

      // Activity Statistics
      if (comprehensiveJobData.activityStat) {
        console.log('\n📊 ACTIVITY STATISTICS:');
        
        // Job Activity
        if (comprehensiveJobData.activityStat.jobActivity) {
          const activity = comprehensiveJobData.activityStat.jobActivity;
          console.log('   Job Activity:');
          if (activity.lastClientActivity) console.log(`     Last Client Activity: ${activity.lastClientActivity}`);
          if (activity.invitesSent) console.log(`     Invites Sent: ${activity.invitesSent}`);
          if (activity.totalInvitedToInterview) console.log(`     Invited to Interview: ${activity.totalInvitedToInterview}`);
          if (activity.totalHired) console.log(`     Total Hired: ${activity.totalHired}`);
          if (activity.totalOffered) console.log(`     Total Offered: ${activity.totalOffered}`);
          if (activity.totalRecommended) console.log(`     Total Recommended: ${activity.totalRecommended}`);
          if (activity.totalUnansweredInvites) console.log(`     Unanswered Invites: ${activity.totalUnansweredInvites}`);
        }

        // Bid Statistics
        if (comprehensiveJobData.activityStat.applicationsBidStats) {
          const bidStats = comprehensiveJobData.activityStat.applicationsBidStats;
          console.log('   Bid Statistics:');
          if (bidStats.avgRateBid) {
            console.log(`     Average Rate: ${bidStats.avgRateBid.displayValue || bidStats.avgRateBid.rawValue} ${bidStats.avgRateBid.currency || ''}`);
          }
          if (bidStats.minRateBid) {
            console.log(`     Min Rate: ${bidStats.minRateBid.displayValue || bidStats.minRateBid.rawValue} ${bidStats.minRateBid.currency || ''}`);
          }
          if (bidStats.maxRateBid) {
            console.log(`     Max Rate: ${bidStats.maxRateBid.displayValue || bidStats.maxRateBid.rawValue} ${bidStats.maxRateBid.currency || ''}`);
          }
          if (bidStats.avgInterviewedRateBid) {
            console.log(`     Avg Interviewed Rate: ${bidStats.avgInterviewedRateBid.displayValue || bidStats.avgInterviewedRateBid.rawValue} ${bidStats.avgInterviewedRateBid.currency || ''}`);
          }
        }
      }

      // Tags and Custom Fields
      if (comprehensiveJobData.annotations?.tags && comprehensiveJobData.annotations.tags.length > 0) {
        console.log('\n🏷️  TAGS:');
        console.log(`   ${comprehensiveJobData.annotations.tags.join(', ')}`);
      }
      
      if (comprehensiveJobData.annotations?.customFields && comprehensiveJobData.annotations.customFields.length > 0) {
        console.log('\n🔧 CUSTOM FIELDS:');
        comprehensiveJobData.annotations.customFields.forEach(field => {
          console.log(`   ${field.key}: ${field.value}`);
        });
      }

      // Additional Data Sections
      if (comprehensiveJobData.attachments && comprehensiveJobData.attachments.length > 0) {
        console.log('\n📎 ATTACHMENTS:');
        comprehensiveJobData.attachments.forEach(attachment => {
          console.log(`   ID: ${attachment.id}`);
        });
      }

      if (comprehensiveJobData.segmentationData && comprehensiveJobData.segmentationData.length > 0) {
        console.log('\n📊 SEGMENTATION DATA:');
        comprehensiveJobData.segmentationData.forEach((data: any) => {
          console.log(`   ID: ${data.id}`);
        });
      }

      if (comprehensiveJobData.additionalSearchInfo && comprehensiveJobData.additionalSearchInfo.length > 0) {
        console.log('\n🔍 ADDITIONAL SEARCH INFO:');
        comprehensiveJobData.additionalSearchInfo.forEach((info: any) => {
          console.log(`   ID: ${info.id}`);
        });
      }

      if (comprehensiveJobData.clientProposals?.edges && comprehensiveJobData.clientProposals.edges.length > 0) {
        console.log('\n💼 CLIENT PROPOSALS:');
        console.log(`   Found ${comprehensiveJobData.clientProposals.edges.length} proposal(s)`);
        console.log(`   Has More: ${comprehensiveJobData.clientProposals.pageInfo?.hasNextPage ? 'Yes' : 'No'}`);
        if (comprehensiveJobData.clientProposals.pageInfo?.endCursor) {
          console.log(`   End Cursor: ${comprehensiveJobData.clientProposals.pageInfo.endCursor}`);
        }
      }

      if (comprehensiveJobData.customFields?.edges && comprehensiveJobData.customFields.edges.length > 0) {
        console.log('\n⚙️  CUSTOM FIELDS (Paginated):');
        console.log(`   Found ${comprehensiveJobData.customFields.edges.length} field(s)`);
        console.log(`   Has More: ${comprehensiveJobData.customFields.pageInfo?.hasNextPage ? 'Yes' : 'No'}`);
        if (comprehensiveJobData.customFields.pageInfo?.endCursor) {
          console.log(`   End Cursor: ${comprehensiveJobData.customFields.pageInfo.endCursor}`);
        }
      }

      console.log('\n' + '='.repeat(80));
      console.log('✅ COMPREHENSIVE JOB DETAILS COMPLETE - ALL AVAILABLE DATA DISPLAYED');
      console.log('='.repeat(80));
    } else {
      console.log('⚠️  Could not fetch comprehensive job details, showing basic information:');
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
    }
  } catch (error) {
    console.error('❌ Error fetching comprehensive job details:', error instanceof Error ? error.message : 'Unknown error');
    console.log('⚠️  Falling back to basic information:');
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