// src/services/TemplateClassifier.ts - Simple template selection for personal use
import fs from 'fs';
import path from 'path';
import { ProjectType as JobProjectType } from '../types/JobData';

interface Template {
  id: string;
  name: string;
  content: string;
  category: JobProjectType;
}

export class TemplateClassifier {
  private templates: Map<string, Template> = new Map();
  private readonly templatesDirectory: string;

  constructor(templatesDirectory: string = './templates') {
    this.templatesDirectory = templatesDirectory;
    this.loadTemplates();
  }

  /**
   * Load all templates from the templates directory
   */
  private loadTemplates(): void {
    try {
      const files = fs.readdirSync(this.templatesDirectory);
      
      for (const file of files) {
        if (file.endsWith('.txt')) {
          const templatePath = path.join(this.templatesDirectory, file);
          const content = fs.readFileSync(templatePath, 'utf-8');
          
          const template: Template = {
            id: file,
            name: this.getTemplateName(file),
            content,
            category: this.getTemplateCategory(file)
          };
          
          this.templates.set(file, template);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not load templates from ${this.templatesDirectory}:`, error);
    }
  }

  /**
   * Get template name from filename
   */
  private getTemplateName(filename: string): string {
    return filename
      .replace('.txt', '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get template category from filename
   */
  private getTemplateCategory(filename: string): JobProjectType {
    const categoryMap: Record<string, JobProjectType> = {
      'fintech.txt': 'fintech',
      'healthcare.txt': 'healthcare',
      'devops-infrastructure.txt': 'devops-infrastructure',
      'ai-ml.txt': 'ai-ml',
      'legacy-rescue.txt': 'legacy-rescue',
      'corporate-general.txt': 'corporate-general',
      'saas.txt': 'saas',
      'mobile-development.txt': 'mobile-development',
      'ecommerce.txt': 'ecommerce',
      'voip-telecom.txt': 'voip-telecom',
      'startup-general.txt': 'startup-general',
      'misc.txt': 'misc'
    };
    
    return categoryMap[filename] || 'misc';
  }

  /**
   * Recommend template based on job description
   */
  public recommendTemplate(description: string): string {
    const matches = this.classifyJob(description);
    return matches.primary.id;
  }

  /**
   * Classify job and return template matches
   */
  public classifyJob(description: string): { primary: Template; alternatives: Template[] } {
    const lowerDescription = description.toLowerCase();
    const scores: Array<{ template: Template; score: number }> = [];

    // Score templates based on keyword matches
    for (const template of this.templates.values()) {
      let score = 0;
      
      // Category-based scoring
      switch (template.category) {
        case 'fintech':
          if (lowerDescription.includes('fintech') || lowerDescription.includes('financial') || 
              lowerDescription.includes('banking') || lowerDescription.includes('payment')) {
            score += 10;
          }
          break;
        case 'healthcare':
          if (lowerDescription.includes('healthcare') || lowerDescription.includes('medical') || 
              lowerDescription.includes('hipaa') || lowerDescription.includes('patient')) {
            score += 10;
          }
          break;
        case 'ai-ml':
          if (lowerDescription.includes('ai') || lowerDescription.includes('machine learning') || 
              lowerDescription.includes('artificial intelligence') || lowerDescription.includes('ml')) {
            score += 10;
          }
          break;
        case 'devops-infrastructure':
          if (lowerDescription.includes('devops') || lowerDescription.includes('infrastructure') || 
              lowerDescription.includes('aws') || lowerDescription.includes('deployment')) {
            score += 10;
          }
          break;
        case 'legacy-rescue':
          if (lowerDescription.includes('legacy') || lowerDescription.includes('maintenance') || 
              lowerDescription.includes('refactor') || lowerDescription.includes('upgrade')) {
            score += 10;
          }
          break;
        case 'startup-general':
          if (lowerDescription.includes('startup') || lowerDescription.includes('mvp') || 
              lowerDescription.includes('prototype') || lowerDescription.includes('funding')) {
            score += 8;
          }
          break;
        case 'saas':
          if (lowerDescription.includes('saas') || lowerDescription.includes('subscription') || 
              lowerDescription.includes('platform') || lowerDescription.includes('web app')) {
            score += 8;
          }
          break;
        case 'mobile-development':
          if (lowerDescription.includes('mobile') || lowerDescription.includes('ios') || 
              lowerDescription.includes('android') || lowerDescription.includes('app')) {
            score += 8;
          }
          break;
        case 'ecommerce':
          if (lowerDescription.includes('ecommerce') || lowerDescription.includes('shop') || 
              lowerDescription.includes('cart') || lowerDescription.includes('payment')) {
            score += 6;
          }
          break;
        case 'voip-telecom':
          if (lowerDescription.includes('voip') || lowerDescription.includes('telecom') || 
              lowerDescription.includes('phone') || lowerDescription.includes('communication')) {
            score += 6;
          }
          break;
        default:
          score += 2; // Base score for misc/corporate-general
      }

      scores.push({ template, score });
    }

    // Sort by score and return results
    scores.sort((a, b) => b.score - a.score);
    
    return {
      primary: scores[0]?.template || this.getFallbackTemplate(),
      alternatives: scores.slice(1, 4).map(s => s.template)
    };
  }

  /**
   * Get fallback template
   */
  private getFallbackTemplate(): Template {
    const fallback = this.templates.get('corporate-general.txt') || 
                    this.templates.get('misc.txt') ||
                    Array.from(this.templates.values())[0];
    
    if (!fallback) {
      throw new Error('No templates available');
    }
    
    return fallback;
  }

  /**
   * Get all templates
   */
  public getTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get specific template
   */
  public getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }
} 