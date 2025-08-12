// src/services/ProposalGenerator.ts - Generates UpWork proposals based on job data and templates
import fs from 'fs';
import path from 'path';
import { JobData } from '../core/UpWorkAPI';
import { AIGenerator } from '../types/AIGenerator';

export interface ProposalGenerationResult {
  success: boolean;
  proposalContent?: string;
  templateUsed?: string;
  outputPath?: string;
  error?: string;
}

export class ProposalGenerator {
  private templatesDirectory: string;
  private outputDirectory: string;

  constructor(
    templatesDirectory: string = './templates',
    outputDirectory: string = './output'
  ) {
    this.templatesDirectory = templatesDirectory;
    this.outputDirectory = outputDirectory;
  }

  /**
   * Get list of available templates
   */
  getAvailableTemplates(): string[] {
    try {
      if (!fs.existsSync(this.templatesDirectory)) {
        return [];
      }
      
      return fs.readdirSync(this.templatesDirectory)
        .filter(file => file.endsWith('.txt'))
        .sort();
    } catch (error) {
      return [];
    }
  }

  /**
   * Get recommended template for job data with human-readable name
   */
  getRecommendedTemplate(jobData: JobData): { filename: string; displayName: string } {
    const filename = this.selectTemplate(jobData);
    const displayName = this.getTemplateDisplayName(filename);
    return { filename, displayName };
  }

