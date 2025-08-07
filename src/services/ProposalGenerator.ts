// src/services/ProposalGenerator.ts - Generates UpWork proposals based on job data and templates
import fs from 'fs';
import path from 'path';
import { JobData } from '../core/UpWorkAPI';

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
    templateName?: string
  ): Promise<ProposalGenerationResult> {
    try {
      // Ensure output directory exists
      if (!fs.existsSync(this.outputDirectory)) {
        fs.mkdirSync(this.outputDirectory, { recursive: true });
      }

      // Determine template to use
      const selectedTemplate = templateName || this.selectTemplate(jobData);
      const templatePath = path.join(this.templatesDirectory, selectedTemplate);

      if (!fs.existsSync(templatePath)) {
        return {
          success: false,
          error: `Template file not found: ${templatePath}`
        };
      }

      // Load template content
      const templateContent = fs.readFileSync(templatePath, 'utf-8');

      // Generate proposal content by replacing placeholders
      const proposalContent = this.fillTemplate(templateContent, jobData);

      // Create output filename
      const safeJobTitle = this.sanitizeFilename(jobData.title || jobData.content?.title || 'Unknown_Job');
      const outputFilename = `${safeJobTitle}_proposal.txt`;
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
   * Select appropriate template based on job data
   */
  private selectTemplate(jobData: JobData): string {
    // Simple template selection logic
    const title = (jobData.title || jobData.content?.title || '').toLowerCase();
    const description = (jobData.description || jobData.content?.description || '').toLowerCase();
    const category = (jobData.category || jobData.classification?.category?.preferredLabel || '').toLowerCase();

    // E-commerce related
    if (title.includes('ecommerce') || title.includes('shopify') || title.includes('e-commerce') ||
        description.includes('ecommerce') || description.includes('shopify') || 
        category.includes('ecommerce')) {
      return 'ecommerce.txt';
    }

    // Mobile development
    if (title.includes('mobile') || title.includes('app') || title.includes('ios') || title.includes('android') ||
        description.includes('mobile') || description.includes('react native') || description.includes('flutter')) {
      return 'mobile-development.txt';
    }

    // AI/ML related
    if (title.includes('ai') || title.includes('ml') || title.includes('machine learning') || title.includes('artificial intelligence') ||
        description.includes('ai') || description.includes('machine learning') || description.includes('neural')) {
      return 'ai-ml.txt';
    }

    // DevOps/Infrastructure
    if (title.includes('devops') || title.includes('aws') || title.includes('docker') || title.includes('kubernetes') ||
        description.includes('devops') || description.includes('infrastructure') || description.includes('deployment')) {
      return 'devops-infrastructure.txt';
    }

    // FinTech
    if (title.includes('fintech') || title.includes('financial') || title.includes('payment') || title.includes('banking') ||
        description.includes('fintech') || description.includes('payment') || description.includes('financial')) {
      return 'fintech.txt';
    }

    // SaaS
    if (title.includes('saas') || title.includes('software as a service') ||
        description.includes('saas') || description.includes('subscription')) {
      return 'saas.txt';
    }

    // Healthcare
    if (title.includes('health') || title.includes('medical') || title.includes('healthcare') ||
        description.includes('health') || description.includes('medical') || description.includes('hipaa')) {
      return 'healthcare.txt';
    }

    // VoIP/Telecom
    if (title.includes('voip') || title.includes('telecom') || title.includes('pbx') || title.includes('telephony') ||
        description.includes('voip') || description.includes('telecom') || description.includes('sip')) {
      return 'voip-telecom.txt';
    }

    // Legacy/Rescue projects
    if (title.includes('legacy') || title.includes('rescue') || title.includes('fix') || title.includes('debug') ||
        description.includes('legacy') || description.includes('broken') || description.includes('fix')) {
      return 'legacy-rescue.txt';
    }

    // Startup
    if (title.includes('startup') || title.includes('mvp') || description.includes('startup') || description.includes('mvp')) {
      return 'startup-general.txt';
    }

    // Default to corporate general
    return 'corporate-general.txt';
  }

  /**
   * Fill template with job data
   */
  private fillTemplate(template: string, jobData: JobData): string {
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

    // From classification
    if (jobData.classification?.skills) {
      jobData.classification.skills.forEach(skill => {
        if (skill.preferredLabel) {
          skills.push(skill.preferredLabel);
        }
      });
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