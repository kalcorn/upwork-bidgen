# UpWork Bid Generator

A comprehensive local CLI tool that scrapes UpWork job postings and generates high-converting, customized proposals using AI-powered template selection and enhancement.

## Origin Story

This project emerged from a ChatGPT 4.0 conversation focused on solving the challenge of rapidly applying to UpWork jobs while maintaining quality and personalization. The goal was to create a local, cost-effective solution that leverages AI assistance without incurring API charges.

## Key Features

- 🔍 **Intelligent Web Scraping**: Automatically extracts job details, budget ranges, and experience requirements from UpWork URLs
- 🧠 **AI-Powered Template Recommendation**: Smart template selection based on job content analysis
- 📝 **Comprehensive Template Library**: 10 industry-specific, conversion-optimized proposal templates
- 🤖 **Multi-AI Support**: Primary Claude CLI integration with ChatGPT/Gemini fallbacks
- 💰 **Bid Rate Intelligence**: Automatic bid recommendations based on job requirements and market positioning
- 🚀 **Zero-API-Cost Architecture**: Uses Claude CLI and manual AI workflows to avoid billing
- ⚡ **Professional Developer UX**: Clean CLI interface with intelligent prompts and error handling

## Quick Start

### Prerequisites
- Node.js 16+ installed
- Claude CLI installed and accessible via `claude` command
- Chrome/Chromium browser (for Puppeteer scraping)

### Installation
```bash
git clone <repository-url>
cd upwork-bidgen
npm install
```

### Basic Usage

#### Interactive Mode (Recommended)
```bash
npm start
```
The tool will prompt you for a UpWork job URL and guide you through the process.

#### Direct URL Mode
```bash
npm start -- --url="https://www.upwork.com/jobs/your-job-url"
```

## How It Works

### 1. Intelligent Job Analysis
- Scrapes job title, description, budget range, and experience level
- Uses multiple selector strategies for robust data extraction
- Handles dynamic JavaScript-rendered UpWork pages

### 2. AI-Powered Template Selection
- Analyzes job content using keyword matching and context analysis
- Recommends the most appropriate template from 10 specialized options
- Allows manual override while showing AI recommendation

### 3. Smart Proposal Generation
- Fills template placeholders with extracted job data
- Generates contextual insights and key outcome summaries
- Adds project metadata and bid rate suggestions

### 4. AI Enhancement Options
- **Claude CLI**: Automatically enhances proposals with natural, persuasive language
- **ChatGPT/Gemini**: Manual workflow via text editor for additional AI perspectives
- Maintains your professional voice while improving conversion potential

### 5. Professional Output
- Saves customized proposals to `output/` directory
- Includes job metadata and bid recommendations
- Ready for immediate UpWork submission

## Complete Template Library

Our comprehensive template system covers all major UpWork verticals:

| Template | Use Case | Key Strengths |
|----------|----------|---------------|
| `ai-ml.txt` | LLMs, vector databases, AI/ML systems | Technical depth, modern AI knowledge |
| `corporate-general.txt` | Enterprise clients, B2B systems | Professional authority, compliance focus |
| `ecommerce.txt` | Shopify, Stripe, online stores | Conversion optimization, payment expertise |
| `fintech.txt` | Banking, trading, financial systems | Regulatory knowledge, security emphasis |
| `healthcare.txt` | HIPAA, EMR, patient systems | Compliance expertise, security focus |
| `legacy-rescue.txt` | Modernization, technical debt | Problem-solving, risk mitigation |
| `saas.txt` | Multi-tenant, subscription systems | Scalability, user experience |
| `startup-general.txt` | MVPs, lean development | Speed, flexibility, cost-consciousness |
| `voip-telecom.txt` | Twilio, SIP, real-time comms | Telecom expertise, API integration |
| `misc.txt` | Catch-all fallback | Adaptable, general-purpose |

### Template Intelligence
- **Smart Placeholders**: `[Client]`, `[Job Title]`, `[Key Outcome or Problem]`
- **Dynamic Content**: Job-specific insights and technical approaches
- **Conversion Optimization**: Each template designed for maximum response rates
- **Professional Voice**: Maintains consistent, authoritative tone across verticals

## Architecture & Files

```
upwork-bidgen/
├── cli.js                   # Main CLI entry point with interactive prompts
├── scraper.js              # Robust UpWork job scraping with fallback selectors
├── generatePrompt.js       # Intelligent template processing and customization
├── claudeRunner.js         # Claude CLI integration with enhancement prompts
├── templateClassifier.js   # AI-powered template recommendation engine
├── config.js              # Configuration placeholder
├── templates/             # Complete template library (10 verticals)
├── output/               # Generated proposals and AI responses
├── CLAUDE.md            # Comprehensive Claude integration guide
└── package.json         # Project dependencies and scripts
```

## Advanced Usage

### Template Customization
```bash
# Edit templates directly
notepad templates/fintech.txt

# Use Claude to enhance templates
claude < "Enhance this UpWork proposal template for fintech clients..."
```

### Batch Processing
```bash
# Process multiple jobs
for url in job1 job2 job3; do
  npm start -- --url="$url"
done
```

### Claude Integration Workflow
1. **Base Generation**: System creates customized proposal
2. **AI Enhancement**: Claude refines language and adds insights  
3. **Human Review**: Final approval and UpWork submission

## Development & Customization

### Development Mode
```bash
npm run dev  # Auto-reload with nodemon
```

### Adding New Templates
1. Create new `.txt` file in `templates/`
2. Add keywords to `templateClassifier.js`
3. Test with relevant job URLs

### Extending AI Integration
- Modify `claudeRunner.js` for custom Claude prompts
- Add new AI services via similar runner modules
- Integrate with different CLI tools or APIs

## Troubleshooting

### Common Issues
- **Scraping Failures**: UpWork changed selectors - check `scraper.js`
- **Claude Not Found**: Ensure `claude` command is in PATH
- **Template Not Found**: Verify template exists in `templates/` directory
- **Empty Proposals**: Check job URL format and network connectivity

### Performance Tips
- Use `--url` parameter to skip interactive prompts
- Keep templates under 500 words for optimal Claude processing
- Regular template updates based on conversion tracking

## Success Metrics

Track these KPIs to optimize your proposal success:
- **Response Rate**: % of proposals receiving client responses
- **Conversion Rate**: % of responses becoming paid projects  
- **Time Efficiency**: Average minutes per high-quality proposal
- **Revenue Impact**: Increased project acquisition vs manual proposals

## Contributing

This project evolved from real freelancer needs and continues to improve based on user feedback. Areas for contribution:
- Additional vertical templates
- Enhanced scraping resilience
- AI integration improvements
- Performance optimizations

## License

MIT - Use, modify, and distribute freely

---

*Built for professional freelancers who value speed, quality, and cost-effective AI assistance in their UpWork success.*