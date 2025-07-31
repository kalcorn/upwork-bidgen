const puppeteer = require('puppeteer');

async function scrapeJob(url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const jobData = await page.evaluate(() => {
    const titleEl = document.querySelector('h1');
    const title = titleEl ? titleEl.innerText : 'Untitled Job';
    const descEl = document.querySelector('[data-test="job-description-text"]');
    const description = descEl ? descEl.innerText : 'No description';
    const budgetEl = document.querySelector('[data-test="budget"]');
    const budgetText = budgetEl ? budgetEl.innerText : '';
    const expEl = document.querySelector('[data-test="experience-level"]');
    const experience = expEl ? expEl.innerText : 'Not specified';

    const [low, high] = budgetText.match(/\$?\d+/g) || [];
    return {
      title,
      description,
      experience,
      budgetLow: low || 'N/A',
      budgetHigh: high || 'N/A',
    };
  });

  await browser.close();
  return jobData;
}

module.exports = { scrapeJob };
