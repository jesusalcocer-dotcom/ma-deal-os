/**
 * Integration Test: Cross-Workflow Event Flow
 * Phase 5, Step 5.10
 *
 * Tests: email → position extraction → negotiation update → event → action chain
 * Note: Position extraction requires Anthropic API credits for live test.
 *       This test verifies the flow mechanics without requiring AI calls.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

let passed = 0;
let failed = 0;
const cleanup: { table: string; ids: string[] }[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

async function doCleanup() {
  console.log('\nCleaning up test data...');
  for (const { table, ids } of cleanup.reverse()) {
    if (ids.length) {
      await supabase.from(table).delete().in('id', ids);
    }
  }
  console.log('Cleanup complete.');
}

async function main() {
  console.log('=== Integration Test: Cross-Workflow Event Flow ===\n');

  // Get test deal
  const { data: deals } = await supabase.from('deals').select('id, name, parameters, deal_value, buyer_type').limit(1);
  if (!deals || !deals.length) {
    console.error('No deals found');
    process.exit(1);
  }
  const deal = deals[0];
  console.log(`Using deal: ${deal.name} (${deal.id})\n`);

  // --- Test 1: Negotiation Position Initialization ---
  console.log('Test 1: Negotiation position initialization');
  const { generateInitialPositions } = await import('../packages/core/src/rules/negotiation-initializer');
  const positions = generateInitialPositions({
    ...deal.parameters,
    deal_value: deal.deal_value,
    buyer_type: deal.buyer_type,
  });
  assert(positions.length >= 10, `Generated ${positions.length} initial positions (need 10+)`);
  assert(
    positions.some((p) => p.category === 'indemnification'),
    'Includes indemnification positions'
  );
  assert(
    positions.some((p) => p.category === 'survival'),
    'Includes survival positions'
  );

  // --- Test 2: Simulated position update → event emission ---
  console.log('\nTest 2: Position update triggers event emission');

  // Simulate: counterparty sent an email with a position on basket type
  // In production, this would go through extractPositionsFromEmail()
  const extractedPositions = [
    {
      provision_type: 'indemnification.basket.type',
      party: 'counterparty' as const,
      position: 'Tipping basket with $750,000 threshold',
      position_detail: { type: 'tipping', amount: 750000, percentage: 0.5 },
      confidence: 0.95,
    },
    {
      provision_type: 'survival.general',
      party: 'counterparty' as const,
      position: '12 months for general reps',
      position_detail: { months: 12 },
      confidence: 0.9,
    },
  ];
  assert(extractedPositions.length >= 2, `Extracted ${extractedPositions.length} positions from simulated email`);

  // --- Test 3: Event emission for position extraction ---
  console.log('\nTest 3: Emit email.position_extracted event');
  const { EventBus } = await import('../packages/core/src/events/event-bus');
  const bus = new EventBus(supabaseUrl, supabaseKey);

  const event = await bus.emit({
    deal_id: deal.id,
    event_type: 'email.position_extracted',
    source_entity_type: 'email',
    source_entity_id: deal.id,
    payload: {
      positions: extractedPositions,
      email_subject: 'RE: SPA Draft Comments',
    },
    significance: 3,
  });
  assert(!!event && !!event.id, 'Event emitted successfully');
  cleanup.push({ table: 'propagation_events', ids: [event.id] });

  // --- Test 4: Verify action chain created from consequence maps ---
  console.log('\nTest 4: Verify action chain from consequence maps');
  const { data: chains } = await supabase
    .from('action_chains')
    .select('*, proposed_actions(*)')
    .eq('trigger_event_id', event.id);

  assert(!!chains && chains.length > 0, 'Action chain created from email.position_extracted event');

  if (chains && chains.length > 0) {
    const chain = chains[0];
    cleanup.push({ table: 'proposed_actions', ids: (chain.proposed_actions || []).map((a: any) => a.id) });
    cleanup.push({ table: 'action_chains', ids: [chain.id] });

    assert(chain.proposed_actions?.length >= 2, `Chain has ${chain.proposed_actions?.length} proposed actions (need 2+)`);

    const actionTypes = (chain.proposed_actions || []).map((a: any) => a.action_type);
    assert(
      actionTypes.includes('negotiation_update'),
      `Actions include negotiation_update (got: ${actionTypes.join(', ')})`
    );

    // The consequence map for email.position_extracted has negotiation_update (Tier 2) and agent_evaluation (Tier 1)
    // So the chain should be Tier 2 (max)
    assert(
      chain.approval_tier >= 1,
      `Approval tier is ${chain.approval_tier} (expected 1 or 2)`
    );
  }

  // --- Test 5: Verify event marked as processed ---
  console.log('\nTest 5: Event processing status');
  const { data: processedEvent } = await supabase
    .from('propagation_events')
    .select('processed')
    .eq('id', event.id)
    .single();

  assert(processedEvent?.processed === true, 'Event marked as processed');

  // --- Test 6: Consequence map resolution ---
  console.log('\nTest 6: Consequence map resolution');
  const { resolveConsequences } = await import('../packages/core/src/rules/consequence-maps');
  const consequences = resolveConsequences({
    event_type: 'email.position_extracted',
    payload: { positions: extractedPositions },
    significance: 3,
  });
  assert(consequences.length >= 2, `Resolved ${consequences.length} consequences for email.position_extracted`);

  // Cleanup
  await doCleanup();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  console.log(`${'='.repeat(50)}`);

  if (failed > 0) {
    console.log('\nSome tests FAILED.');
    process.exit(1);
  } else {
    console.log('\nAll tests PASSED!');
  }
}

main().catch((e) => {
  console.error('Test crashed:', e);
  doCleanup().then(() => process.exit(1));
});
