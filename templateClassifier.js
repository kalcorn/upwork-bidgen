const fs = require('fs');
const path = require('path');

// Enhanced keyword-based matching with weighted scoring
const templateKeywords = {
  'fintech.txt': ['finance', 'financial', 'fintech', 'trading', 'bank', 'investment', 'wall street', 'sox', 'finra', 'pci', 'compliance', 'audit', 'regulatory'],
  'healthcare.txt': ['health', 'hipaa', 'ehr', 'emr', 'pharma', 'patient', 'medical', 'clinical', 'fhir', 'hl7', 'telehealth', 'fda'],
  'legacy-rescue.txt': ['refactor', 'legacy', 'modernize', 'technical debt', 'rewrite', 'update old', 'migrate', 'upgrade', 'monolith', 'outdated'],
  'corporate-general.txt': ['enterprise', 'corporate', 'formal', 'reporting', 'compliance', 'b2b', 'scalable', 'integration', 'governance'],
  'startup-general.txt': ['startup', 'mvp', 'lean', 'founder', 'early-stage', 'bootstrap', 'agile', 'rapid', 'prototype'],
  'voip-telecom.txt': ['twilio', 'sip', 'mms', 'sms', 'voip', 'telnyx', 'asterisk', 'phone', 'call', 'voice', 'telephony', 'carrier'],
  'ecommerce.txt': ['ecommerce', 'shopify', 'stripe', 'cart', 'checkout', 'promo', 'sku', 'payment', 'inventory', 'storefront', 'woocommerce'],
  'ai-ml.txt': ['ai', 'ml', 'llm', 'gpt', 'claude', 'gemini', 'vector', 'prompt', 'openai', 'embedding', 'chatbot', 'nlp', 'machine learning'],
  'saas.txt': ['saas', 'multi-tenant', 'dashboard', 'admin', 'subscription', 'stripe', 'portal', 'tenant', 'billing', 'metrics'],
  'mobile-development.txt': ['mobile', 'ios', 'android', 'app', 'swift', 'kotlin', 'react native', 'flutter', 'app store', 'play store'],
  'devops-infrastructure.txt': ['devops', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'infrastructure', 'cloud', 'deployment'],
  'misc.txt': [] // fallback
};

function recommendTemplate(description) {
  const lowerDesc = description.toLowerCase();
  let bestMatch = 'misc.txt';
  let maxHits = 0;

  for (const [template, keywords] of Object.entries(templateKeywords)) {
    const hits = keywords.reduce((acc, word) => lowerDesc.includes(word) ? acc + 1 : acc, 0);
    if (hits > maxHits) {
      bestMatch = template;
      maxHits = hits;
    }
  }

  return bestMatch;
}

module.exports = { recommendTemplate };
