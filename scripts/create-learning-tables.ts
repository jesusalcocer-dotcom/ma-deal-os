/**
 * Learning Tables Creation & Verification Script
 * Tests that all learning tables exist and are queryable via Supabase REST API.
 *
 * Tables must be created via Supabase Dashboard SQL Editor using:
 *   scripts/migrations/018-learning-tables.sql
 *
 * This script verifies the tables exist by attempting queries.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// All 17 learning tables (16 new + checking existing deals table for references)
const SIGNAL_TABLES = [
  'self_evaluations',
  'consistency_checks',
  'variant_comparisons',
  'outcome_signals',
  'exemplar_library',
  'exemplar_comparisons',
];

const PATTERN_TABLES = [
  'learned_patterns',
  'reflection_runs',
  'skill_file_versions',
  'generated_tools',
];

const COMMUNICATION_TABLES = [
  'deal_intelligence',
  'agent_requests',
  'meta_interventions',
];

const DISTILLATION_TABLES = [
  'distillation_trials',
  'model_routing_config',
];

const GOVERNANCE_TABLES = [
  'learning_audit_log',
  'learning_configuration',
];

const ALL_TABLES = [
  ...SIGNAL_TABLES,
  ...PATTERN_TABLES,
  ...COMMUNICATION_TABLES,
  ...DISTILLATION_TABLES,
  ...GOVERNANCE_TABLES,
];

async function checkTable(tableName: string): Promise<{ name: string; exists: boolean; error?: string }> {
  const { data, error } = await supabase.from(tableName).select('*').limit(0);
  if (error) {
    return { name: tableName, exists: false, error: error.message };
  }
  return { name: tableName, exists: true };
}

async function testInsert(tableName: string, row: Record<string, unknown>): Promise<{ name: string; success: boolean; error?: string }> {
  const { data, error } = await supabase.from(tableName).insert(row).select().single();
  if (error) {
    return { name: tableName, success: false, error: error.message };
  }
  // Clean up test row
  if (data?.id) {
    await supabase.from(tableName).delete().eq('id', data.id);
  }
  return { name: tableName, success: true };
}

async function main() {
  console.log('=== Learning Tables Verification ===\n');

  // Phase 1: Check table existence
  console.log('Phase 1: Checking table existence...\n');
  let existCount = 0;
  let missingCount = 0;

  const results = await Promise.all(ALL_TABLES.map(checkTable));

  for (const result of results) {
    if (result.exists) {
      console.log(`  ✓ ${result.name}`);
      existCount++;
    } else {
      console.log(`  ✗ ${result.name} — ${result.error}`);
      missingCount++;
    }
  }

  console.log(`\n  ${existCount}/${ALL_TABLES.length} tables exist, ${missingCount} missing\n`);

  if (missingCount > 0) {
    console.log('  ⚠ Run scripts/migrations/018-learning-tables.sql in Supabase Dashboard SQL Editor\n');
    return;
  }

  // Phase 2: Test inserts into signal tables
  console.log('Phase 2: Testing signal table inserts...\n');

  const insertTests = [
    testInsert('self_evaluations', {
      agent_type: 'test_agent',
      output_snapshot: { test: true },
      criteria_scores: { accuracy: 0.9 },
      overall_score: 0.9,
      model_used: 'sonnet',
    }),
    testInsert('consistency_checks', {
      check_type: 'on_demand',
      source_entity_type: 'test',
      source_entity_id: '00000000-0000-0000-0000-000000000001',
      conflicting_entity_type: 'test',
      conflicting_entity_id: '00000000-0000-0000-0000-000000000002',
      description: 'Test check',
    }),
    testInsert('variant_comparisons', {
      task_type: 'test_task',
      variants: [{ strategy: 'conservative', score: 0.8 }],
      selected_variant: 'conservative',
    }),
    testInsert('outcome_signals', {
      signal_type: 'calibration',
      agent_type: 'test_agent',
      metric_name: 'test_metric',
      metric_value: 0.85,
    }),
    testInsert('exemplar_library', {
      source_type: 'internal_approved',
      document_type: 'test_doc',
      content: { test: true },
      quality_score: 0.9,
    }),
    testInsert('learned_patterns', {
      pattern_type: 'quality_improvement',
      description: 'Test pattern',
      condition: { deal_type: 'asset_purchase' },
      instruction: 'Test instruction',
      confidence: 0.5,
      lifecycle_stage: 'proposed',
    }),
    testInsert('deal_intelligence', {
      deal_id: '00000000-0000-0000-0000-000000000001',
      topic: 'test_topic',
      insight: 'Test insight',
      source_agent: 'test_agent',
    }),
    testInsert('model_routing_config', {
      task_type: 'test_task_' + Date.now(),
      current_model: 'sonnet',
    }),
    testInsert('learning_audit_log', {
      event_type: 'test',
      actor: 'system:test',
      entity_type: 'test',
      description: 'Test audit entry',
    }),
    testInsert('learning_configuration', {
      config_key: 'test.key.' + Date.now(),
      config_value: { enabled: true },
    }),
  ];

  const insertResults = await Promise.all(insertTests);
  let passCount = 0;

  for (const result of insertResults) {
    if (result.success) {
      console.log(`  ✓ INSERT ${result.name}`);
      passCount++;
    } else {
      console.log(`  ✗ INSERT ${result.name} — ${result.error}`);
    }
  }

  console.log(`\n  ${passCount}/${insertResults.length} insert tests passed\n`);
  console.log('=== Verification Complete ===');
}

main().catch(console.error);
