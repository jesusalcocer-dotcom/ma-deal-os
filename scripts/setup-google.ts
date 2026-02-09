#!/usr/bin/env npx tsx
/**
 * Phase 1.1 — Automated Google Cloud Setup
 *
 * Automates everything that CAN be automated via gcloud CLI:
 *   - Install gcloud (via Homebrew if missing)
 *   - Create GCP project
 *   - Enable Gmail, Drive, and Pub/Sub APIs
 *   - Authenticate gcloud
 *   - Install and authenticate gog (Gmail OAuth CLI)
 *   - Create Pub/Sub topic + subscription
 *   - Grant Gmail API publish rights on topic
 *
 * Opens browser ONLY for steps that require manual UI interaction:
 *   - gcloud auth login (user clicks Allow — 1 click)
 *   - gog auth login (user clicks Allow — 1 click)
 *   - OAuth consent screen configuration (3 clicks)
 *   - Add test user (2 clicks)
 *   - Create OAuth client ID + download JSON (3 clicks)
 *
 * Usage: npx tsx scripts/setup-google.ts [--project my-project-id] [--account user@gmail.com]
 */

import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const ROOT = path.resolve(__dirname, '..');
const ENV_LOCAL = path.join(ROOT, 'apps/web/.env.local');
const CONFIG_DIR = path.join(ROOT, 'config');

// Parse CLI arguments
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

const PROJECT_ID = getArg('project') || 'ma-deal-os';
const ACCOUNT = getArg('account');
const TOPIC_NAME = 'deal-os-gmail-watch';
const SUBSCRIPTION_NAME = 'deal-os-gmail-push';

// ─── Utilities ───────────────────────────────────────────────

function log(msg: string) {
  console.log(`\n  ✓ ${msg}`);
}

function step(msg: string) {
  console.log(`\n━━━ ${msg} ━━━`);
}

function warn(msg: string) {
  console.log(`\n  ⚠ ${msg}`);
}

function fail(msg: string): never {
  console.error(`\n  ✗ ${msg}`);
  process.exit(1);
}

