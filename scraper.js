const puppeteer = require('puppeteer');

async function scrapeJob(url) {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Better compatibility
  });
  
  const page = await browser.newPage();
  
  // Set user agent to avoid bot detection
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  try {
    await page.goto(url, { 
      waitUntil: 'networkidle2', // Wait for network to be idle
      timeout: 30000 
    });

    // Wait for content to load
    await page.waitForTimeout(2000);

    const jobData = await page.evaluate(() => {
      // Multiple selector strategies for robustness
      const titleSelectors = [
        'h1[data-test="job-title"]', 
        'h1', 
        '[data-test="job-title"]',
        '.job-tile-title',
        '.job-details-title'
      ];
      
      const descriptionSelectors = [
        '[data-test="job-description-text"]',
        '[data-test="job-description"]',
        '.job-description',
        '.description',
        'div[data-test*="description"] p'
      ];
      
      const budgetSelectors = [
        '[data-test="budget"]',
        '[data-test="job-budget"]', 
        '.budget',
        '.job-budget',
        'span[data-test*="budget"]'
      ];
      
      const experienceSelectors = [
        '[data-test="experience-level"]',
        '[data-test="job-experience-level"]',
        '.experience-level',
        'span[data-test*="experience"]'
      ];

      function findBySelectors(selectors) {
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el && el.innerText?.trim()) {
            return el.innerText.trim();
          }
        }
        return null;
      }

      const title = findBySelectors(titleSelectors) || 'Untitled Job';
      const description = findBySelectors(descriptionSelectors) || 'No description available';
      const budgetText = findBySelectors(budgetSelectors) || '';
      const experience = findBySelectors(experienceSelectors) || 'Not specified';

      // More robust budget parsing
      const budgetMatches = budgetText.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
      const numbers = budgetMatches.map(match => match.replace(/[$,]/g, ''));
      
      return {
        title,
        description,
        experience,
        budgetLow: numbers[0] || 'N/A',
        budgetHigh: numbers[1] || numbers[0] || 'N/A',
        budgetText, // Keep original for debugging
        url: window.location.href // Include URL in response
      };
    });

    await browser.close();
    return jobData;
    
  } catch (error) {
    await browser.close();
    console.error('Scraping error:', error.message);
    
    // Return fallback data
    return {
      title: 'Error: Could not scrape job title',
      description: 'Error: Could not scrape job description. Please check the URL and try again.',
      experience: 'Not specified',
      budgetLow: 'N/A',
      budgetHigh: 'N/A',
      budgetText: '',
      url,
      error: error.message
    };
  }
}

module.exports = { scrapeJob };
