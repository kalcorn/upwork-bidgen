// Template and proposal generation type definitions for personal use

export interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
}

export interface ProposalData {
  jobData: any; // Will be redefined later
  template: Template;
  customizations: ProposalCustomizations;
  generatedContent: string;
}

export interface ProposalCustomizations {
  clientName?: string;
  projectSpecifics?: string;
  personalExperience?: string;
  uniqueValue?: string;
  callToAction?: string;
  secretWords?: string[];
}

export interface ProposalGenerationOptions {
  enhanceWithAI: boolean;
  aiProvider: 'claude' | 'gemini';
  includeSecretWords: boolean;
  format: 'txt' | 'md' | 'json';
} 