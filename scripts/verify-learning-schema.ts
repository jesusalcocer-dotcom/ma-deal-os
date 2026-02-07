/**
 * Learning Schema Verification Script
 * Verifies ALL learning tables exist with correct columns via Supabase REST API.
 *
 * Usage: npx tsx scripts/verify-learning-schema.ts
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

// Expected schema: table name → required columns
const EXPECTED_SCHEMA: Record<string, string[]> = {
  // Signal Collection (6)
  self_evaluations: [
    'id', 'deal_id', 'agent_type', 'task_id', 'output_snapshot',
    'criteria_scores', 'issues_found', 'overall_score', 'model_used',
    'token_count', 'evaluated_at',
  ],
  consistency_checks: [
    'id', 'deal_id', 'check_type', 'source_entity_type', 'source_entity_id',
    'conflicting_entity_type', 'conflicting_entity_id', 'description',
    'severity', 'resolution', 'resolved_by', 'detected_at', 'resolved_at',
  ],
  variant_comparisons: [
    'id', 'deal_id', 'task_type', 'variants', 'selected_variant',
    'selection_reasoning', 'context', 'created_at',
  ],
  outcome_signals: [
    'id', 'deal_id', 'signal_type', 'agent_type', 'metric_name',
    'metric_value', 'context', 'measured_at',
  ],
  exemplar_library: [
    'id', 'source_type', 'source_firm', 'document_type', 'deal_characteristics',
    'content', 'quality_score', 'generation_model', 'generation_context',
    'evaluator_scores', 'distillation_eligible', 'used_as_exemplar_count',
    'downstream_quality_impact', 'created_at',
  ],
  exemplar_comparisons: [
    'id', 'deal_id', 'agent_output_id', 'exemplar_id', 'gaps_identified',
    'improvements_suggested', 'similarity_score', 'created_at',
  ],
  // Learning & Reflection (4)
  learned_patterns: [
    'id', 'agent_type', 'pattern_type', 'description', 'condition',
    'instruction', 'confidence', 'supporting_count', 'contradicting_count',
    'lifecycle_stage', 'version', 'version_history', 'last_applied_at',
    'last_evaluated_at', 'created_at', 'updated_at',
  ],
  reflection_runs: [
    'id', 'trigger_type', 'deal_id', 'signals_processed', 'patterns_created',
    'patterns_updated', 'patterns_decayed', 'patterns_promoted', 'summary',
    'model_used', 'token_count', 'duration_seconds', 'created_at',
  ],
  skill_file_versions: [
    'id', 'file_path', 'version', 'changes', 'validation_results',
    'approved_by', 'created_at',
  ],
  generated_tools: [
    'id', 'tool_name', 'source_pattern_id', 'description', 'function_code',
    'usage_count', 'last_used_at', 'deprecated', 'created_at',
  ],
  // Agent Communication (3)
  deal_intelligence: [
    'id', 'deal_id', 'topic', 'insight', 'confidence', 'source_agent',
    'source_evidence', 'supersedes', 'created_at',
  ],
  agent_requests: [
    'id', 'deal_id', 'requesting_agent', 'target_agent', 'request_type',
    'description', 'context', 'status', 'response', 'chain_depth',
    'expires_at', 'created_at', 'completed_at',
  ],
  meta_interventions: [
    'id', 'deal_id', 'trigger_reason', 'trigger_entity_id', 'mode',
    'input_context', 'output_decision', 'human_escalation', 'escalation_options',
    'resolution_time_seconds', 'model_used', 'token_count', 'created_at',
  ],
  // Distillation & Routing (2)
  distillation_trials: [
    'id', 'task_type', 'deal_context', 'opus_score', 'sonnet_score',
    'sonnet_with_exemplars_score', 'exemplar_ids', 'exemplar_count',
    'score_gap', 'recommendation', 'applied', 'created_at',
  ],
  model_routing_config: [
    'id', 'task_type', 'current_model', 'distillation_status', 'exemplar_count',
    'min_exemplars_for_testing', 'handoff_threshold', 'revert_threshold',
    'spot_check_frequency', 'consecutive_low_scores', 'consecutive_high_scores',
    'last_spot_check_at', 'updated_at',
  ],
  // Governance & Configuration (2)
  learning_audit_log: [
    'id', 'event_type', 'actor', 'entity_type', 'entity_id', 'description',
    'before_state', 'after_state', 'reasoning', 'evidence', 'deal_id',
    'reversible', 'reversed_by', 'created_at',
  ],
  learning_configuration: [
    'id', 'config_key', 'config_value', 'updated_by', 'updated_at',
  ],
};

interface VerificationResult {
  table: string;
  exists: boolean;
  missingColumns: string[];
  error?: string;
}

async function verifyTable(tableName: string, expectedColumns: string[]): Promise<VerificationResult> {
  // Check table exists by querying it
  const { data, error } = await supabase.from(tableName).select('*').limit(0);

  if (error) {
    return {
      table: tableName,
      exists: false,
      missingColumns: expectedColumns,
      error: error.message,
    };
  }

  // Table exists — try to verify columns by inserting/selecting with column names
  // Since we can't query information_schema via REST, we do a select with all columns
  const columnList = expectedColumns.join(',');
  const { error: colError } = await supabase.from(tableName).select(columnList).limit(0);

  if (colError) {
    // Parse which columns are missing from the error
    const missingCols = expectedColumns.filter(col => colError.message.includes(col));
    return {
      table: tableName,
      exists: true,
      missingColumns: missingCols.length > 0 ? missingCols : ['(column check failed: ' + colError.message + ')'],
    };
  }

  return {
    table: tableName,
    exists: true,
    missingColumns: [],
  };
}

async function main() {
  const tables = Object.keys(EXPECTED_SCHEMA);
  console.log(`=== Learning Schema Verification ===`);
  console.log(`Checking ${tables.length} tables...\n`);

  let totalIssues = 0;
  let tablesExist = 0;
  let tablesMissing = 0;

  const results = await Promise.all(
    tables.map(table => verifyTable(table, EXPECTED_SCHEMA[table]))
  );

  // Group by category
  const categories = [
    { name: 'Signal Collection', tables: results.slice(0, 6) },
    { name: 'Learning & Reflection', tables: results.slice(6, 10) },
    { name: 'Agent Communication', tables: results.slice(10, 13) },
    { name: 'Distillation & Routing', tables: results.slice(13, 15) },
    { name: 'Governance & Configuration', tables: results.slice(15, 17) },
  ];

  for (const category of categories) {
    console.log(`--- ${category.name} ---`);
    for (const result of category.tables) {
      if (!result.exists) {
        console.log(`  ✗ ${result.table} — MISSING (${result.error})`);
        tablesMissing++;
        totalIssues++;
      } else if (result.missingColumns.length > 0) {
        console.log(`  ⚠ ${result.table} — EXISTS but columns issue: ${result.missingColumns.join(', ')}`);
        tablesExist++;
        totalIssues++;
      } else {
        console.log(`  ✓ ${result.table} — OK (${EXPECTED_SCHEMA[result.table].length} columns)`);
        tablesExist++;
      }
    }
    console.log();
  }

  // Summary
  console.log(`=== Summary ===`);
  console.log(`Tables: ${tablesExist}/${tables.length} exist, ${tablesMissing} missing`);
  console.log(`Issues: ${totalIssues}`);

  if (totalIssues === 0) {
    console.log(`\nAll ${tables.length} learning tables verified. 0 issues found.`);
  } else if (tablesMissing > 0) {
    console.log(`\n⚠ Run scripts/migrations/018-learning-tables.sql in Supabase Dashboard SQL Editor`);
  }

  // Check seed data
  console.log(`\n--- Seed Data Check ---`);

  const { count: routingCount, error: routingError } = await supabase
    .from('model_routing_config')
    .select('*', { count: 'exact', head: true });

  if (routingError) {
    console.log(`  ✗ model_routing_config: ${routingError.message}`);
  } else {
    console.log(`  ${(routingCount || 0) >= 9 ? '✓' : '⚠'} model_routing_config: ${routingCount} rows (need 9+)`);
  }

  const { count: configCount, error: configError } = await supabase
    .from('learning_configuration')
    .select('*', { count: 'exact', head: true });

  if (configError) {
    console.log(`  ✗ learning_configuration: ${configError.message}`);
  } else {
    console.log(`  ${(configCount || 0) >= 15 ? '✓' : '⚠'} learning_configuration: ${configCount} rows (need 15+)`);
  }

  console.log(`\n=== Verification Complete ===`);
}

main().catch(console.error);
