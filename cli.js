#!/usr/bin/env node

const inquirer = require('inquirer').default || require('inquirer');
const { scrapeJob } = require('./scraper');
const { buildPrompt } = require('./generatePrompt');
const { runClaude } = require('./claudeRunner');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function runCommand(command, label) {
  console.log(`\n=== Output from ${label} ===`);
  const proc = exec(command);
  proc.stdout.on('data', data => process.stdout.write(data));
  proc.stderr.on('data', data => process.stderr.write(data));
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

  const prompt = buildPrompt(jobData, template);
  const fileName = `${jobData.title.replace(/\W+/g, '_')}.txt`;
  const outputFile = path.join(__dirname, 'output', fileName);
  fs.writeFileSync(outputFile, prompt);
  console.log(`\n✅ Prompt saved to: ${outputFile}`);

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
