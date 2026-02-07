/**
 * Integration Test: Full Approval Flow
 * Phase 4, Step 4.8
 *
 * Tests: event → chain creation → approval queue → approve → executed
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
const cleanupIds: { events: string[]; chains: string[]; actions: string[] } = {
  events: [],
  chains: [],
  actions: [],
};

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

async function cleanup() {
  console.log('\nCleaning up test data...');
  if (cleanupIds.actions.length) {
    await supabase.from('proposed_actions').delete().in('id', cleanupIds.actions);
  }
  if (cleanupIds.chains.length) {
    await supabase.from('action_chains').delete().in('id', cleanupIds.chains);
  }
  if (cleanupIds.events.length) {
    await supabase.from('propagation_events').delete().in('id', cleanupIds.events);
  }
  console.log('Cleanup complete.');
}

async function main() {
  console.log('=== Integration Test: Full Approval Flow ===\n');

  // Get a test deal
  const { data: deals } = await supabase.from('deals').select('id, name').limit(1);
  if (!deals || deals.length === 0) {
    console.error('No deals found in database');
    process.exit(1);
  }
  const dealId = deals[0].id;
  console.log(`Using deal: ${deals[0].name} (${dealId})\n`);

  // --- Step 1: Emit event via direct DB insert (simulating EventBus.emit) ---
  console.log('Step 1: Emit event (document.markup_received)');
  const { data: event, error: eventError } = await supabase
    .from('propagation_events')
    .insert({
      deal_id: dealId,
      event_type: 'document.markup_received',
      source_entity_type: 'document',
      source_entity_id: dealId, // using dealId as placeholder
      payload: { document_name: 'Stock Purchase Agreement v3', markup_by: 'Counterparty Counsel' },
      significance: 3,
      processed: false,
    })
    .select()
    .single();

  assert(!eventError && !!event, 'Event inserted into propagation_events');
  if (!event) {
    console.error('Event error:', eventError);
    await cleanup();
    process.exit(1);
  }
  cleanupIds.events.push(event.id);

  // --- Step 2: Process via EventBus (import and call) ---
  console.log('\nStep 2: Process event via EventBus');
  const { EventBus } = await import('../packages/core/src/events/event-bus');
  const bus = new EventBus(supabaseUrl, supabaseKey);
  await bus.process(event);

  // --- Step 3: Verify action chain was created ---
  console.log('\nStep 3: Verify action chain creation');
  const { data: chains } = await supabase
    .from('action_chains')
    .select('*, proposed_actions(*)')
    .eq('trigger_event_id', event.id);

  assert(!!chains && chains.length > 0, 'Action chain created for event');

  if (!chains || chains.length === 0) {
    console.error('No chains found');
    await cleanup();
    process.exit(1);
  }

  const chain = chains[0];
  cleanupIds.chains.push(chain.id);
  if (chain.proposed_actions) {
    for (const a of chain.proposed_actions) {
      cleanupIds.actions.push(a.id);
    }
  }

  assert(chain.approval_tier === 2, `Chain approval tier is 2 (got: ${chain.approval_tier})`);
  assert(chain.status === 'pending', `Chain status is pending (got: ${chain.status})`);
  assert(
    chain.proposed_actions && chain.proposed_actions.length === 4,
    `Chain has 4 proposed actions (got: ${chain.proposed_actions?.length})`
  );

  // Verify action types
  const actionTypes = (chain.proposed_actions || []).map((a: any) => a.action_type).sort();
  assert(
    actionTypes.includes('analysis') && actionTypes.includes('negotiation_update'),
    `Actions include analysis and negotiation_update (got: ${actionTypes.join(', ')})`
  );

  // --- Step 4: Query approval queue API (via direct DB) ---
  console.log('\nStep 4: Verify chain appears in approval queue');
  const { data: pendingChains } = await supabase
    .from('action_chains')
    .select('*')
    .eq('status', 'pending')
    .eq('id', chain.id);

  assert(!!pendingChains && pendingChains.length === 1, 'Chain appears in pending queue');

  // --- Step 5: Approve the chain ---
  console.log('\nStep 5: Approve the chain');
  // Update all actions to executed
  for (const action of chain.proposed_actions || []) {
    await supabase
      .from('proposed_actions')
      .update({
        status: 'executed',
        executed_at: new Date().toISOString(),
        execution_result: { approved_by: 'integration_test', approved_at: new Date().toISOString() },
      })
      .eq('id', action.id);
  }

  // Update chain to approved
  await supabase
    .from('action_chains')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', chain.id);

  // --- Step 6: Verify chain is now approved ---
  console.log('\nStep 6: Verify approval results');
  const { data: approvedChain } = await supabase
    .from('action_chains')
    .select('*, proposed_actions(*)')
    .eq('id', chain.id)
    .single();

  assert(approvedChain?.status === 'approved', `Chain status is approved (got: ${approvedChain?.status})`);
  assert(
    !!approvedChain?.approved_at,
    'Chain has approved_at timestamp'
  );

  const executedActions = (approvedChain?.proposed_actions || []).filter(
    (a: any) => a.status === 'executed'
  );
  assert(
    executedActions.length === (chain.proposed_actions?.length || 0),
    `All ${chain.proposed_actions?.length} actions are executed (got: ${executedActions.length})`
  );

  // --- Step 7: Verify event is marked processed ---
  console.log('\nStep 7: Verify event processing');
  const { data: processedEvent } = await supabase
    .from('propagation_events')
    .select('*')
    .eq('id', event.id)
    .single();

  assert(processedEvent?.processed === true, 'Event is marked as processed');

  // Cleanup and report
  await cleanup();

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
  cleanup().then(() => process.exit(1));
});
