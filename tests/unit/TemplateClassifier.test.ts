// tests/unit/TemplateClassifier.test.ts
import { TemplateClassifier } from '../../src/services/TemplateClassifier';
import { Template } from '../../src/types/Templates';
import { ProjectType } from '../../src/types/JobData';

describe('TemplateClassifier', () => {
  let classifier: TemplateClassifier;

  beforeEach(() => {
    // Create a mock classifier with test templates
    classifier = new TemplateClassifier('./templates');
  });

  describe('recommendTemplate', () => {
    it('should recommend a template for generic projects', () => {
      const description = 'Need help with a simple website';
      const result = classifier.recommendTemplate(description);
      expect(result).toMatch(/\.txt$/);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('classifyJob', () => {
    it('should return classification result with primary and alternative templates', () => {
      const description = 'Fintech startup needs trading platform with real-time data';
      const result = classifier.classifyJob(description);

      expect(result).toHaveProperty('primaryTemplate');
      expect(result).toHaveProperty('alternatives');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');

      expect(result.primaryTemplate).toHaveProperty('template');
      expect(result.primaryTemplate).toHaveProperty('score');
      expect(result.primaryTemplate).toHaveProperty('reasons');
      expect(result.primaryTemplate).toHaveProperty('confidence');
    });

    it('should have confidence between 0 and 1', () => {
      const description = 'Healthcare application with HIPAA compliance';
      const result = classifier.classifyJob(description);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('getTemplates', () => {
    it('should return array of available templates', () => {
      const templates = classifier.getTemplates();
      
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      // Check template structure
      const template = templates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('content');
      expect(template).toHaveProperty('category');
      expect(template).toHaveProperty('tags');
      expect(template).toHaveProperty('priority');
      expect(template).toHaveProperty('isActive');
      expect(template).toHaveProperty('metadata');
    });

    it('should only return active templates', () => {
      const templates = classifier.getTemplates();
      const activeTemplates = templates.filter(t => t.isActive);
      expect(templates.length).toBe(activeTemplates.length);
    });
  });

  describe('getTemplate', () => {
    it('should return template by ID', () => {
      const template = classifier.getTemplate('misc.txt');
      
      if (template) {
        expect(template.id).toBe('misc.txt');
        expect(template.isActive).toBe(true);
      }
    });

    it('should return undefined for non-existent template', () => {
      const template = classifier.getTemplate('non-existent.txt');
      expect(template).toBeUndefined();
    });
  });

  describe('updateUsage', () => {
    it('should increment usage count for template', () => {
      const templateId = 'misc.txt';
      const template = classifier.getTemplate(templateId);
      
      if (template) {
        const initialCount = template.metadata.usageCount;
        classifier.updateUsage(templateId);
        
        const updatedTemplate = classifier.getTemplate(templateId);
        expect(updatedTemplate?.metadata.usageCount).toBe(initialCount + 1);
      }
    });
  });

  describe('evaluateTemplate', () => {
    it('should return evaluation criteria for template', () => {
      const template: Template = {
        id: 'test.txt',
        name: 'Test Template',
        content: 'This is a test template with specific metrics like 95% success rate and $50K projects.',
        category: 'misc' as ProjectType,
        tags: ['test', 'example'],
        priority: 1.0,
        isActive: true,
        metadata: {
          created: new Date(),
          updated: new Date(),
          version: '1.0',
          author: 'Test',
          usageCount: 0
        }
      };

      const evaluation = classifier.evaluateTemplate(template);

      expect(evaluation).toHaveProperty('relevance');
      expect(evaluation).toHaveProperty('specificity');
      expect(evaluation).toHaveProperty('persuasiveness');
      expect(evaluation).toHaveProperty('professionalism');
      expect(evaluation).toHaveProperty('uniqueness');
      expect(evaluation).toHaveProperty('overall');

      // All scores should be between 0 and 1
      expect(evaluation.relevance).toBeGreaterThanOrEqual(0);
      expect(evaluation.relevance).toBeLessThanOrEqual(1);
      expect(evaluation.specificity).toBeGreaterThanOrEqual(0);
      expect(evaluation.specificity).toBeLessThanOrEqual(1);
      expect(evaluation.persuasiveness).toBeGreaterThanOrEqual(0);
      expect(evaluation.persuasiveness).toBeLessThanOrEqual(1);
      expect(evaluation.professionalism).toBeGreaterThanOrEqual(0);
      expect(evaluation.professionalism).toBeLessThanOrEqual(1);
      expect(evaluation.uniqueness).toBeGreaterThanOrEqual(0);
      expect(evaluation.uniqueness).toBeLessThanOrEqual(1);
    });
  });
}); 