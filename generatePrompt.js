const fs = require('fs');
const path = require('path');

function buildProposal(jobData, templateName) {
  const templatePath = path.join(__dirname, 'templates', templateName);
  const template = fs.readFileSync(templatePath, 'utf-8');

  // Extract a more meaningful description summary
  const descriptionSummary = jobData.description.length > 100 
    ? jobData.description.slice(0, 100).replace(/\s+\S*$/, '') + '...'
    : jobData.description;

  // Create a more intelligent key outcome extraction
  const keyOutcome = extractKeyOutcome(jobData.description, jobData.title);

  // Enhanced personalization with fallbacks
  const customizedProposal = template
    .replace(/\[Client First Name or "there"\]/g, 'there')
    .replace(/\[Client\]/g, 'there')
    .replace(/\[Company Name\]/g, jobData.company || 'your organization')
    .replace(/\[Job Title\]/g, jobData.title)
    .replace(/\[Key Outcome or Problem — 3–7 words\]/g, keyOutcome)
    + `\n\n📊 Project Details:\n` +
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

module.exports = { buildProposal };
