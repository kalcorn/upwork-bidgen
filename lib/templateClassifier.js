const fs = require('fs');
const path = require('path');
const data = require('../data');

// Enhanced keyword-based matching with weighted scoring

function recommendTemplate(description) {
  const lowerDesc = description.toLowerCase();
  let bestMatch = 'misc.txt';
  let maxHits = 0;

  for (const [template, keywords] of Object.entries(data.verticals.keywords)) {
    const hits = keywords.reduce((acc, word) => lowerDesc.includes(word) ? acc + 1 : acc, 0);
    if (hits > maxHits) {
      bestMatch = template;
      maxHits = hits;
    }
  }

  return bestMatch;
}

module.exports = { recommendTemplate };