  /**
   * Convert template filename to human-readable display name
   */
  getTemplateDisplayName(filename: string): string {
    const nameMap: Record<string, string> = {
      'primary-general.txt': 'Primary Template',
      'ecommerce.txt': 'E-commerce Development',
      'mobile-development.txt': 'Mobile App Development', 
      'ai-ml.txt': 'AI/Machine Learning',
      'devops-infrastructure.txt': 'DevOps & Infrastructure',
      'fintech.txt': 'FinTech & Financial Services',
      'saas.txt': 'SaaS Development',
      'healthcare.txt': 'Healthcare & Medical',
      'voip-telecom.txt': 'VoIP & Telecommunications',
      'legacy-rescue.txt': 'Legacy System Rescue',
      'startup-general.txt': 'Startup & MVP',
      'corporate-general.txt': 'Corporate General'
    };
    
    return nameMap[filename] || filename.replace('.txt', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Generate a proposal for the given job
   */
  async generateProposal(
    jobData: JobData,
    templateName: string, // Make templateName required as it will be passed from cli
    aiRunner: AIGenerator | null // Allow null // Add aiRunner parameter
  ): Promise<ProposalGenerationResult> {
    try {
      // Ensure output directory exists
      if (!fs.existsSync(this.outputDirectory)) {
        fs.mkdirSync(this.outputDirectory, { recursive: true });
      }

      // Determine template to use
      const selectedTemplate = templateName; // templateName is now required
      const templatePath = path.join(this.templatesDirectory, selectedTemplate);

      if (!fs.existsSync(templatePath)) {
        return {
          success: false,
          error: `Template file not found: ${templatePath}`
        };
      }

      // Load template content
      const templateContent = fs.readFileSync(templatePath, 'utf-8');

      // Extract and generate screening answers
      const screeningQuestions = this.extractScreeningQuestions(jobData);
      let screeningAnswers: Array<{question: string, answer: string}> = [];

      if (screeningQuestions.length > 0 && aiRunner) { // Add check for aiRunner
        console.log(`Found ${screeningQuestions.length} screening questions - generating answers...`);
        const answerResult = await aiRunner.generateScreeningAnswers(jobData, screeningQuestions);
        if (answerResult.success && answerResult.answers) {
          screeningAnswers = answerResult.answers;
        } else {
          console.warn(`Failed to generate screening answers: ${answerResult.error || 'Unknown error'}`);
        }
      }

      // Generate proposal content by replacing placeholders
      const proposalContent = this.fillTemplate(templateContent, jobData, screeningAnswers);

      // Create output filename with timestamp and job ID
      const now = new Date();
      const timestamp = now.getFullYear() + 
        String(now.getMonth() + 1).padStart(2, '0') + 
        String(now.getDate()).padStart(2, '0') + '-' + 
        String(now.getHours()).padStart(2, '0') + 
        String(now.getMinutes()).padStart(2, '0') + 
        String(now.getSeconds()).padStart(2, '0');
      const jobId = jobData.id || 'unknown';
      const safeJobTitle = this.sanitizeFilename(jobData.title || jobData.content?.title || 'Unknown_Job');
      const outputFilename = `${timestamp}-${jobId}-${safeJobTitle}.txt`;
      const outputPath = path.join(this.outputDirectory, outputFilename);

      // Write proposal to file
      fs.writeFileSync(outputPath, proposalContent, 'utf-8');

      return {
        success: true,
        proposalContent,
        templateUsed: selectedTemplate,
        outputPath
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Select appropriate template based on job data using weighted scoring system
   */
  private selectTemplate(jobData: JobData): string {
    const title = (jobData.title || jobData.content?.title || '').toLowerCase();
    const description = (jobData.description || jobData.content?.description || '').toLowerCase();
    const category = (jobData.classification?.category?.preferredLabel || '').toLowerCase();
    const budget = this.getBudgetAmount(jobData);

    // Initialize scores for each specialized template
    const scores = {
      ecommerce: 0,
      mobile: 0,
      devops: 0,
      legacy: 0,
      healthcare: 0,
      fintech: 0,
      startup: 0,
      voip: 0
    };

    // STRONG OVERRIDE INDICATORS (4+ points each)
    
    // E-commerce specialized
    if (title.includes('shopify app') || title.includes('shopify plus') || 
        description.includes('shopify app development')) {
      scores.ecommerce += 4;
    }
    if (title.includes('woocommerce plugin') || title.includes('magento extension') ||
        description.includes('woocommerce plugin') || description.includes('magento extension')) {
      scores.ecommerce += 4;
    }
    if ((title.includes('payment gateway') || description.includes('payment gateway')) &&
        (description.includes('stripe') || description.includes('paypal'))) {
      scores.ecommerce += 4;
    }
    if (category.includes('e-commerce') || category.includes('ecommerce')) {
      scores.ecommerce += 4;
    }

    // Mobile native required
    if (title.includes('ios app store') || title.includes('google play store') ||
        description.includes('app store') || description.includes('play store')) {
      scores.mobile += 4;
    }
    if ((title.includes('swift') && title.includes('objective-c')) ||
        (title.includes('kotlin') && title.includes('java android')) ||
        (description.includes('swift') && description.includes('objective-c')) ||
        (description.includes('kotlin') && description.includes('java android'))) {
      scores.mobile += 4;
    }
    if ((title.includes('react native') || description.includes('react native')) &&
        (title.includes('mobile app') || description.includes('mobile app'))) {
      scores.mobile += 4;
    }
    if (title.includes('xcode') || title.includes('android studio') ||
        description.includes('xcode') || description.includes('android studio')) {
      scores.mobile += 4;
    }

    // DevOps infrastructure heavy
    if (title.includes('kubernetes cluster') || title.includes('docker swarm') || title.includes('terraform') ||
        description.includes('kubernetes cluster') || description.includes('docker swarm') || description.includes('terraform')) {
      scores.devops += 4;
    }
    if (((title.includes('aws') || title.includes('azure') || title.includes('gcp')) && 
         title.includes('infrastructure')) ||
        ((description.includes('aws') || description.includes('azure') || description.includes('gcp')) && 
         description.includes('deployment pipeline'))) {
      scores.devops += 4;
    }
    if ((title.includes('ci/cd') || description.includes('ci/cd')) &&
        (description.includes('jenkins') || description.includes('github actions') || description.includes('gitlab ci'))) {
      scores.devops += 4;
    }
    if (budget > 5000 && (description.includes('scalability') || description.includes('high availability'))) {
      scores.devops += 4;
    }

    // Legacy rescue projects
    if ((title.includes('legacy codebase') || description.includes('legacy codebase')) &&
        (description.includes('technical debt') || description.includes('modernization'))) {
      scores.legacy += 4;
    }
    if (title.includes('urgent fix') || title.includes('production down') || title.includes('critical bug') ||
        description.includes('urgent fix') || description.includes('production down') || description.includes('critical bug')) {
      scores.legacy += 4;
    }
    if ((title.includes('inherited project') || description.includes('inherited project')) &&
        description.includes('no documentation')) {
      scores.legacy += 4;
    }

    // MEDIUM INDICATORS (2 points)
    
    // Healthcare
    if (title.includes('hipaa compliance') || description.includes('hipaa compliance')) {
      scores.healthcare += 2;
    }

    // FinTech
    if ((title.includes('fintech') || description.includes('fintech')) &&
        (description.includes('regulatory compliance') || description.includes('financial compliance'))) {
      scores.fintech += 2;
    }

    // Startup
    if ((title.includes('startup mvp') || description.includes('startup mvp')) &&
        (description.includes('tight timeline') || description.includes('quick turnaround'))) {
      scores.startup += 2;
    }

    // VoIP/Telecom
    if ((title.includes('voip') || title.includes('pbx')) &&
        (title.includes('telecommunications') || description.includes('telecommunications'))) {
      scores.voip += 2;
    }

    // Find the highest scoring template
    const maxScore = Math.max(...Object.values(scores));
    const bestTemplate = Object.entries(scores).find(([, score]) => score === maxScore);

    // Only use specialized template if:
    // 1. Score is 4 or higher (strong evidence)
    // 2. Score is at least 2 points higher than second-best (clear winner)
    if (maxScore >= 4) {
      const sortedScores = Object.values(scores).sort((a, b) => b - a);
      const secondBest = sortedScores[1] || 0;
      
      if (maxScore >= secondBest + 2) {
        const templateMap: Record<string, string> = {
          ecommerce: 'ecommerce.txt',
          mobile: 'mobile-development.txt',
          devops: 'devops-infrastructure.txt',
          legacy: 'legacy-rescue.txt',
          healthcare: 'healthcare.txt',
          fintech: 'fintech.txt',
          startup: 'startup-general.txt',
          voip: 'voip-telecom.txt'
        };
        
        if (bestTemplate) {
          const templateFile = templateMap[bestTemplate[0]];
          if (templateFile) {
            return templateFile;
          }
        }
      }
    }

    // Default to preferred primary template
    return 'primary-general.txt';
  }

  /**
   * Extract budget amount for scoring logic
   */
  private getBudgetAmount(jobData: JobData): number {
    if (jobData.amount?.rawValue) {
      return parseFloat(jobData.amount.rawValue) || 0;
    }
    if (jobData.hourlyBudgetMin?.rawValue && jobData.hourlyBudgetMax?.rawValue) {
      const min = parseFloat(jobData.hourlyBudgetMin.rawValue) || 0;
      const max = parseFloat(jobData.hourlyBudgetMax.rawValue) || 0;
      return (min + max) / 2 * 40 * 4; // Estimate monthly budget
    }
    return 0;
  }

  /**
   * Fill template with job data and optionally append screening questions
   */
  private fillTemplate(
    template: string, 
    jobData: JobData, 
    screeningAnswers?: Array<{question: string, answer: string}>
  ): string {
    let filled = template;

    // Basic replacements
    const title = jobData.title || jobData.content?.title || 'this project';
    const description = jobData.description || jobData.content?.description || '';
    
    // Extract key information
    const budget = this.formatBudget(jobData);
    const skills = this.extractSkills(jobData);
    const clientLocation = jobData.client?.location?.country || 'your location';

    // Perform replacements
    filled = filled.replace(/\[Job Title\]/g, title);
    filled = filled.replace(/\[Client\]/g, 'there'); // Generic greeting
    filled = filled.replace(/\[Budget\]/g, budget);
    filled = filled.replace(/\[Skills\]/g, skills);
    filled = filled.replace(/\[Client Location\]/g, clientLocation);
    filled = filled.replace(/\[Key Outcome or Problem — 3–7 words\]/g, this.extractKeyProblem(title, description));

    // Append screening questions section if answers provided
    if (screeningAnswers && screeningAnswers.length > 0) {
      filled += '\n\n## Screening Questions\n\n';
      screeningAnswers.forEach((qa, index) => {
        filled += `**Q${index + 1}: ${qa.question}**\n`;
        filled += `**A:** ${qa.answer}\n\n`;
      });
    }

    return filled;
  }

  /**
   * Format budget information
   */
  private formatBudget(jobData: JobData): string {
    if (jobData.amount?.displayValue && jobData.amount.displayValue !== '0.0') {
      return `$${jobData.amount.displayValue}`;
    }
    
    if (jobData.hourlyBudgetMin?.displayValue || jobData.hourlyBudgetMax?.displayValue) {
      const min = jobData.hourlyBudgetMin?.displayValue || '?';
      const max = jobData.hourlyBudgetMax?.displayValue || '?';
      return `$${min}-${max}/hr`;
    }

    return 'your budget';
  }

  /**
   * Extract skills from job data
   */
  private extractSkills(jobData: JobData): string {
    const skills: string[] = [];

    // From classification (skills are now string arrays)
    if (jobData.classification?.skills && Array.isArray(jobData.classification.skills)) {
      skills.push(...jobData.classification.skills);
    }

    // Include additional skills as well
    if (jobData.classification?.additionalSkills && Array.isArray(jobData.classification.additionalSkills)) {
      skills.push(...jobData.classification.additionalSkills);
    }

    return skills.length > 0 ? skills.slice(0, 5).join(', ') : 'the required technologies';
  }

  /**
   * Extract key problem/outcome from title and description
   */
  private extractKeyProblem(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();

    if (text.includes('build') || text.includes('develop') || text.includes('create')) {
      return 'build your solution';
    }
    if (text.includes('fix') || text.includes('debug') || text.includes('repair')) {
      return 'fix the issues';
    }
    if (text.includes('optimize') || text.includes('improve') || text.includes('enhance')) {
      return 'optimize performance';
    }
    if (text.includes('migrate') || text.includes('upgrade') || text.includes('modernize')) {
      return 'modernize your system';
    }
    if (text.includes('integrate') || text.includes('connect')) {
      return 'integrate systems';
    }

    return 'deliver results';
  }

  /**
   * Extract screening questions from job data
   */
  private extractScreeningQuestions(jobData: JobData): Array<{id?: string, question?: string, required?: boolean}> {
    const questions = jobData.contractorSelection?.proposalRequirement?.screeningQuestions;
    if (!questions || !Array.isArray(questions)) {
      return [];
    }

    return questions
      .filter(q => q.question && q.question.trim()) // Only include questions with actual text
      .map(q => {
        const extracted: {id?: string, question?: string, required?: boolean} = {};
        if (q.id !== undefined) {
          extracted.id = q.id;
        }
        if (q.question !== undefined) {
          extracted.question = q.question;
        }
        if (q.required !== undefined) {
          extracted.required = q.required;
        }
        return extracted;
      });
  }

  /**
   * Sanitize filename for cross-platform compatibility
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .substring(0, 50); // Limit length
  }
}