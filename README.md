# UpWork Bid Generator

A comprehensive local CLI tool that generates high-converting, customized UpWork proposals using AI-powered template selection, manual data entry, and UpWork API integration.

## Origin Story

This project emerged from a ChatGPT 4.0 conversation focused on solving the challenge of rapidly applying to UpWork jobs while maintaining quality and personalization. The goal was to create a local, cost-effective solution that leverages AI assistance without incurring API charges.

## Key Features

- 🔍 **UpWork API Integration**: Automatically extracts job details, budget ranges, and experience requirements from UpWork URLs
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
- UpWork API credentials (optional, for API mode)

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

#### Setup API Credentials
```bash
# For Windows (use direct ts-node command)
npx ts-node src/cli/index.ts --setup

# For other platforms (npm script may work)
npm start -- --setup
```
This will guide you through setting up UpWork API credentials for automatic job data extraction.

#### Get Job Categories
```bash
# For Windows (recommended)
npx ts-node src/cli/index.ts --categories

# For other platforms (may work)
npm start -- --categories
```
Retrieves all available job categories and subcategories from UpWork API for use in advanced job searches.

#### Advanced Job Search
```bash
# For Windows (recommended)
npx ts-node src/cli/index.ts --search

# For other platforms (may work)
npm start -- --search
```
Searches for jobs using advanced API filters:
- Hourly jobs: $50+/hr
- Fixed price jobs: $150+
- Most recent first
- Returns first 50 results

#### Default Mode (Job Search)
```bash
# For Windows (recommended)
npx ts-node src/cli/index.ts

# For other platforms (may work)
npm run dev
```
When no arguments are provided, the system defaults to job search mode for easy testing.

## How It Works

### 1. Intelligent Job Analysis
- Extracts job title, description, budget range, and experience level via API or manual entry
- Uses UpWork API for reliable data extraction when credentials are available
- Falls back to manual data entry for maximum compatibility

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
├── src/                     # TypeScript source code
│   ├── cli/                 # CLI application
│   │   └── index.ts         # Main CLI entry point
│   ├── core/                # Core business logic
│   │   ├── UpWorkAPI.ts     # UpWork API integration
│   │   ├── CredentialsManager.ts # Secure credential management
│   │   └── ProjectAnalyzer.ts # Project analysis and scoring
│   ├── services/            # Business services
│   │   ├── BidCalculator.ts # Intelligent bid calculation
│   │   ├── TemplateClassifier.ts # AI-powered template selection
│   │   └── ProposalGenerator.ts # Proposal generation engine
│   ├── runners/             # AI runners and utilities
│   │   ├── ClaudeRunner.ts  # Claude CLI integration
│   │   ├── GeminiRunner.ts  # Gemini CLI integration
│   │   └── ManualEntry.ts   # Interactive data collection
│   ├── config/              # Configuration files
│   │   ├── index.ts         # Main configuration
│   │   └── data.ts          # Market data and rates
│   ├── types/               # TypeScript type definitions
│   │   ├── JobData.ts       # Job data interfaces
│   │   ├── Config.ts        # Configuration interfaces
│   │   ├── API.ts           # API-related interfaces
│   │   ├── Credentials.ts   # Credential management interfaces
│   │   ├── Templates.ts     # Template-related interfaces
│   │   ├── BidCalculation.ts # Bid calculation interfaces
│   │   └── index.ts         # Main type exports
│   └── utils/               # Utility functions
├── tests/                   # Comprehensive test suite
│   ├── unit/                # Unit tests for all services
│   ├── integration/         # Integration tests for API
│   └── fixtures/            # Test data and mocks

├── dist/                    # Compiled JavaScript output
├── templates/               # Proposal templates
└── output/                  # Generated proposals
├── templates/             # Complete template library (10 verticals)
├── output/               # Generated proposals and AI responses
├── ai/                  # AI guidance and configuration files
│   ├── MANDATES.md      # Critical rules for all AI systems
│   ├── WORKFLOWS.md     # Mandatory process checklists
│   ├── CLAUDE.md        # Claude-specific integration guide
│   └── GEMINI.md        # Gemini-specific integration guide
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

### TypeScript Development
```bash
npm run dev          # Run TypeScript CLI directly
npm run build        # Compile TypeScript to JavaScript
npm run build:watch  # Watch mode for development
npm run lint         # Type checking
```

### Testing
```bash
npm test             # Run all tests
npm run test:unit    # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:coverage # Generate coverage report
```

### Adding New Templates
1. Create new `.txt` file in `templates/`
2. Update `src/services/TemplateClassifier.ts` with keywords
3. Test with relevant job URLs

### Extending AI Integration
- Modify `src/runners/ClaudeRunner.ts` for custom Claude prompts
- Add new AI services via similar runner modules
- Integrate with different CLI tools or APIs

### TypeScript Benefits
- **Type Safety**: Full type checking prevents runtime errors
- **Better IDE Support**: IntelliSense, autocomplete, and refactoring
- **Maintainability**: Clear interfaces and contracts between components
- **Scalability**: Modular architecture for easy extension

## Troubleshooting

### Common Issues
- **API Failures**: UpWork API issues - check `src/core/UpWorkAPI.ts`
- **Claude Not Found**: Ensure `claude` command is in PATH
- **Template Not Found**: Verify template exists in `templates/` directory
- **Empty Proposals**: Check job URL format and network connectivity
- **TypeScript Errors**: Run `npm run lint` to check for type issues
- **Build Failures**: Ensure all dependencies are installed with `npm install`

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
- Enhanced API integration
- AI integration improvements
- Performance optimizations

## License

MIT - Use, modify, and distribute freely

---

*Built for professional freelancers who value speed, quality, and cost-effective AI assistance in their UpWork success.*