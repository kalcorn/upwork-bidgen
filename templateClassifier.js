const fs = require('fs');
const path = require('path');

// Simple keyword-based matching
const templateKeywords = {
  'fintech.txt': ['finance', 'financial', 'fintech', 'trading', 'bank', 'investment', 'wall street'],
  'healthcare.txt': ['health', 'hipaa', 'ehr', 'emr', 'pharma', 'patient', 'medical'],
  'legacy-rescue.txt': ['refactor', 'legacy', 'modernize', 'technical debt', 'rewrite', 'update old'],
  'corporate-general.txt': ['enterprise', 'corporate', 'formal', 'reporting', 'compliance', 'b2b'],
  'startup-general.txt': ['startup', 'mvp', 'lean', 'founder', 'early-stage', 'bootstrap'],
  'voip-telecom.txt': ['twilio', 'sip', 'mms', 'sms', 'voip', 'telnyx', 'asterisk', 'phone'],
  'ecommerce.txt': ['ecommerce', 'shopify', 'stripe', 'cart', 'checkout', 'promo', 'sku'],
  'ai-ml.txt': ['ai', 'ml', 'llm', 'gpt', 'claude', 'gemini', 'vector', 'prompt', 'openai', 'embedding'],
  'saas.txt': ['saas', 'multi-tenant', 'dashboard', 'admin', 'subscription', 'stripe', 'portal'],
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
