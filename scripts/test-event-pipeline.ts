import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Import EventBus and resolveConsequences
const { EventBus } = require('../packages/core/dist/events/event-bus');
const { resolveConsequences } = require('../packages/core/dist/rules/consequence-maps');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

async function testConsequenceMaps() {
  console.log('\n--- Test: Consequence Maps ---');

  const events = [
    { type: 'dd.finding_confirmed', minConsequences: 3 },
    { type: 'document.markup_received', minConsequences: 3 },
    { type: 'email.position_extracted', minConsequences: 1 },
    { type: 'checklist.item_overdue', minConsequences: 1 },
    { type: 'deal.parameters_updated', minConsequences: 1 },
    { type: 'closing.condition_satisfied', minConsequences: 1 },
  ];

  for (const evt of events) {
    const results = resolveConsequences({
      event_type: evt.type,
      payload: { risk_level: 'critical' },
      significance: 4,
    });
    assert(
      results.length >= evt.minConsequences,
      `${evt.type}: ${results.length} consequences (>= ${evt.minConsequences})`
    );
  }
}

async function testEventBusFlow() {
  console.log('\n--- Test: Event Bus End-to-End ---');

  // Get a test deal
  const { data: deals } = await supabase.from('deals').select('id').limit(1);
  assert(deals !== null && deals.length > 0, 'Test deal exists');
  const dealId = deals![0].id;

  // Create EventBus
  const eventBus = new EventBus(supabaseUrl, supabaseKey);

  // Emit a dd.finding_confirmed event
  const event = await eventBus.emit({
    deal_id: dealId,
    event_type: 'dd.finding_confirmed',
    source_entity_type: 'dd_finding',
    source_entity_id: dealId,
    payload: { risk_level: 'critical', finding: 'Environmental liability' },
    significance: 4,
  });

  assert(event !== null && event.id !== undefined, `Event emitted: ${event.id}`);

  // Verify event is in propagation_events table
  const { data: fetchedEvent } = await supabase
    .from('propagation_events')
    .select('*')
    .eq('id', event.id)
    .single();

  assert(fetchedEvent !== null, 'Event found in database');
  assert(fetchedEvent!.processed === true, 'Event marked as processed');

  // Verify action chain was created
  const { data: chains } = await supabase
    .from('action_chains')
    .select('*')
    .eq('trigger_event_id', event.id);

  assert(chains !== null && chains.length > 0, `Action chain created: ${chains?.length} chain(s)`);

  if (chains && chains.length > 0) {
    const chain = chains[0];
    assert(chain.status === 'pending', `Chain status: ${chain.status}`);
    assert(chain.significance === 4, `Chain significance: ${chain.significance}`);

    // Verify proposed actions
    const { data: actions } = await supabase
      .from('proposed_actions')
      .select('*')
      .eq('chain_id', chain.id)
      .order('sequence_order', { ascending: true });

    assert(
      actions !== null && actions.length >= 3,
      `Proposed actions: ${actions?.length} (expected >= 3 for dd.finding_confirmed)`
    );

    if (actions && actions.length > 0) {
      const actionTypes = actions.map((a: any) => a.action_type);
      assert(
        actionTypes.includes('document_modification'),
        'Has document_modification action'
      );
      assert(
        actionTypes.includes('disclosure_schedule_update'),
        'Has disclosure_schedule_update action'
      );
      assert(actionTypes.includes('notification'), 'Has notification action');
    }
  }

  // Cleanup
  console.log('\n--- Cleanup ---');
  if (chains && chains.length > 0) {
    await supabase.from('action_chains').delete().eq('id', chains[0].id);
  }
  await supabase.from('propagation_events').delete().eq('id', event.id);
  console.log('  Cleaned up test data');
}

async function testDirectTableAccess() {
  console.log('\n--- Test: Direct Table Access ---');

  const { data: deals } = await supabase.from('deals').select('id').limit(1);
  const dealId = deals![0].id;

  // Insert event directly
  const { data: event, error: eventErr } = await supabase
    .from('propagation_events')
    .insert({
      deal_id: dealId,
      event_type: 'deal.parameters_updated',
      source_entity_type: 'deal',
      source_entity_id: dealId,
      payload: { field: 'deal_value', old_value: 180000000, new_value: 185000000 },
      significance: 3,
    })
    .select()
    .single();

  assert(eventErr === null, `Insert event: ${eventErr ? eventErr.message : 'OK'}`);

  // Query unprocessed events
  const { data: unprocessed } = await supabase
    .from('propagation_events')
    .select('*')
    .eq('deal_id', dealId)
    .eq('processed', false);

  assert(unprocessed !== null && unprocessed.length > 0, 'Query unprocessed events');

  // Create action chain
  const { data: chain, error: chainErr } = await supabase
    .from('action_chains')
    .insert({
      deal_id: dealId,
      trigger_event_id: event!.id,
      summary: 'Test chain for parameters update',
      significance: 3,
      approval_tier: 2,
      status: 'pending',
    })
    .select()
    .single();

  assert(chainErr === null, `Insert action chain: ${chainErr ? chainErr.message : 'OK'}`);

  // Create proposed action
  const { data: action, error: actionErr } = await supabase
    .from('proposed_actions')
    .insert({
      chain_id: chain!.id,
      sequence_order: 1,
      action_type: 'checklist_regeneration',
      target_entity_type: 'checklist',
      payload: { reason: 'Deal parameters changed' },
      preview: { title: 'Regenerate checklist', description: 'Parameters changed' },
      status: 'pending',
    })
    .select()
    .single();

  assert(actionErr === null, `Insert proposed action: ${actionErr ? actionErr.message : 'OK'}`);

  // Cleanup
  await supabase.from('action_chains').delete().eq('id', chain!.id);
  await supabase.from('propagation_events').delete().eq('id', event!.id);
  console.log('  Cleaned up test data');
}

async function main() {
  console.log('=== Phase 3 Integration Test: Event Pipeline ===');

  await testConsequenceMaps();
  await testDirectTableAccess();
  await testEventBusFlow();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
