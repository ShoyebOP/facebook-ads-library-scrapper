import { launch } from 'cloakbrowser';
import fs from 'fs';

// --- Base URL — only the `q` parameter changes via CLI arg ---
const BASE_URL = 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BD&is_targeted_country=false&media_type=all&publisher_platforms[0]=facebook&q={query}&search_type=keyword_unordered&sort_data[mode]=total_impressions&sort_data[direction]=desc';

// --- Parse CLI args ---
const args = process.argv.slice(2);
const query = args.find(a => !a.startsWith('--'));
const headless = args.includes('--headless');
const proxyIdx = args.indexOf('--proxy');
const proxy = proxyIdx !== -1 ? args[proxyIdx + 1] : undefined;
const maxUrlsIdx = args.indexOf('--max-urls');
const maxUrls = maxUrlsIdx !== -1 ? parseInt(args[maxUrlsIdx + 1], 10) : Infinity;

if (!query) {
  console.error('Usage: bun scraper.js "<search query>" [--headless] [--proxy "http://..."] [--max-urls N]');
  process.exit(1);
}

const url = BASE_URL.replace('{query}', encodeURIComponent(query));

// --- Generate output path: output/DD-MM-YYYY:HH:MM.query.json ---
function pad(n) {
  return String(n).padStart(2, '0');
}

const now = new Date();
const outputDir = 'output';
const outputFile = `${outputDir}/${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}:${pad(now.getHours())}-${pad(now.getMinutes())}.${query}.json`;

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// --- Extract page_profile_uri from nested GraphQL response ---
function extractProfileUrls(obj, urls) {
  if (!obj || typeof obj !== 'object') return;

  if (obj.page_profile_uri) {
    urls.add(obj.page_profile_uri);
  }

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
  console.log(`Query: ${query}`);
  console.log(`Max URLs: ${maxUrls === Infinity ? 'unlimited' : maxUrls}`);
  console.log(`Output file: ${outputFile}`);
  console.log(`Launching Cloak browser...\n`);

  const launchOpts = {
    headless,
    humanize: true,
    human_preset: 'careful',
    stealth_args: true,
    locale: 'en-US',
    timezone: 'Asia/Dhaka',
  };
  if (proxy) launchOpts.proxy = proxy;

  const browser = await launch(launchOpts);
  const page = await browser.newPage();
  const profileUrls = new Set();

  // Block heavy assets — we only need GraphQL JSON responses
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
      return route.abort();
    }
    return route.continue();
  });

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

  console.log(`Navigating to Ads Library...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('Page loaded. Scrolling to load more ads...\n');

  // Auto-scroll loop
  const MAX_NO_NEW_SCROLLS = 10;
  let noNewUrlsCount = 0;

  while (noNewUrlsCount < MAX_NO_NEW_SCROLLS && profileUrls.size < maxUrls) {
    const before = profileUrls.size;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2500);

    // Remove already-processed ad cards above the viewport to free memory
    await page.evaluate(() => {
      const rows = document.querySelectorAll('[role="row"]');
      const viewportTop = window.scrollY;
      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if (rect.bottom < viewportTop - 500) {
          row.remove();
        }
      }
    });

    if (profileUrls.size === before) {
      noNewUrlsCount++;
    } else {
      noNewUrlsCount = 0;
      console.log(`${profileUrls.size} unique profile URLs found...`);
    }
  }

  if (profileUrls.size >= maxUrls) {
    console.log(`\nReached max URLs limit (${maxUrls}).`);
  } else {
    console.log('\nNo more new ads loading.');
  }

  saveUrls(profileUrls);
  await browser.close();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
