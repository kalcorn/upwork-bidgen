const fs = require('fs');
const path = require('path');

function buildProposal(jobData, templateName) {
  const templatePath = path.join(__dirname, '..', 'templates', templateName);
  const template = fs.readFileSync(templatePath, 'utf-8');

  // Extract a more meaningful description summary
  const descriptionSummary = jobData.description.length > 100 
    ? jobData.description.slice(0, 100).replace(/\s+\S*$/, '') + '...'
    : jobData.description;

  // Create a more intelligent key outcome extraction
  const keyOutcome = extractKeyOutcome(jobData.description, jobData.title);

  // Enhanced personalization with fallbacks
  let customizedProposal = template
    .replace(/\[Client First Name or "there"\]/g, 'there')
    .replace(/\[Client\]/g, 'there')
    .replace(/\[Company Name\]/g, jobData.company || 'your organization')
    .replace(/\[Job Title\]/g, jobData.title)
    .replace(/\[Key Outcome or Problem — 3–7 words\]/g, keyOutcome);

  // Add application requirements if detected
  if (jobData.applicationRequirements && jobData.applicationRequirements.specificRequests) {
    customizedProposal = addApplicationRequirements(customizedProposal, jobData.applicationRequirements);
  }

  customizedProposal += `\n\n📊 Project Details:\n` +
    `• Job: ${jobData.title}\n` +
    `• Experience Level: ${jobData.experience}\n` +
    `• Budget Range: $${jobData.budgetLow} - $${jobData.budgetHigh}\n` +
    `• Description: ${descriptionSummary}\n`;

  return customizedProposal;
}

function extractKeyOutcome(description, title) {
  // Simple keyword extraction for better context
  const keywords = [
    'develop', 'build', 'create', 'design', 'implement', 'fix', 'optimize', 
    'integrate', 'migrate', 'modernize', 'automate', 'scale'
  ];
  
  const lowerDesc = description.toLowerCase();
  const lowerTitle = title.toLowerCase();
  
  for (const keyword of keywords) {
    if (lowerTitle.includes(keyword) || lowerDesc.includes(keyword)) {
      return `${keyword} ${title.split(' ').slice(0, 4).join(' ')}`.slice(0, 50);
    }
  }
  
  // Fallback to first few words of title
  return title.split(' ').slice(0, 5).join(' ');
}

function addApplicationRequirements(proposal, requirements) {
  let enhancedProposal = proposal;
  
  // Safety check for requirements object
  if (!requirements || typeof requirements !== 'object') {
    return enhancedProposal;
  }
  
  // Add secret words at the top if detected
  if (requirements.secretWords && requirements.secretWords.length > 0) {
    const secretWordSection = `\n🔑 **${requirements.secretWords.join(', ')}**\n\n`;
    enhancedProposal = secretWordSection + enhancedProposal;
  }
  
  // Add structured application section if requirements detected
  if (requirements.hasStructuredApplication || (requirements.specificRequests && requirements.specificRequests.length > 0)) {
    let applicationSection = '\n\n📋 **Application Requirements Addressed:**\n';
    
    if (requirements.portfolioRequests.length > 0) {
      applicationSection += `• ✅ Portfolio/Work Examples: I'll provide links to relevant React Native apps and AR/3D work\n`;
    }
    
    if (requirements.technicalQuestions.length > 0) {
      applicationSection += `• ✅ Technical Approach: I'll detail my implementation strategy for your specific requirements\n`;
    }
    
    if (requirements.specificRequests.length > 0) {
      requirements.specificRequests.forEach((request, index) => {
        applicationSection += `• ✅ Requirement ${index + 1}: ${request}\n`;
      });
    }
    
    enhancedProposal += applicationSection;
  }
  
  return enhancedProposal;
}

module.exports = { buildProposal };
