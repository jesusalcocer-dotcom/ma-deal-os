/**
 * Verification Script: All Deferred Items from Phases 4-5
 * Run with: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ANTHROPIC_API_KEY=... npx tsx scripts/verify-deferred-items.ts
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
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
    failures.push(message);
  }
}

// Track cleanup
const cleanupOps: Array<() => Promise<void>> = [];

async function cleanup() {
  console.log('\nCleaning up test data...');
  for (const op of cleanupOps.reverse()) {
    await op().catch(() => {});
  }
  console.log('Cleanup complete.');
}

async function main() {
  console.log('=== Deferred Items Verification ===\n');

  // Get test deal
  const { data: deals } = await supabase.from('deals').select('*').eq('name', 'Project Mercury').limit(1);
  if (!deals || !deals.length) {
    console.error('No Project Mercury deal found');
    process.exit(1);
  }
  const deal = deals[0];
  console.log(`Using deal: ${deal.name} (${deal.id})\n`);

  // ========================================
  // DATABASE VERIFICATION 1: approval_policies PUT
  // ========================================
  console.log('--- DB Test 1: approval_policies table ---');
  {
    const { data, error } = await supabase.from('approval_policies').insert({
      name: 'Test Policy',
      description: 'Verification test policy',
      scope_type: 'deal',
      scope_id: deal.id,
      rules: [{ action_type: 'notification', tier: 1, description: 'Test rule' }],
      is_active: true,
    }).select().single();

    assert(error == null && data != null, `approval_policies INSERT works${error ? ' (' + error.message + ')' : ''}`);
    if (data) {
      // Test read-back
      const { data: readBack } = await supabase.from('approval_policies').select('*').eq('id', data.id).single();
      assert(readBack != null && readBack.name === 'Test Policy', 'approval_policies SELECT works');
      cleanupOps.push(async () => { await supabase.from('approval_policies').delete().eq('id', data.id); });
    }
  }

  // ========================================
  // DATABASE VERIFICATION 2: agent_activations insert/select
  // ========================================
  console.log('\n--- DB Test 2: agent_activations table ---');
  {
    const { data, error } = await supabase.from('agent_activations').insert({
      deal_id: deal.id,
      agent_type: 'manager',
      trigger_type: 'event',
      trigger_source: 'verification_test',
      input_tokens: 50000,
      output_tokens: 2000,
      total_cost_usd: 0.18,
      model_used: 'claude-sonnet-4-5-20250929',
      steps: 3,
      tool_calls: 5,
      specialist_invocations: 1,
      duration_ms: 15000,
    }).select().single();

    assert(error == null && data != null, `agent_activations INSERT works${error ? ' (' + error.message + ')' : ''}`);
    if (data) {
      assert(Number(data.total_cost_usd) === 0.18, `Cost stored correctly (got ${data.total_cost_usd})`);
      cleanupOps.push(async () => { await supabase.from('agent_activations').delete().eq('id', data.id); });
    }
  }

  // ========================================
  // DATABASE VERIFICATION 3: deals.monitoring_level column
  // ========================================
  console.log('\n--- DB Test 3: deals.monitoring_level column ---');
  {
    const { data, error } = await supabase.from('deals')
      .update({ monitoring_level: 'passive' })
      .eq('id', deal.id)
      .select('id, monitoring_level')
      .single();

    assert(error == null && data != null, `deals.monitoring_level UPDATE works${error ? ' (' + error.message + ')' : ''}`);
    if (data) {
      assert(data.monitoring_level === 'passive', `monitoring_level value is 'passive' (got ${data.monitoring_level})`);
      // Reset to active
      await supabase.from('deals').update({ monitoring_level: 'active' }).eq('id', deal.id);
    }
  }

  // ========================================
  // DATABASE VERIFICATION 4: disclosure_schedules CRUD
  // ========================================
  console.log('\n--- DB Test 4: disclosure_schedules + disclosure_entries tables ---');
  {
    const { data: schedule, error: schedErr } = await supabase.from('disclosure_schedules').insert({
      deal_id: deal.id,
      schedule_number: 'Schedule 3.15(a)',
      schedule_title: 'Material Contracts',
      related_rep_section: 'Section 3.15(a)',
      status: 'pending',
    }).select().single();

    assert(schedErr == null && schedule != null, `disclosure_schedules INSERT works${schedErr ? ' (' + schedErr.message + ')' : ''}`);

    if (schedule) {
      // Create an entry
      const { data: entry, error: entryErr } = await supabase.from('disclosure_entries').insert({
        schedule_id: schedule.id,
        entry_text: 'Acme Supply Contract dated January 15, 2024',
        entry_type: 'dd_finding',
        status: 'draft',
      }).select().single();

      assert(entryErr == null && entry != null, `disclosure_entries INSERT works${entryErr ? ' (' + entryErr.message + ')' : ''}`);

      // Read with join
      const { data: readBack } = await supabase.from('disclosure_schedules')
        .select('*, disclosure_entries(*)')
        .eq('id', schedule.id)
        .single();

      assert(readBack != null && (readBack.disclosure_entries?.length || 0) === 1, 'Schedule reads back with entries');

      cleanupOps.push(async () => {
        if (entry) await supabase.from('disclosure_entries').delete().eq('id', entry.id);
        await supabase.from('disclosure_schedules').delete().eq('id', schedule.id);
      });
    }
  }

  // ========================================
  // DATABASE VERIFICATION 5: negotiation_positions table
  // ========================================
  console.log('\n--- DB Test 5: negotiation_positions + negotiation_roadmaps tables ---');
  {
    const { data: pos, error: posErr } = await supabase.from('negotiation_positions').insert({
      deal_id: deal.id,
      provision_type: 'indemnification.basket.type',
      provision_label: 'Indemnification Basket Type',
      our_current_position: 'True deductible basket with $500K threshold',
      status: 'open',
      significance: 4,
      financial_impact: true,
      category: 'indemnification',
    }).select().single();

    assert(posErr == null && pos != null, `negotiation_positions INSERT works${posErr ? ' (' + posErr.message + ')' : ''}`);

    // Test roadmap table
    const { data: roadmap, error: roadErr } = await supabase.from('negotiation_roadmaps').insert({
      deal_id: deal.id,
      strategy_summary: 'Test strategy summary for verification',
      key_leverage_points: ['Point 1', 'Point 2'],
      red_lines: ['No earnout above 20%'],
    }).select().single();

    assert(roadErr == null && roadmap != null, `negotiation_roadmaps INSERT works${roadErr ? ' (' + roadErr.message + ')' : ''}`);

    cleanupOps.push(async () => {
      if (pos) await supabase.from('negotiation_positions').delete().eq('id', pos.id);
      if (roadmap) await supabase.from('negotiation_roadmaps').delete().eq('id', roadmap.id);
    });
  }

  // ========================================
  // DATABASE VERIFICATION 6: deal_emails extraction columns
  // ========================================
  console.log('\n--- DB Test 6: deal_emails extracted_positions/extracted_action_items columns ---');
  {
    // Insert a test email with extraction columns
    const { data: email, error: emailErr } = await supabase.from('deal_emails').insert({
      deal_id: deal.id,
      subject: 'Test email for verification',
      sender_email: 'test@example.com',
      received_at: new Date().toISOString(),
      extracted_positions: [{ provision_type: 'indemnification.basket.type', party: 'counterparty', position: 'Tipping basket', confidence: 0.9 }],
      extracted_action_items: [{ description: 'Review markup', assigned_to_type: 'us', priority: 'high', category: 'document_review' }],
    }).select().single();

    assert(emailErr == null && email != null, `deal_emails INSERT with extraction columns works${emailErr ? ' (' + emailErr.message + ')' : ''}`);

    if (email) {
      assert(Array.isArray(email.extracted_positions) && email.extracted_positions.length === 1, 'extracted_positions stored correctly');
      assert(Array.isArray(email.extracted_action_items) && email.extracted_action_items.length === 1, 'extracted_action_items stored correctly');
      cleanupOps.push(async () => { await supabase.from('deal_emails').delete().eq('id', email.id); });
    }
  }

  // ========================================
  // AI PIPELINE VERIFICATION 7: Disclosure generation
  // ========================================
  console.log('\n--- AI Test 7: Disclosure schedule generation pipeline ---');
  {
    try {
      const { generateDisclosureSchedules } = await import('../packages/ai/src/pipelines/disclosure-generator');

      const sampleSPA = `
STOCK PURCHASE AGREEMENT

ARTICLE III - REPRESENTATIONS AND WARRANTIES OF THE SELLER

Section 3.1 Organization and Good Standing. The Seller is a corporation duly organized, validly existing and in good standing under the laws of the State of Delaware, except as set forth in Schedule 3.1.

Section 3.5 Financial Statements. The Seller has delivered to the Buyer true and complete copies of the financial statements listed on Schedule 3.5, including audited balance sheets and income statements for the fiscal years ended December 31, 2023 and 2024.

Section 3.8 Litigation. Except as set forth in Schedule 3.8, there is no action, suit, proceeding, claim, arbitration or investigation pending or, to the Knowledge of the Seller, threatened against the Company.

Section 3.10 Tax Matters. Except as disclosed in Schedule 3.10, the Company has filed all required Tax Returns and has paid all Taxes due and payable.

Section 3.15 Material Contracts. Schedule 3.15(a) sets forth a true and complete list of all Material Contracts. Except as set forth in Schedule 3.15(b), each Material Contract is valid and binding.

Section 3.17 Environmental Matters. Except as disclosed in Schedule 3.17, the Company is in compliance with all Environmental Laws.

Section 3.20 Employee Benefits. Schedule 3.20 contains a list of all Employee Benefit Plans maintained by the Company. Except as set forth in Schedule 3.20, no Employee Benefit Plan is subject to Title IV of ERISA.

Section 3.22 Insurance. Schedule 3.22 sets forth a list of all insurance policies maintained by or on behalf of the Company.
`;

      const result = await generateDisclosureSchedules(sampleSPA);
      assert(result.schedules.length >= 5, `Generated ${result.schedules.length} schedules from SPA text (need 5+)`);

      // Check specific schedule references
      const schedNums = result.schedules.map(s => s.schedule_number);
      assert(schedNums.some(n => n.includes('3.15')), `Found Schedule 3.15 reference (Material Contracts)`);
      assert(schedNums.some(n => n.includes('3.8')), `Found Schedule 3.8 reference (Litigation)`);

      console.log('  Schedules found:');
      for (const s of result.schedules) {
        console.log(`    ${s.schedule_number} — ${s.schedule_title}`);
      }
    } catch (e: any) {
      assert(false, `Disclosure generation pipeline: ${e.message}`);
    }
  }

  // ========================================
  // AI PIPELINE VERIFICATION 8: Position extraction
  // ========================================
  console.log('\n--- AI Test 8: Email position extraction pipeline ---');
  {
    try {
      const { extractPositionsFromEmail } = await import('../packages/ai/src/pipelines/position-extractor');

      const testEmail = `
Dear Counsel,
We have reviewed your initial draft of the SPA. While we generally find the document
acceptable, we have the following comments on key provisions:

1. Indemnification: We cannot accept a true deductible basket. We require a
   tipping basket with a threshold of $750,000 (0.5% of deal value).

2. Survival: 18 months is too long. We propose 12 months for general representations
   and 24 months for fundamental representations.

3. Cap: We are willing to accept a 10% cap on general representations but require
   that fundamental representations remain uncapped.

We look forward to discussing these positions.
`;

      const result = await extractPositionsFromEmail(testEmail);
      assert(result.positions.length >= 3, `Extracted ${result.positions.length} positions from email (need 3+)`);

      const provTypes = result.positions.map(p => p.provision_type);
      assert(result.positions.some(p => p.party === 'counterparty'), 'Positions attributed to counterparty');

      console.log('  Positions extracted:');
      for (const p of result.positions) {
        console.log(`    [${p.party}] ${p.provision_type}: ${p.position} (conf: ${p.confidence})`);
      }
    } catch (e: any) {
      assert(false, `Position extraction pipeline: ${e.message}`);
    }
  }

  // ========================================
  // AI PIPELINE VERIFICATION 9: Action item extraction
  // ========================================
  console.log('\n--- AI Test 9: Email action item extraction pipeline ---');
  {
    try {
      const { extractActionItems } = await import('../packages/ai/src/pipelines/action-item-extractor');

      const testEmail = `
Hi Team,

Following our call with the counterparty's counsel, please note the following action items:

1. We need to turn a revised markup of the SPA reflecting their comments on indemnification
   provisions by end of day Friday.

2. Please send the updated disclosure schedules to the client for their review and sign-off
   by next Tuesday.

3. The accountants need to provide the working capital calculation methodology memo
   within 5 business days.

4. Let's schedule a call with opposing counsel next week to discuss the remaining
   open points on the non-compete provisions.

Thanks,
Partner
`;

      const result = await extractActionItems(testEmail);
      assert(result.action_items.length >= 3, `Extracted ${result.action_items.length} action items from email (need 3+)`);

      assert(result.action_items.some(a => a.priority === 'high'), 'At least one high-priority item identified');
      assert(result.action_items.some(a => a.due_date_hint != null), 'At least one item has a due date hint');

      console.log('  Action items extracted:');
      for (const a of result.action_items) {
        console.log(`    [${a.priority}] ${a.description.substring(0, 80)}${a.due_date_hint ? ' (due: ' + a.due_date_hint + ')' : ''}`);
      }
    } catch (e: any) {
      assert(false, `Action item extraction pipeline: ${e.message}`);
    }
  }

  // Cleanup
  await cleanup();

  // Report
  console.log(`\n${'='.repeat(60)}`);
  console.log(`VERIFICATION RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  console.log(`${'='.repeat(60)}`);

  if (failures.length > 0) {
    console.log('\nFailed tests:');
    for (const f of failures) {
      console.log(`  - ${f}`);
    }
  }

  if (failed > 0) {
    console.log('\nSome verifications FAILED. Fix before proceeding.');
    process.exit(1);
  } else {
    console.log('\nAll deferred items VERIFIED. Safe to clear deferred_items and advance to Phase 6.');
  }
}

main().catch((e) => {
  console.error('Verification crashed:', e);
  cleanup().then(() => process.exit(1));
});
