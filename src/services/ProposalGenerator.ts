// src/services/ProposalGenerator.ts - Proposal generation and customization service
import fs from 'fs';
import path from 'path';
import { JobData } from '../types/JobData';

export interface ProposalGenerationOptions {
  includeProjectDetails?: boolean;
  includeApplicationRequirements?: boolean;
  maxDescriptionLength?: number;
}

export interface ProposalGenerationResult {
  success: boolean;
  proposal?: string;
  error?: string;
  metadata?: {
    templateUsed: string;
    customizationCount: number;
    processingTime: number;
  };
}

export class ProposalGenerator {
  private options: Required<ProposalGenerationOptions>;

  constructor(options: ProposalGenerationOptions = {}) {
    this.options = {
      includeProjectDetails: options.includeProjectDetails ?? true,
      includeApplicationRequirements: options.includeApplicationRequirements ?? true,
      maxDescriptionLength: options.maxDescriptionLength ?? 100
    };
  }

  /**
   * Build a customized proposal from template and job data
   */
  buildProposal(jobData: JobData, templateName: string): ProposalGenerationResult {
    const startTime = Date.now();
    
    try {
      const templatePath = path.join(process.cwd(), 'templates', templateName);
      
      if (!fs.existsSync(templatePath)) {
        return {
          success: false,
          error: `Template file not found: ${templateName}`
        };
      }

      const template = fs.readFileSync(templatePath, 'utf-8');

      // Extract a more meaningful description summary
      const descriptionSummary = this.extractDescriptionSummary(jobData.description);

      // Create a more intelligent key outcome extraction
      const keyOutcome = this.extractKeyOutcome(jobData.description, jobData.title);

      // Enhanced personalization with fallbacks
      let customizedProposal = template
        .replace(/\[Client First Name or "there"\]/g, 'there')
        .replace(/\[Client\]/g, 'there')
        .replace(/\[Company Name\]/g, jobData.company || 'your organization')
        .replace(/\[Job Title\]/g, jobData.title)
        .replace(/\[Key Outcome or Problem — 3–7 words\]/g, keyOutcome);

      // Add application requirements if detected
      if (this.options.includeApplicationRequirements && jobData.applicationRequirements && jobData.applicationRequirements.specificRequests) {
        customizedProposal = this.addApplicationRequirements(customizedProposal, jobData.applicationRequirements);
      }

      // Add project details if enabled
      if (this.options.includeProjectDetails) {
        customizedProposal += this.generateProjectDetails(jobData, descriptionSummary);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        proposal: customizedProposal,
        metadata: {
          templateUsed: templateName,
          customizationCount: this.countCustomizations(template, customizedProposal),
          processingTime
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Proposal generation failed: ${errorMessage}`
      };
    }
  }

  /**
   * Extract a meaningful description summary
   */
  private extractDescriptionSummary(description: string): string {
    if (description.length > this.options.maxDescriptionLength) {
      return description.slice(0, this.options.maxDescriptionLength).replace(/\s+\S*$/, '') + '...';
    }
    return description;
  }

  /**
   * Extract key outcome from job description and title
   */
  private extractKeyOutcome(description: string, title: string): string {
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

  /**
   * Add application requirements to the proposal
   */
  private addApplicationRequirements(proposal: string, requirements: JobData['applicationRequirements']): string {
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

  /**
   * Generate project details section
   */
  private generateProjectDetails(jobData: JobData, descriptionSummary: string): string {
    const budgetLow = jobData.budget.low || 'N/A';
    const budgetHigh = jobData.budget.high || 'N/A';
    
    return `\n\n📊 Project Details:\n` +
      `• Job: ${jobData.title}\n` +
      `• Experience Level: ${jobData.experience}\n` +
      `• Budget Range: $${budgetLow} - $${budgetHigh}\n` +
      `• Description: ${descriptionSummary}\n`;
  }

  /**
   * Count the number of customizations made to the template
   */
  private countCustomizations(originalTemplate: string, customizedProposal: string): number {
    const originalLength = originalTemplate.length;
    const customizedLength = customizedProposal.length;
    const placeholderCount = (originalTemplate.match(/\[.*?\]/g) || []).length;
    
    return Math.max(placeholderCount, Math.abs(customizedLength - originalLength) / 100);
  }

  /**
   * Validate template file exists
   */
  validateTemplate(templateName: string): boolean {
    const templatePath = path.join(process.cwd(), 'templates', templateName);
    return fs.existsSync(templatePath);
  }

  /**
   * Get list of available templates
   */
  getAvailableTemplates(): string[] {
    const templatesDir = path.join(process.cwd(), 'templates');
    
    if (!fs.existsSync(templatesDir)) {
      return [];
    }

    try {
      const files = fs.readdirSync(templatesDir);
      return files.filter(file => file.endsWith('.txt'));
    } catch (error) {
      return [];
    }
  }
}

// Export a default instance
export const proposalGenerator = new ProposalGenerator(); 