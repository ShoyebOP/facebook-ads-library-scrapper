# Codebase Structure

**Analysis Date:** 2026-06-29

## Directory Layout

```
facebook-ads-library-scrapper/
├── scraper.js              # Main scraper application (single file)
├── package.json            # Package manifest and dependencies
├── bun.lock               # Bun package manager lockfile
├── README.md              # Project documentation
├── LICENSE                # Apache 2.0 License
├── .gitignore             # Git ignore rules
├── example_page_code.html # Reference HTML for Facebook page structure
├── output/                # Scraped data output directory
│   └── *.json            # JSON files with profile URLs
├── node_modules/          # Dependencies (managed by bun)
└── .planning/             # Planning documentation
    └── codebase/         # Codebase analysis documents
```

## Directory Purposes

**Root:**
- Purpose: Contains all application code and configuration
- Contains: Single-file scraper, package manifests, documentation
- Key files: `scraper.js`, `package.json`, `bun.lock`

**output/:**
- Purpose: Stores scraped Facebook Ads Library profile URLs
- Contains: JSON files named `DD-MM-YYYY:HH:MM.query.json`
- Key files: `25-06-2026:02-53.সারা_বাংলাদেশে_ডেলিভারি.json`

**node_modules/:**
- Purpose: Installed package dependencies
- Contains: `cloakbrowser`, `playwright-core`, and transitive deps
- Key files: `cloakbrowser/` (stealth browser), `playwright-core/` (browser automation)

**.planning/:**
- Purpose: GSD planning and codebase analysis documents
- Contains: Architecture, conventions, concerns analysis
- Key files: `codebase/ARCHITECTURE.md`, `codebase/STRUCTURE.md`

## Key File Locations

**Entry Points:**
- `scraper.js`: Main CLI entry point (run via `bun scraper.js`)
- `package.json`: Package manifest with `start` script

**Configuration:**
- `package.json`: Dependencies and scripts
- `bun.lock`: Dependency versions
- `.gitignore`: Git ignore rules

**Core Logic:**
- `scraper.js:1-260`: Complete scraper implementation (single file)
  - `scraper.js:8-12`: Webhook callback endpoints
  - `scraper.js:16`: Facebook Ads Library base URL
  - `scraper.js:19-42`: CLI argument parsing
  - `scraper.js:60-76`: Profile URL extraction function
  - `scraper.js:87-94`: File save function
  - `scraper.js:97-115`: Webhook notification function
  - `scraper.js:118-238`: Main scraper function
  - `scraper.js:242-255`: Daemon mode implementation

**Testing:**
- No test files detected

## Naming Conventions

**Files:**
- Pattern: `camelCase.js` for JavaScript files
- Example: `scraper.js`
- Output files: `DD-MM-YYYY:HH:MM.{query}.json`

**Directories:**
- Pattern: `kebab-case` for directories
- Example: `facebook-ads-library-scrapper/`
- Output: `output/` (flat structure)

**Functions:**
- Pattern: `camelCase` for function names
- Examples: `extractProfileUrls`, `saveUrls`, `notifyWebhook`, `withTimeout`

**Variables:**
- Pattern: `camelCase` for variables
- Examples: `profileUrls`, `maxUrls`, `callbackName`, `outputFile`
- Constants: `UPPER_SNAKE_CASE` for constants
- Examples: `CALLBACKS`, `BASE_URL`, `DEFAULT_CALLBACK`

## Where to Add New Code

**New Feature:**
- Primary code: `scraper.js` (add functions)
- Configuration: `scraper.js:8-16` (add to `CALLBACKS` object)
- Tests: Create `*.test.js` files (currently none exist)

**New Scraper Type:**
- Implementation: Create new `scraper-{type}.js` file
- Package.json: Add new script entry
- Tests: Create `scraper-{type}.test.js`

**Utilities:**
- Shared helpers: Add to `scraper.js` or create `utils.js`
- Browser utilities: Extend `scraper.js` browser control section

**Configuration:**
- Environment variables: Add to CLI parser section
- Webhook endpoints: Add to `CALLBACKS` object
- Base URLs: Add to `BASE_URL` constant

## Special Directories

**output/:**
- Purpose: Scraped data storage
- Generated: Yes (created by scraper at runtime)
- Committed: No (gitignored)

**node_modules/:**
- Purpose: Package dependencies
- Generated: Yes (installed by bun)
- Committed: No (gitignored)

**.planning/:**
- Purpose: GSD planning documents
- Generated: Yes (created by analysis tools)
- Committed: Yes (for project documentation)

## File Size Analysis

**scraper.js (260 lines):**
- This is the complete application
- Single-file architecture with all logic
- Consider modularization for future expansion

**package.json (14 lines):**
- Minimal configuration
- Only 2 direct dependencies

**output/*.json (variable):**
- Contains arrays of Facebook profile URLs
- File size depends on number of scraped ads

---

*Structure analysis: 2026-06-29*
