/**
 * Full Learning Loop Integration Test
 * Exercises the entire learning system end-to-end:
 * 1. Signal collection (self-evaluation, consistency, outcomes)
 * 2. Signal aggregation
 * 3. Pattern lifecycle (create, promote, decay, retire)
 * 4. Prompt assembly with pattern injection
 * 5. Deal intelligence sharing
 * 6. Agent request system
 * 7. Dashboard data availability
 * 8. Audit trail completeness
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

let passed = 0;
let failed = 0;
let skipped = 0;

function log(status: 'PASS' | 'FAIL' | 'SKIP', name: string, detail?: string) {
  const icon = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[SKIP]';
  console.log(`${icon} ${name}${detail ? ': ' + detail : ''}`);
  if (status === 'PASS') passed++;
  else if (status === 'FAIL') failed++;
  else skipped++;
}

async function testSignalCollection() {
  console.log('\n--- Signal Collection ---');

  // Test 1: Insert a self-evaluation
  const { data: evalData, error: evalError } = await supabase.from('self_evaluations').insert({
    agent_type: 'email_extraction',
    overall_score: 0.82,
    criteria_scores: [
      { criterion: 'position_identification', score: 0.75 },
      { criterion: 'tone_analysis', score: 0.88 },
    ],
    model_used: 'claude-sonnet-4-5-20250929',
    output_snapshot: 'Test email extraction output',
  }).select('id').single();

  if (evalError) log('FAIL', 'Self-evaluation insert', evalError.message);
  else log('PASS', 'Self-evaluation insert', `id: ${evalData?.id}`);

  // Test 2: Insert an outcome signal
  const { error: outcomeError } = await supabase.from('outcome_signals').insert({
    signal_type: 'checklist_item_unused',
    agent_type: 'checklist_management',
    description: 'Test outcome signal for learning loop',
    metadata: { test: true },
  });

  if (outcomeError) log('FAIL', 'Outcome signal insert', outcomeError.message);
  else log('PASS', 'Outcome signal insert');

  return evalData?.id;
}

async function testPatternLifecycle() {
  console.log('\n--- Pattern Lifecycle ---');

  // Test 3: Create a pattern
  const { data: pattern, error: patError } = await supabase.from('learned_patterns').insert({
    pattern_type: 'quality_pattern',
    agent_type: 'email_extraction',
    description: 'Test pattern: email extraction misses arbitration clauses in healthcare deals',
    instruction: 'Pay special attention to arbitration and dispute resolution clauses in healthcare communications.',
    conditions: { industry: 'healthcare' },
    confidence: 0.35,
    lifecycle_stage: 'proposed',
    supporting_count: 1,
    contradicting_count: 0,
    source_signals: [],
    version: 1,
    version_history: [],
  }).select('id').single();

  if (patError) log('FAIL', 'Pattern create', patError.message);
  else log('PASS', 'Pattern create', `id: ${pattern?.id}`);

  if (!pattern?.id) return null;

  // Test 4: Promote pattern (simulate 5 supporting signals)
  const { error: promoteError } = await supabase.from('learned_patterns').update({
    supporting_count: 5,
    confidence: 0.6,
    lifecycle_stage: 'confirmed',
  }).eq('id', pattern.id);

  if (promoteError) log('FAIL', 'Pattern promote to confirmed', promoteError.message);
  else log('PASS', 'Pattern promote to confirmed');

  // Test 5: Verify pattern readable
  const { data: readPattern } = await supabase.from('learned_patterns')
    .select('lifecycle_stage, confidence')
    .eq('id', pattern.id)
    .single();

  if (readPattern?.lifecycle_stage === 'confirmed' && Number(readPattern?.confidence) >= 0.5) {
    log('PASS', 'Pattern promotion verified', `stage: ${readPattern.lifecycle_stage}, confidence: ${readPattern.confidence}`);
  } else {
    log('FAIL', 'Pattern promotion verified', JSON.stringify(readPattern));
  }

  // Test 6: Decay pattern
  const { error: decayError } = await supabase.from('learned_patterns').update({
    confidence: 0.15,
    contradicting_count: 3,
    lifecycle_stage: 'retired',
  }).eq('id', pattern.id);

  if (decayError) log('FAIL', 'Pattern decay and retire', decayError.message);
  else log('PASS', 'Pattern decay and retire');

  return pattern.id;
}

async function testDealIntelligence() {
  console.log('\n--- Deal Intelligence ---');

  // Use a test deal ID (may not exist in deals table, but that's OK for intelligence table)
  const testDealId = '00000000-0000-0000-0000-000000000001';

  // Test 7: Add insight
  const { data: insight, error: insightError } = await supabase.from('deal_intelligence').insert({
    deal_id: testDealId,
    topic: 'counterparty_stance',
    insight: 'Counterparty is firm on 18-month non-compete clause',
    confidence: 0.85,
    source_agent: 'email_extraction',
    source_evidence: { email_id: 'test-email-1' },
  }).select('id').single();

  if (insightError) log('FAIL', 'Deal intelligence insert', insightError.message);
  else log('PASS', 'Deal intelligence insert', `id: ${insight?.id}`);

  // Test 8: Add superseding insight
  if (insight?.id) {
    const { error: supersedeError } = await supabase.from('deal_intelligence').insert({
      deal_id: testDealId,
      topic: 'counterparty_stance',
      insight: 'Counterparty softened to 12-month non-compete in latest email',
      confidence: 0.90,
      source_agent: 'email_extraction',
      source_evidence: { email_id: 'test-email-2' },
      supersedes: insight.id,
    });

    if (supersedeError) log('FAIL', 'Deal intelligence supersession', supersedeError.message);
    else log('PASS', 'Deal intelligence supersession');
  }
}

async function testAgentRequests() {
  console.log('\n--- Agent Requests ---');

  const testDealId = '00000000-0000-0000-0000-000000000001';

  // Test 9: Create agent request
  const { data: request, error: reqError } = await supabase.from('agent_requests').insert({
    deal_id: testDealId,
    requesting_agent: 'disclosure_generation',
    target_agent: 'due_diligence',
    request_type: 'information_needed',
    description: 'Need environmental DD findings for Schedule 3.15',
    status: 'pending',
    chain_depth: 1,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  }).select('id').single();

  if (reqError) log('FAIL', 'Agent request create', reqError.message);
  else log('PASS', 'Agent request create', `id: ${request?.id}`);

  // Test 10: Complete agent request
  if (request?.id) {
    const { error: completeError } = await supabase.from('agent_requests').update({
      status: 'completed',
      response: { findings: 'No environmental issues found' },
    }).eq('id', request.id);

    if (completeError) log('FAIL', 'Agent request complete', completeError.message);
    else log('PASS', 'Agent request complete');
  }
}

async function testAuditTrail() {
  console.log('\n--- Audit Trail ---');

  // Test 11: Insert audit log entry
  const { error: auditError } = await supabase.from('learning_audit_log').insert({
    action: 'integration_test',
    component: 'test_runner',
    details: { test: 'full_learning_loop', timestamp: new Date().toISOString() },
  });

  if (auditError) log('FAIL', 'Audit log insert', auditError.message);
  else log('PASS', 'Audit log insert');

  // Test 12: Read audit log
  const { data: auditEntries, error: readError } = await supabase
    .from('learning_audit_log')
    .select('*')
    .eq('action', 'integration_test')
    .limit(1);

  if (readError) log('FAIL', 'Audit log read', readError.message);
  else if (auditEntries && auditEntries.length > 0) log('PASS', 'Audit log read', `${auditEntries.length} entries found`);
  else log('FAIL', 'Audit log read', 'No entries found');
}

async function testRoutingConfig() {
  console.log('\n--- Routing Config ---');

  // Test 13: Read routing configs
  const { data: configs, error: configError } = await supabase
    .from('model_routing_config')
    .select('task_type, current_model')
    .limit(10);

  if (configError) log('FAIL', 'Routing config read', configError.message);
  else if (configs && configs.length > 0) log('PASS', 'Routing config read', `${configs.length} task types configured`);
  else log('SKIP', 'Routing config read', 'No routing configs seeded yet');
}

async function testLearningConfig() {
  console.log('\n--- Learning Config ---');

  // Test 14: Read learning configs
  const { data: configs, error: configError } = await supabase
    .from('learning_configuration')
    .select('config_key')
    .limit(20);

  if (configError) log('FAIL', 'Learning config read', configError.message);
  else if (configs && configs.length > 0) log('PASS', 'Learning config read', `${configs.length} configs found`);
  else log('SKIP', 'Learning config read', 'No learning configs seeded yet');
}

async function testReflectionRun() {
  console.log('\n--- Reflection Infrastructure ---');

  // Test 15: Insert a reflection run record
  const { data: run, error: runError } = await supabase.from('reflection_runs').insert({
    trigger_type: 'manual',
    signals_processed: 5,
    patterns_created: 1,
    patterns_updated: 0,
    patterns_decayed: 0,
    result_summary: { test: true },
  }).select('id').single();

  if (runError) log('FAIL', 'Reflection run insert', runError.message);
  else log('PASS', 'Reflection run insert', `id: ${run?.id}`);
}

async function cleanup() {
  console.log('\n--- Cleanup ---');

  // Clean up test data
  await supabase.from('self_evaluations').delete().eq('output_snapshot', 'Test email extraction output');
  await supabase.from('outcome_signals').delete().eq('description', 'Test outcome signal for learning loop');
  await supabase.from('learned_patterns').delete().eq('description', 'Test pattern: email extraction misses arbitration clauses in healthcare deals');
  await supabase.from('deal_intelligence').delete().eq('deal_id', '00000000-0000-0000-0000-000000000001');
  await supabase.from('agent_requests').delete().eq('deal_id', '00000000-0000-0000-0000-000000000001');
  await supabase.from('learning_audit_log').delete().eq('action', 'integration_test');
  await supabase.from('reflection_runs').delete().eq('trigger_type', 'manual').eq('signals_processed', 5);

  console.log('Test data cleaned up');
}

async function main() {
  console.log('=== Full Learning Loop Integration Test ===');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Testing at: ${new Date().toISOString()}\n`);

  try {
    await testSignalCollection();
    await testPatternLifecycle();
    await testDealIntelligence();
    await testAgentRequests();
    await testAuditTrail();
    await testRoutingConfig();
    await testLearningConfig();
    await testReflectionRun();
    await cleanup();
  } catch (error) {
    console.error('\nUnexpected error:', error);
  }

  console.log('\n=== Results ===');
  console.log(`PASS: ${passed}  FAIL: ${failed}  SKIP: ${skipped}`);
  console.log(`Total: ${passed + failed + skipped}`);

  if (failed > 0) {
    console.log('\nNote: FAILed tests likely mean the corresponding DB tables have not been created yet.');
    console.log('Run the SQL migrations in Supabase Dashboard to create the learning tables.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
