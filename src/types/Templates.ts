// Template and proposal generation type definitions for personal use
import { ProjectType } from './JobData';

export interface Template {
  id: string;
  name: string;
  content: string;
  category: ProjectType;
}

import { JobData } from './JobData';

export interface ProposalData {
  jobData: JobData;
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