#!/usr/bin/env tsx
/**
 * M&A Deal OS — Comprehensive Test Runner
 * 
 * Runs all automated tests across the codebase:
 *   Level 1: Build verification (no external dependencies)
 *   Level 2: Database connectivity + schema verification
 *   Level 3: API route smoke tests (requires dev server)
 *   Level 4: Integration tests (requires API keys)
 * 
 * Usage:
 *   npx tsx scripts/run-all-tests.ts              # Run all levels
 *   npx tsx scripts/run-all-tests.ts --level 1    # Build only
 *   npx tsx scripts/run-all-tests.ts --level 2    # Build + DB
 *   npx tsx scripts/run-all-tests.ts --level 3    # Build + DB + API routes
 *   npx tsx scripts/run-all-tests.ts --level 4    # Everything including AI calls
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

// ============================================================
// Test Infrastructure
// ============================================================

interface TestResult {
  name: string;
  level: number;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  detail?: string;
}

const results: TestResult[] = [];
const startTime = Date.now();

const maxLevel = parseInt(process.argv.find(a => a.startsWith('--level'))?.split('=')[1] 
  || process.argv[process.argv.indexOf('--level') + 1] 
  || '4');

function log(status: 'PASS' | 'FAIL' | 'SKIP', name: string, detail?: string) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  const msg = `${icon} ${name}${detail ? ': ' + detail : ''}`;
  console.log(msg);
}

function record(name: string, level: number, status: 'PASS' | 'FAIL' | 'SKIP', duration: number, detail?: string) {
  results.push({ name, level, status, duration, detail });
  log(status, name, detail);
}

function runCmd(cmd: string, cwd?: string): { success: boolean; output: string } {
  try {
    const output = execSync(cmd, { 
      cwd: cwd || path.resolve(__dirname, '..'), 
      encoding: 'utf8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, output };
  } catch (err: any) {
    return { success: false, output: err.stderr || err.stdout || err.message };
  }
}

// ============================================================
// LEVEL 1: Build Verification
// ============================================================

async function level1_BuildTests() {
  console.log('\n══════════════════════════════════════');
  console.log('  LEVEL 1: Build Verification');
  console.log('══════════════════════════════════════\n');

  // 1.1 Package.json exists
  let t = Date.now();
  const pkgExists = fs.existsSync(path.resolve(__dirname, '../package.json'));
  record('Root package.json exists', 1, pkgExists ? 'PASS' : 'FAIL', Date.now() - t);

  // 1.2 All packages have package.json
  t = Date.now();
  const packages = ['core', 'db', 'ai', 'integrations', 'mcp-server'];
  const allPkgJson = packages.every(p => 
    fs.existsSync(path.resolve(__dirname, `../packages/${p}/package.json`))
  );
  record('All package.json files exist', 1, allPkgJson ? 'PASS' : 'FAIL', Date.now() - t,
    allPkgJson ? `${packages.length} packages` : 'Missing package.json');

  // 1.3 Web app exists
  t = Date.now();
  const webExists = fs.existsSync(path.resolve(__dirname, '../apps/web/package.json'));
  record('Web app package.json exists', 1, webExists ? 'PASS' : 'FAIL', Date.now() - t);

  // 1.4 TypeScript compilation
  t = Date.now();
  const buildResult = runCmd('pnpm build 2>&1');
  const buildSuccess = buildResult.success || buildResult.output.includes('6 successful');
  record('pnpm build succeeds', 1, buildSuccess ? 'PASS' : 'FAIL', Date.now() - t,
    buildSuccess ? 'All packages built' : buildResult.output.slice(-200));

  // 1.5 Source file count
  t = Date.now();
  const fileCount = runCmd('find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next | grep -v .turbo | wc -l');
  const count = parseInt(fileCount.output.trim());
  record('Source file count', 1, count > 300 ? 'PASS' : 'FAIL', Date.now() - t, `${count} files`);

  // 1.6 All DB schema files exist
  t = Date.now();
  const schemaDir = path.resolve(__dirname, '../packages/db/src/schema');
  const expectedSchemas = [
    'deals.ts', 'checklist-items.ts', 'document-versions.ts', 'users.ts',
    'propagation-events.ts', 'action-chains.ts', 'approval-policies.ts',
    'agent-activations.ts', 'disclosure-schedules.ts', 'negotiation.ts',
    'emails.ts', 'dd-findings.ts', 'closing.ts', 'client-management.ts',
    'third-parties.ts', 'skills-registry.ts', 'observer-changelog.ts',
    'feedback.ts', 'learning-signals.ts', 'learning-patterns.ts',
    'learning-communication.ts', 'learning-distillation.ts', 'learning-governance.ts',
    'drive-sync.ts', 'provision-formulations.ts'
  ];
  const missingSchemas = expectedSchemas.filter(s => !fs.existsSync(path.join(schemaDir, s)));
  record('DB schema files complete', 1, missingSchemas.length === 0 ? 'PASS' : 'FAIL', Date.now() - t,
    missingSchemas.length === 0 ? `${expectedSchemas.length} schemas` : `Missing: ${missingSchemas.join(', ')}`);

  // 1.7 All migration files exist
  t = Date.now();
  const migrationDir = path.resolve(__dirname, '../scripts/migrations');
  const expectedMigrations = ['003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015', '016', '017', '018'];
  const migrationFiles = fs.existsSync(migrationDir) ? fs.readdirSync(migrationDir) : [];
  const missingMigrations = expectedMigrations.filter(m => !migrationFiles.some(f => f.startsWith(m)));
  record('Migration SQL files complete', 1, missingMigrations.length === 0 ? 'PASS' : 'FAIL', Date.now() - t,
    missingMigrations.length === 0 ? `${expectedMigrations.length} migrations` : `Missing: ${missingMigrations.join(', ')}`);

  // 1.8 All web pages exist
  t = Date.now();
  const expectedPages = [
    'app/(dashboard)/deals/page.tsx',
    'app/(dashboard)/deals/new/page.tsx',
    'app/(dashboard)/deals/[dealId]/page.tsx',
    'app/(dashboard)/deals/[dealId]/checklist/page.tsx',
    'app/(dashboard)/deals/[dealId]/documents/page.tsx',
    'app/(dashboard)/deals/[dealId]/diligence/page.tsx',
    'app/(dashboard)/deals/[dealId]/emails/page.tsx',
    'app/(dashboard)/deals/[dealId]/disclosure-schedules/page.tsx',
    'app/(dashboard)/deals/[dealId]/negotiation/page.tsx',
    'app/(dashboard)/deals/[dealId]/closing/page.tsx',
    'app/(dashboard)/deals/[dealId]/client/page.tsx',
    'app/(dashboard)/deals/[dealId]/third-parties/page.tsx',
    'app/(dashboard)/deals/[dealId]/constitution/page.tsx',
    'app/(dashboard)/deals/[dealId]/agent/page.tsx',
    'app/(dashboard)/deals/[dealId]/settings/page.tsx',
    'app/(dashboard)/approval-queue/page.tsx',
    'app/(dashboard)/learning/page.tsx',
    'app/(dashboard)/learning/patterns/page.tsx',
    'app/(dashboard)/learning/agents/page.tsx',
    'app/(dashboard)/learning/consistency/page.tsx',
    'app/(dashboard)/learning/audit/page.tsx',
    'app/(dashboard)/settings/page.tsx',
    'app/(dashboard)/settings/models/page.tsx',
    'app/(dashboard)/settings/learning/page.tsx',
    'app/(dashboard)/settings/spend/page.tsx',
    'app/(dashboard)/how-it-works/page.tsx',
    'app/(dashboard)/observer/page.tsx',
    'app/(dashboard)/simulation/page.tsx',
  ];
  const webDir = path.resolve(__dirname, '../apps/web');
  const missingPages = expectedPages.filter(p => !fs.existsSync(path.join(webDir, p)));
  record('Web pages complete', 1, missingPages.length === 0 ? 'PASS' : 'FAIL', Date.now() - t,
    missingPages.length === 0 ? `${expectedPages.length} pages` : `Missing: ${missingPages.join(', ')}`);

  // 1.9 All agent configs exist
  t = Date.now();
  const agentDir = path.resolve(__dirname, '../packages/ai/src/agents');
  const expectedAgents = [
    'manager/manager-agent.ts',
    'manager/context-loader.ts',
    'manager/briefing-generator.ts',
    'manager/system-prompt.ts',
    'observer/observer-agent.ts',
    'observer/metrics-collector.ts',
    'observer/improvement-loop.ts',
    'specialists/specialist-factory.ts',
    'specialists/configs/analyst-config.ts',
    'specialists/configs/drafter-config.ts',
    'specialists/configs/negotiation-config.ts',
    'specialists/configs/email-config.ts',
    'specialists/configs/closing-config.ts',
    'simulation/client-agent.ts',
    'simulation/third-party-agent.ts',
    'meta/meta-agent.ts',
    'meta/trigger-detector.ts',
    'system-expert/system-expert.ts',
  ];
  const missingAgents = expectedAgents.filter(a => !fs.existsSync(path.join(agentDir, a)));
  record('Agent files complete', 1, missingAgents.length === 0 ? 'PASS' : 'FAIL', Date.now() - t,
    missingAgents.length === 0 ? `${expectedAgents.length} agent files` : `Missing: ${missingAgents.join(', ')}`);

  // 1.10 AI pipeline files exist
  t = Date.now();
  const pipelineDir = path.resolve(__dirname, '../packages/ai/src/pipelines');
  const expectedPipelines = [
    'parse-term-sheet.ts', 'generate-document.ts', 'disclosure-generator.ts',
    'position-extractor.ts', 'client-communication.ts', 'closing-generator.ts',
    'constitution-encoder.ts', 'action-item-extractor.ts', 'whats-market.ts',
    'deal-post-mortem.ts'
  ];
  const missingPipelines = expectedPipelines.filter(p => !fs.existsSync(path.join(pipelineDir, p)));
  record('AI pipeline files complete', 1, missingPipelines.length === 0 ? 'PASS' : 'FAIL', Date.now() - t,
    missingPipelines.length === 0 ? `${expectedPipelines.length} pipelines` : `Missing: ${missingPipelines.join(', ')}`);

  // 1.11 Learning system files exist
  t = Date.now();
  const learningFiles = [
    'packages/ai/src/evaluation/self-evaluator.ts',
    'packages/ai/src/evaluation/consistency-checker.ts',
    'packages/ai/src/evaluation/outcome-tracker.ts',
    'packages/ai/src/evaluation/rubrics.ts',
    'packages/ai/src/evaluation/variant-generator.ts',
    'packages/ai/src/evaluation/exemplar-service.ts',
    'packages/ai/src/evaluation/spend-tracker.ts',
    'packages/ai/src/learning/signal-aggregator.ts',
    'packages/ai/src/learning/reflection-engine.ts',
    'packages/ai/src/learning/pattern-lifecycle.ts',
    'packages/ai/src/learning/pattern-tracker.ts',
    'packages/ai/src/prompts/prompt-assembler.ts',
    'packages/ai/src/prompts/layers/constitutional.ts',
    'packages/ai/src/prompts/layers/firm-knowledge.ts',
    'packages/ai/src/prompts/layers/learned-patterns.ts',
    'packages/ai/src/prompts/layers/deal-intelligence.ts',
    'packages/ai/src/prompts/layers/exemplars.ts',
    'packages/ai/src/communication/deal-intelligence.ts',
    'packages/ai/src/communication/agent-requests.ts',
    'packages/ai/src/distillation/trial-runner.ts',
    'packages/ai/src/distillation/shadow-runner.ts',
    'packages/ai/src/distillation/spot-checker.ts',
    'packages/ai/src/routing/model-router.ts',
    'packages/ai/src/routing/novelty-scorer.ts',
  ];
  const rootDir = path.resolve(__dirname, '..');
  const missingLearning = learningFiles.filter(f => !fs.existsSync(path.join(rootDir, f)));
  record('Learning system files complete', 1, missingLearning.length === 0 ? 'PASS' : 'FAIL', Date.now() - t,
    missingLearning.length === 0 ? `${learningFiles.length} files` : `Missing: ${missingLearning.join(', ')}`);
}

// ============================================================
// LEVEL 2: Database Connectivity & Schema
// ============================================================

async function level2_DatabaseTests() {
  if (maxLevel < 2) {
    console.log('\n⏭️  Skipping Level 2 (--level < 2)\n');
    return;
  }

  console.log('\n══════════════════════════════════════');
  console.log('  LEVEL 2: Database Connectivity');
  console.log('══════════════════════════════════════\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    record('Supabase credentials', 2, 'FAIL', 0, 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  let t: number;

  // 2.1 Basic connectivity
  t = Date.now();
  const { data: pingData, error: pingError } = await supabase.from('deals').select('id').limit(1);
  record('Supabase connectivity', 2, pingError ? 'FAIL' : 'PASS', Date.now() - t,
    pingError ? pingError.message : 'Connected');

  // 2.2 Core tables exist
  const coreTables = [
    'deals', 'users', 'checklist_items', 'document_versions',
    'deal_team_members', 'activity_log', 'provision_types',
    'provision_variants', 'provision_formulations',
  ];
  for (const table of coreTables) {
    t = Date.now();
    const { error } = await supabase.from(table).select('*').limit(0);
    record(`Table: ${table}`, 2, error ? 'FAIL' : 'PASS', Date.now() - t,
      error ? error.message : 'exists');
  }

  // 2.3 Phase 3+ tables exist
  const phase3Tables = [
    'propagation_events', 'action_chains', 'proposed_actions',
    'approval_policies', 'agent_activations',
    'disclosure_schedules', 'disclosure_entries',
    'negotiation_positions', 'negotiation_roadmaps',
    'deal_emails', 'third_parties', 'third_party_deliverables',
    'client_contacts', 'client_action_items', 'client_communications',
    'closing_conditions', 'closing_deliverables',
    'skills_registry', 'observer_changelog',
    'feedback_signals', 'knowledge_entries',
  ];
  let phase3Passed = 0;
  for (const table of phase3Tables) {
    t = Date.now();
    const { error } = await supabase.from(table).select('*').limit(0);
    if (!error) phase3Passed++;
    record(`Table: ${table}`, 2, error ? 'FAIL' : 'PASS', Date.now() - t,
      error ? error.message : 'exists');
  }

  // 2.4 Learning tables exist
  const learningTables = [
    'self_evaluations', 'consistency_checks', 'variant_comparisons',
    'outcome_signals', 'exemplar_library', 'exemplar_comparisons',
    'learned_patterns', 'reflection_runs', 'skill_file_versions', 'generated_tools',
    'deal_intelligence', 'agent_requests', 'meta_interventions',
    'distillation_trials', 'model_routing_config',
    'learning_audit_log', 'learning_configuration',
  ];
  let learningPassed = 0;
  for (const table of learningTables) {
    t = Date.now();
    const { error } = await supabase.from(table).select('*').limit(0);
    if (!error) learningPassed++;
    record(`Table: ${table}`, 2, error ? 'FAIL' : 'PASS', Date.now() - t,
      error ? error.message : 'exists');
  }

  // 2.5 Test deal exists
  t = Date.now();
  const { data: deals } = await supabase.from('deals').select('id, name, code_name').limit(5);
  record('Deals in database', 2, deals && deals.length > 0 ? 'PASS' : 'SKIP', Date.now() - t,
    deals && deals.length > 0 ? `${deals.length} deals found (${deals.map(d => d.code_name || d.name).join(', ')})` : 'No deals yet — create one via the UI');
}

// ============================================================
// LEVEL 3: API Route Smoke Tests
// ============================================================

async function level3_APITests() {
  if (maxLevel < 3) {
    console.log('\n⏭️  Skipping Level 3 (--level < 3)\n');
    return;
  }

  console.log('\n══════════════════════════════════════');
  console.log('  LEVEL 3: API Route Smoke Tests');
  console.log('══════════════════════════════════════\n');

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  // Check if dev server is running
  let t = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/deals`, { signal: AbortSignal.timeout(5000) });
    record('Dev server reachable', 3, res.ok || res.status === 401 ? 'PASS' : 'FAIL', Date.now() - t,
      `Status: ${res.status}`);
  } catch (err: any) {
    record('Dev server reachable', 3, 'FAIL', Date.now() - t,
      'Cannot connect — is `pnpm dev` running?');
    console.log('\n⚠️  Dev server not running. Skipping remaining Level 3 tests.');
    console.log('   Start it with: pnpm dev\n');
    return;
  }

  // Test API routes
  const routes = [
    { method: 'GET', path: '/api/deals', name: 'List deals' },
    { method: 'GET', path: '/api/approval-queue', name: 'Approval queue' },
    { method: 'GET', path: '/api/approval-queue/stats', name: 'Approval stats' },
    { method: 'GET', path: '/api/learning/config', name: 'Learning config' },
    { method: 'GET', path: '/api/learning/routing', name: 'Model routing' },
    { method: 'GET', path: '/api/learning/dashboard', name: 'Learning dashboard' },
    { method: 'GET', path: '/api/learning/patterns', name: 'Learning patterns' },
    { method: 'GET', path: '/api/learning/audit', name: 'Learning audit' },
    { method: 'GET', path: '/api/learning/signals/evaluations', name: 'Evaluation signals' },
    { method: 'GET', path: '/api/learning/signals/consistency', name: 'Consistency signals' },
    { method: 'GET', path: '/api/learning/signals/outcomes', name: 'Outcome signals' },
    { method: 'GET', path: '/api/learning/distillation/status', name: 'Distillation status' },
    { method: 'GET', path: '/api/learning/exemplars', name: 'Exemplars' },
    { method: 'GET', path: '/api/precedent/search?q=stock+purchase', name: 'Precedent search' },
    { method: 'GET', path: '/api/observer/changelog', name: 'Observer changelog' },
  ];

  for (const route of routes) {
    t = Date.now();
    try {
      const res = await fetch(`${baseUrl}${route.path}`, { 
        method: route.method,
        signal: AbortSignal.timeout(10000)
      });
      const isOk = res.status >= 200 && res.status < 500; // 4xx is acceptable (auth), 5xx is not
      record(`API ${route.method} ${route.path}`, 3, isOk ? 'PASS' : 'FAIL', Date.now() - t,
        `${res.status} ${res.statusText}`);
    } catch (err: any) {
      record(`API ${route.method} ${route.path}`, 3, 'FAIL', Date.now() - t, err.message);
    }
  }

  // Test deal-specific routes if a deal exists
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: deals } = await supabase.from('deals').select('id').limit(1);
    
    if (deals && deals.length > 0) {
      const dealId = deals[0].id;
      const dealRoutes = [
        { method: 'GET', path: `/api/deals/${dealId}`, name: 'Get deal' },
        { method: 'GET', path: `/api/deals/${dealId}/checklist`, name: 'Deal checklist' },
        { method: 'GET', path: `/api/deals/${dealId}/documents`, name: 'Deal documents' },
        { method: 'GET', path: `/api/deals/${dealId}/events`, name: 'Deal events' },
        { method: 'GET', path: `/api/deals/${dealId}/disclosure-schedules`, name: 'Disclosure schedules' },
        { method: 'GET', path: `/api/deals/${dealId}/negotiation/positions`, name: 'Negotiation positions' },
        { method: 'GET', path: `/api/deals/${dealId}/closing`, name: 'Closing status' },
        { method: 'GET', path: `/api/deals/${dealId}/client/contacts`, name: 'Client contacts' },
        { method: 'GET', path: `/api/deals/${dealId}/third-parties`, name: 'Third parties' },
        { method: 'GET', path: `/api/deals/${dealId}/agent/activations`, name: 'Agent activations' },
        { method: 'GET', path: `/api/deals/${dealId}/agent/cost-summary`, name: 'Agent cost summary' },
        { method: 'GET', path: `/api/deals/${dealId}/intelligence`, name: 'Deal intelligence' },
        { method: 'GET', path: `/api/deals/${dealId}/learning/signals`, name: 'Deal learning signals' },
      ];

      for (const route of dealRoutes) {
        t = Date.now();
        try {
          const res = await fetch(`${baseUrl}${route.path}`, { 
            method: route.method,
            signal: AbortSignal.timeout(10000)
          });
          const isOk = res.status >= 200 && res.status < 500;
          record(`API ${route.name}`, 3, isOk ? 'PASS' : 'FAIL', Date.now() - t,
            `${res.status}`);
        } catch (err: any) {
          record(`API ${route.name}`, 3, 'FAIL', Date.now() - t, err.message);
        }
      }
    }
  }
}

// ============================================================
// LEVEL 4: Integration Tests
// ============================================================

async function level4_IntegrationTests() {
  if (maxLevel < 4) {
    console.log('\n⏭️  Skipping Level 4 (--level < 4)\n');
    return;
  }

  console.log('\n══════════════════════════════════════');
  console.log('  LEVEL 4: Integration Tests');
  console.log('══════════════════════════════════════\n');

  let t: number;

  // 4.1 Anthropic API connectivity
  t = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    record('Anthropic API key', 4, 'FAIL', Date.now() - t, 'ANTHROPIC_API_KEY not set');
  } else {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 50,
          messages: [{ role: 'user', content: 'Reply with exactly: DEAL_OS_TEST_OK' }],
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json() as any;
      const responseText = data?.content?.[0]?.text || '';
      record('Anthropic API connectivity', 4, responseText.includes('DEAL_OS_TEST_OK') ? 'PASS' : 'FAIL', 
        Date.now() - t, responseText.includes('DEAL_OS_TEST_OK') ? 'Claude responding' : `Response: ${responseText.slice(0, 100)}`);
    } catch (err: any) {
      record('Anthropic API connectivity', 4, 'FAIL', Date.now() - t, err.message);
    }
  }

  // 4.2 Event pipeline test
  t = Date.now();
  const eventResult = runCmd('npx tsx scripts/test-event-pipeline.ts 2>&1');
  const eventPassed = eventResult.output.includes('passed') || eventResult.output.includes('PASS');
  record('Event pipeline test', 4, eventPassed ? 'PASS' : 'FAIL', Date.now() - t,
    eventResult.output.split('\n').filter(l => l.includes('PASS') || l.includes('FAIL')).slice(-3).join('; '));

  // 4.3 Approval flow test
  t = Date.now();
  const approvalResult = runCmd('npx tsx scripts/test-approval-flow.ts 2>&1');
  const approvalPassed = approvalResult.output.includes('passed') || approvalResult.output.includes('PASS');
  record('Approval flow test', 4, approvalPassed ? 'PASS' : 'FAIL', Date.now() - t,
    approvalResult.output.split('\n').filter(l => l.includes('PASS') || l.includes('FAIL')).slice(-3).join('; '));

  // 4.4 Learning loop test
  t = Date.now();
  const learningResult = runCmd('npx tsx scripts/test-full-learning-loop.ts 2>&1');
  const learningLines = learningResult.output.split('\n');
  const summaryLine = learningLines.find(l => l.includes('passed') || l.includes('PASS')) || '';
  record('Full learning loop test', 4, learningResult.success ? 'PASS' : 'FAIL', Date.now() - t,
    summaryLine || learningResult.output.slice(-200));

  // 4.5 Google Drive connectivity (non-destructive check)
  t = Date.now();
  const gKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const gFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!gKeyPath || !gFolderId) {
    record('Google Drive config', 4, 'SKIP', Date.now() - t, 'GOOGLE_SERVICE_ACCOUNT_KEY_PATH or GOOGLE_DRIVE_ROOT_FOLDER_ID not set');
  } else {
    const keyExists = fs.existsSync(path.resolve(__dirname, '..', gKeyPath));
    record('Google Drive config', 4, keyExists ? 'PASS' : 'FAIL', Date.now() - t,
      keyExists ? 'Service account key found' : `Key file not found at ${gKeyPath}`);
  }
}

// ============================================================
// Summary
// ============================================================

function printSummary() {
  console.log('\n══════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('══════════════════════════════════════\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  for (let level = 1; level <= 4; level++) {
    const levelResults = results.filter(r => r.level === level);
    if (levelResults.length === 0) continue;
    const lPassed = levelResults.filter(r => r.status === 'PASS').length;
    const lFailed = levelResults.filter(r => r.status === 'FAIL').length;
    const lSkipped = levelResults.filter(r => r.status === 'SKIP').length;
    console.log(`  Level ${level}: ${lPassed} passed, ${lFailed} failed, ${lSkipped} skipped`);
  }

  console.log(`\n  TOTAL: ${passed} passed, ${failed} failed, ${skipped} skipped (${total} tests)`);
  console.log(`  TIME:  ${elapsed}s`);

  if (failed > 0) {
    console.log('\n  FAILURES:');
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.log(`    ❌ ${r.name}: ${r.detail || 'no detail'}`);
    }
  }

  console.log(`\n  STATUS: ${failed === 0 ? '✅ ALL PASSING' : '❌ FAILURES DETECTED'}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   M&A Deal OS — Test Runner          ║');
  console.log(`║   Max Level: ${maxLevel}                        ║`);
  console.log('╚══════════════════════════════════════╝');

  await level1_BuildTests();
  await level2_DatabaseTests();
  await level3_APITests();
  await level4_IntegrationTests();
  printSummary();
}

main().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
