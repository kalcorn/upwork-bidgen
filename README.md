# UpWork Bid Generator

A CLI tool that scrapes UpWork job postings and generates customized proposals using AI templates.

## Features

- 🔍 **Web Scraping**: Automatically extracts job details from UpWork URLs
- 📝 **Template System**: Choose from industry-specific proposal templates
- 🤖 **Multi-AI Support**: Generate proposals with Claude, ChatGPT, or Gemini
- 🚀 **CLI Interface**: Simple command-line tool with interactive prompts

## Installation

```bash
npm install
```

## Usage

### Interactive Mode
```bash
npm start
```

### With URL Parameter
```bash
npm start -- --url=https://www.upwork.com/jobs/your-job-url
```

## How It Works

1. **Job Scraping**: Extracts job title, description, budget, and experience level from UpWork
2. **Template Selection**: Choose from available proposal templates:
   - AI/ML projects
   - Corporate/General
   - E-commerce
   - Fintech
   - Healthcare
   - Legacy system rescue
   - SaaS applications
   - Startup projects
   - VoIP/Telecom
   - Miscellaneous

3. **AI Integration**: 
   - **Claude**: Direct integration via Claude CLI
   - **ChatGPT/Gemini**: Opens proposal in text editor for manual copying

4. **Output**: Generated proposals are saved to the `output/` directory

## Project Structure

- `cli.js` - Main CLI interface
- `scraper.js` - UpWork job scraping logic
- `generatePrompt.js` - Template processing
- `claudeRunner.js` - Claude AI integration
- `templates/` - Proposal templates
- `output/` - Generated proposals

## Requirements

- Node.js
- Chrome/Chromium (for Puppeteer)
- Claude CLI (for Claude integration)

## Templates

Templates support placeholders that are automatically replaced:
- `[Client]` - Greeting
- `[Job Title]` - Extracted job title
- `[Key Outcome or Problem]` - Job description summary

## Development

```bash
npm run dev  # Run with nodemon for development
```

## License

MIT