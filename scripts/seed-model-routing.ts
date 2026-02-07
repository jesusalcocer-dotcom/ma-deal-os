/**
 * Seed Model Routing Config — initial per-task model assignments
 * Run after creating tables via 018-learning-tables.sql
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

const defaultRouting = [
  { task_type: 'email_extraction', current_model: 'sonnet', distillation_status: 'not_started' },
  { task_type: 'checklist_update', current_model: 'sonnet', distillation_status: 'not_started' },
  { task_type: 'disclosure_generation', current_model: 'opus', distillation_status: 'not_started' },
  { task_type: 'negotiation_analysis', current_model: 'opus', distillation_status: 'not_started' },
  { task_type: 'document_drafting', current_model: 'opus', distillation_status: 'not_started' },
  { task_type: 'self_evaluation', current_model: 'sonnet', distillation_status: 'not_started' },
  { task_type: 'consistency_check', current_model: 'sonnet', distillation_status: 'not_started' },
  { task_type: 'reflection', current_model: 'opus', distillation_status: 'not_started' },
  { task_type: 'meta_intervention', current_model: 'opus', distillation_status: 'not_started' },
];

async function main() {
  console.log('Seeding model routing config...\n');

  for (const row of defaultRouting) {
    const { data, error } = await supabase
      .from('model_routing_config')
      .upsert(row, { onConflict: 'task_type' })
      .select()
      .single();

    if (error) {
      console.log(`  ✗ ${row.task_type} — ${error.message}`);
    } else {
      console.log(`  ✓ ${row.task_type} → ${row.current_model}`);
    }
  }

  // Verify count
  const { count, error } = await supabase
    .from('model_routing_config')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log(`\n  ✗ Count check failed: ${error.message}`);
  } else {
    console.log(`\n  Total rows: ${count}`);
    console.log(count! >= 9 ? '  PASS: 9+ routing configs seeded' : '  FAIL: expected 9+ rows');
  }
}

main().catch(console.error);
