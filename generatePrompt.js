const fs = require('fs');
const path = require('path');

function buildPrompt(jobData, templateName) {
  const templatePath = path.join(__dirname, 'templates', templateName);
  const template = fs.readFileSync(templatePath, 'utf-8');

  return template
    .replace('[Client]', 'there')
    .replace('[Job Title]', jobData.title)
    .replace('[Key Outcome or Problem — 3–7 words]', jobData.description.slice(0, 80) + '...')
    + `\n\nExperience: ${jobData.experience}\nBudget Range: $${jobData.budgetLow} - $${jobData.budgetHigh}\n`;
}

module.exports = { buildPrompt };