function hasBin(name: string): boolean {
  try {
    execSync(`which ${name}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function run(cmd: string, opts?: { silent?: boolean; allowFail?: boolean }): string {
  try {
    const result = execSync(cmd, {
      encoding: 'utf-8',
      stdio: opts?.silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CLOUDSDK_CORE_DISABLE_PROMPTS: '1' },
    });
    return result.trim();
  } catch (e: any) {
    if (opts?.allowFail) return '';
    throw e;
  }
}

function runInteractive(cmd: string): number {
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env },
  });
  return result.status ?? 1;
}

function openBrowser(url: string) {
  if (process.platform === 'darwin') {
    execSync(`open "${url}"`);
  } else if (process.platform === 'linux') {
    execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
  } else {
    console.log(`  Open this URL in your browser: ${url}`);
  }
}

async function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`\n  → ${prompt} (press Enter when done) `, () => {
      rl.close();
      resolve();
    });
  });
}

async function askInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`\n  → ${prompt}: `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─── Ensure gcloud SDK installed ────────────────────────────

function ensureGcloud() {
  // Check common Homebrew paths
  const candidates = [
    '/opt/homebrew/share/google-cloud-sdk/bin',
    '/usr/local/share/google-cloud-sdk/bin',
    '/opt/homebrew/Caskroom/google-cloud-sdk/latest/google-cloud-sdk/bin',
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'gcloud'))) {
      process.env.PATH = `${dir}:${process.env.PATH}`;
      break;
    }
  }

  if (hasBin('gcloud')) {
    log('gcloud CLI already installed');
    return;
  }

  step('Installing gcloud CLI via Homebrew');
  if (!hasBin('brew')) {
    fail('Homebrew not installed. Install from https://brew.sh then re-run.');
  }
  const code = runInteractive('brew install --cask google-cloud-sdk');
  if (code !== 0) fail('Failed to install gcloud CLI');

  // Add to PATH
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'gcloud'))) {
      process.env.PATH = `${dir}:${process.env.PATH}`;
      break;
    }
  }
  if (!hasBin('gcloud')) fail('gcloud still not on PATH after install');
  log('gcloud CLI installed');
}

// ─── Ensure gog CLI installed ──────────────────────────────

function ensureGog() {
  if (hasBin('gog')) {
    log('gog CLI already installed');
    return;
  }

  step('Installing gog CLI (Gmail OAuth CLI) via Homebrew');
  if (!hasBin('brew')) {
    fail('Homebrew not installed. Install from https://brew.sh then re-run.');
  }
  const code = runInteractive('brew install gogcli');
  if (code !== 0) fail('Failed to install gog CLI');
  if (!hasBin('gog')) fail('gog still not on PATH after install');
  log('gog CLI installed');
}

// ─── Authenticate gcloud ────────────────────────────────────

async function authenticateGcloud() {
  step('Authenticating gcloud');
  const activeAccount = run('gcloud auth list --filter=status:ACTIVE --format="value(account)"', { silent: true, allowFail: true });
  if (activeAccount) {
    log(`Already authenticated as: ${activeAccount}`);
    return;
  }

  console.log('\n  A browser window will open for Google Cloud authentication.');
  console.log('  Sign in with your Google account and click "Allow".');
  const code = runInteractive('gcloud auth login');
  if (code !== 0) fail('gcloud auth login failed');
  log('gcloud authenticated');
}

// ─── Create or select GCP project ───────────────────────────

async function ensureProject() {
  step(`Setting up GCP project: ${PROJECT_ID}`);

  // Check if project exists
  const exists = run(`gcloud projects describe ${PROJECT_ID} --format="value(projectId)"`, { silent: true, allowFail: true });
  if (exists) {
    log(`Project "${PROJECT_ID}" already exists`);
  } else {
    console.log(`\n  Creating project "${PROJECT_ID}"...`);
    try {
      run(`gcloud projects create ${PROJECT_ID} --name="M&A Deal OS"`, { silent: true });
      log(`Project "${PROJECT_ID}" created`);
    } catch (e: any) {
      if (e.stderr?.includes('already exists') || e.message?.includes('already exists')) {
        log(`Project "${PROJECT_ID}" already exists`);
      } else {
        fail(`Failed to create project: ${e.message || e}`);
      }
    }
  }

  run(`gcloud config set project ${PROJECT_ID}`, { silent: true });
  log(`Active project set to: ${PROJECT_ID}`);
}

// ─── Enable APIs ────────────────────────────────────────────

function enableApis() {
  step('Enabling Google APIs');
  const apis = [
    'gmail.googleapis.com',
    'drive.googleapis.com',
    'pubsub.googleapis.com',
  ];

  for (const api of apis) {
    console.log(`  Enabling ${api}...`);
    run(`gcloud services enable ${api} --project ${PROJECT_ID} --quiet`, { silent: true });
  }
  log('All APIs enabled: Gmail, Drive, Pub/Sub');
}

// ─── OAuth Consent Screen (manual) ──────────────────────────

async function configureOAuthConsent() {
  step('Configure OAuth Consent Screen (browser required)');

  const url = `https://console.cloud.google.com/apis/credentials/consent?project=${PROJECT_ID}`;
  console.log(`
  The OAuth consent screen CANNOT be configured via CLI.
  A browser will open to the Google Cloud Console.

  DO THESE STEPS:
    1. Select "External" user type → click "Create"
    2. Fill in:
       - App name: "M&A Deal OS"
       - User support email: (your email)
       - Developer contact email: (your email)
    3. Click "Save and Continue"
    4. On "Scopes" page → click "Save and Continue" (skip scopes)
    5. On "Test users" page → click "Add Users"
       - Enter your Gmail address
       - Click "Save"
    6. Click "Save and Continue" → "Back to Dashboard"
  `);

  openBrowser(url);
  await waitForEnter('Complete the consent screen setup in the browser');
  log('OAuth consent screen configured');
}

// ─── Create OAuth Client ID (manual) ────────────────────────

async function createOAuthClient() {
  step('Create OAuth Client ID (browser required)');

  const url = `https://console.cloud.google.com/apis/credentials/oauthclient?project=${PROJECT_ID}`;
  console.log(`
  OAuth client credentials CANNOT be created via CLI or API.
  A browser will open to the Google Cloud Console.

  DO THESE STEPS:
    1. Application type: select "Desktop app"
    2. Name: "M&A Deal OS CLI"
    3. Click "Create"
    4. Click "Download JSON" on the confirmation dialog
    5. Save the JSON file to: ${CONFIG_DIR}/google-oauth-client.json
  `);

  // Ensure config dir exists
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  openBrowser(url);
  await waitForEnter('Download the JSON file and save it to config/google-oauth-client.json');

  // Verify the file was downloaded
  const clientJsonPath = path.join(CONFIG_DIR, 'google-oauth-client.json');
  if (!fs.existsSync(clientJsonPath)) {
    // Check common download locations
    const downloads = [
      path.join(process.env.HOME || '', 'Downloads'),
    ];
    for (const dir of downloads) {
      const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
      const match = files.find(f => f.startsWith('client_secret_') && f.endsWith('.json'));
      if (match) {
        const src = path.join(dir, match);
        fs.copyFileSync(src, clientJsonPath);
        log(`Found and copied ${match} → config/google-oauth-client.json`);
        return;
      }
    }

    warn('Could not find the downloaded JSON file automatically.');
    const manualPath = await askInput('Enter the full path to the downloaded JSON file');
    if (manualPath && fs.existsSync(manualPath)) {
      fs.copyFileSync(manualPath, clientJsonPath);
      log(`Copied ${manualPath} → config/google-oauth-client.json`);
    } else {
      fail('OAuth client JSON file not found. Re-run setup after downloading.');
    }
  } else {
    log('OAuth client JSON found at config/google-oauth-client.json');
  }
}

// ─── Authenticate gog CLI ───────────────────────────────────

async function authenticateGog() {
  step('Authenticating gog CLI (Gmail OAuth)');

  const clientJsonPath = path.join(CONFIG_DIR, 'google-oauth-client.json');
  if (!fs.existsSync(clientJsonPath)) {
    fail('config/google-oauth-client.json not found. Run the OAuth client setup step first.');
  }

  // Copy to gog's expected location
  const gogConfigDir = path.join(process.env.HOME || '', '.config', 'gogcli');
  if (!fs.existsSync(gogConfigDir)) {
    fs.mkdirSync(gogConfigDir, { recursive: true });
  }
  const gogCredPath = path.join(gogConfigDir, 'credentials.json');
  fs.copyFileSync(clientJsonPath, gogCredPath);
  log(`OAuth client JSON copied to ${gogCredPath}`);

  console.log('\n  A browser window will open for Gmail OAuth.');
  console.log('  Sign in with your Google account and click "Allow".');
  console.log('  (You may see a "This app isn\'t verified" warning — click "Advanced" → "Go to M&A Deal OS CLI")');

  const code = runInteractive('gog auth login');
  if (code !== 0) {
    warn('gog auth login returned non-zero. This may be OK if auth was already completed.');
  }
  log('gog CLI authenticated');
}

// ─── Set up Pub/Sub ─────────────────────────────────────────

function setupPubSub() {
  step('Setting up Pub/Sub for Gmail Watch');

  // Create topic
  const topicExists = run(
    `gcloud pubsub topics describe ${TOPIC_NAME} --project ${PROJECT_ID} --format="value(name)"`,
    { silent: true, allowFail: true }
  );
  if (topicExists) {
    log(`Topic "${TOPIC_NAME}" already exists`);
  } else {
    run(`gcloud pubsub topics create ${TOPIC_NAME} --project ${PROJECT_ID}`, { silent: true });
    log(`Topic "${TOPIC_NAME}" created`);
  }

  // Grant Gmail API permission to publish
  run(
    `gcloud pubsub topics add-iam-policy-binding ${TOPIC_NAME} ` +
    `--project ${PROJECT_ID} ` +
    `--member serviceAccount:gmail-api-push@system.gserviceaccount.com ` +
    `--role roles/pubsub.publisher --quiet`,
    { silent: true }
  );
  log('Gmail API granted publish permission on topic');
}

// ─── Write environment variables ────────────────────────────

function writeEnvVars() {
  step('Updating environment variables');

  const envPath = ENV_LOCAL;
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  const updates: Record<string, string> = {
    GOOGLE_CLOUD_PROJECT_ID: PROJECT_ID,
    GMAIL_PUBSUB_TOPIC: `projects/${PROJECT_ID}/topics/${TOPIC_NAME}`,
    GMAIL_PUBSUB_SUBSCRIPTION: SUBSCRIPTION_NAME,
    GOOGLE_OAUTH_CLIENT_JSON_PATH: './config/google-oauth-client.json',
  };

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, envContent.trimStart());

  // Also write to root .env.local if it exists
  const rootEnv = path.join(ROOT, '.env.local');
  if (fs.existsSync(rootEnv)) {
    let rootContent = fs.readFileSync(rootEnv, 'utf-8');
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(rootContent)) {
        rootContent = rootContent.replace(regex, `${key}=${value}`);
      } else {
        rootContent += `\n${key}=${value}`;
      }
    }
    fs.writeFileSync(rootEnv, rootContent.trimStart());
  }

  log('Environment variables updated');
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║          M&A Deal OS — Google Cloud Setup            ║
╠══════════════════════════════════════════════════════╣
║  This script automates Google Cloud configuration.   ║
║  You will need to:                                   ║
║    • Click "Allow" twice (gcloud + gog auth)         ║
║    • Configure OAuth consent screen (3 clicks)       ║
║    • Add test user (2 clicks)                        ║
║    • Create OAuth client + download JSON (3 clicks)  ║
╚══════════════════════════════════════════════════════╝
`);

  // Step 1: Install dependencies
  ensureGcloud();
  ensureGog();

  // Step 2: Authenticate gcloud (opens browser - user clicks Allow)
  await authenticateGcloud();

  // Step 3: Create/select GCP project
  await ensureProject();

  // Step 4: Enable APIs
  enableApis();

  // Step 5: Configure OAuth consent screen (opens browser - manual)
  await configureOAuthConsent();

  // Step 6: Create OAuth client credentials (opens browser - manual)
  await createOAuthClient();

  // Step 7: Authenticate gog CLI (opens browser - user clicks Allow)
  await authenticateGog();

  // Step 8: Set up Pub/Sub
  setupPubSub();

  // Step 9: Write env vars
  writeEnvVars();

  console.log(`
╔══════════════════════════════════════════════════════╗
║                Setup Complete!                       ║
╠══════════════════════════════════════════════════════╣
║  Project:     ${PROJECT_ID.padEnd(38)}║
║  Gmail API:   enabled                                ║
║  Drive API:   enabled                                ║
║  Pub/Sub:     ${TOPIC_NAME.padEnd(38)}║
║                                                      ║
║  Next: run the Gmail watch webhook                   ║
║    npx tsx scripts/start-gmail-watch.ts               ║
╚══════════════════════════════════════════════════════╝
`);
}

main().catch(err => {
  console.error('\nSetup failed:', err.message || err);
  process.exit(1);
});
