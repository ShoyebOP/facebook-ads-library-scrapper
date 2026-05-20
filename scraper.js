import { launch } from 'cloakbrowser';
import fs from 'fs';

// --- Parse CLI args ---
const args = process.argv.slice(2);
const url = args.find(a => !a.startsWith('--'));
const headless = args.includes('--headless');
const proxyIdx = args.indexOf('--proxy');
const proxy = proxyIdx !== -1 ? args[proxyIdx + 1] : undefined;

if (!url) {
  console.error('Usage: bun scraper.js "<facebook ads library URL>" [--headless] [--proxy "http://..."]');
  process.exit(1);
}

// --- Generate output filename: DD-MM-YYYY:HH:MM_profiles_url.json ---
function pad(n) {
  return String(n).padStart(2, '0');
}

const now = new Date();
const outputFile = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}:${pad(now.getHours())}-${pad(now.getMinutes())}_profiles_url.json`;

// --- Extract page_profile_uri from nested GraphQL response ---
function extractProfileUrls(obj, urls) {
  if (!obj || typeof obj !== 'object') return;

  // Check if this object has page_profile_uri
  if (obj.page_profile_uri) {
    urls.add(obj.page_profile_uri);
  }

  // Recurse into arrays and objects
  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractProfileUrls(item, urls);
    }
  } else {
    for (const key of Object.keys(obj)) {
      extractProfileUrls(obj[key], urls);
    }
  }
}

// --- Save URLs to JSON file ---
function saveUrls(urls) {
  const data = [...urls];
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
  console.log(`\nSaved ${data.length} unique profile URLs to ${outputFile}`);
}

// --- Main ---
async function main() {
  console.log(`Output file: ${outputFile}`);
  console.log(`Launching Cloak browser...`);

  const launchOpts = { headless };
  if (proxy) launchOpts.proxy = proxy;

  const browser = await launch(launchOpts);
  const page = await browser.newPage();
  const profileUrls = new Set();

  // Intercept network responses
  page.on('response', async (response) => {
    try {
      if (response.status() === 200 && response.url().includes('graphql')) {
        const json = await response.json();
        extractProfileUrls(json, profileUrls);
      }
    } catch (e) {
      // Non-JSON responses, skip
    }
  });

  // Graceful shutdown on Ctrl+C
  let shuttingDown = false;
  process.on('SIGINT', async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\nStopping...');
    saveUrls(profileUrls);
    await browser.close();
    process.exit(0);
  });

  console.log(`Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('Page loaded. Scrolling to load more ads...\n');

  // Auto-scroll loop
  const MAX_NO_NEW_SCROLLS = 10;
  let noNewUrlsCount = 0;

  while (noNewUrlsCount < MAX_NO_NEW_SCROLLS) {
    const before = profileUrls.size;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2500);

    if (profileUrls.size === before) {
      noNewUrlsCount++;
    } else {
      noNewUrlsCount = 0;
      console.log(`Found ${profileUrls.size} unique profile URLs...`);
    }
  }

  console.log('\nNo more new ads loading.');
  saveUrls(profileUrls);
  await browser.close();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
