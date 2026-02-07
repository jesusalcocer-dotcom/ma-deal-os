/**
 * Seed Learning Configuration — default feature toggles and spend controls
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

const defaultConfig = [
  { config_key: 'learning.enabled', config_value: { enabled: true } },
  { config_key: 'learning.self_evaluation.enabled', config_value: { enabled: true } },
  { config_key: 'learning.consistency_checks.enabled', config_value: { enabled: true, schedule: 'nightly' } },
  { config_key: 'learning.variant_comparison.enabled', config_value: { enabled: false } }, // off by default — 3x cost
  { config_key: 'learning.outcome_tracking.enabled', config_value: { enabled: true } },
  { config_key: 'learning.exemplar_comparison.enabled', config_value: { enabled: true } },
  { config_key: 'learning.reflection.enabled', config_value: { enabled: true, schedule: 'nightly' } },
  { config_key: 'learning.reflection.auto_promotion_max', config_value: { max_stage: 'established' } },
  { config_key: 'learning.injection.max_patterns_per_prompt', config_value: { max: 10 } },
  { config_key: 'learning.injection.min_confidence', config_value: { min: 0.5 } },
  { config_key: 'learning.injection.max_exemplars_per_prompt', config_value: { max: 3 } },
  { config_key: 'learning.spend.monthly_cap', config_value: { cap_usd: 500 } },
  { config_key: 'learning.spend.per_deal_cap', config_value: { cap_usd: 50 } },
  { config_key: 'learning.spend.overhead_cap_pct', config_value: { cap_pct: 40 } },
  { config_key: 'learning.spend.behavior_when_exceeded', config_value: { behavior: 'warn_only' } },
];

async function main() {
  console.log('Seeding learning configuration...\n');

  for (const row of defaultConfig) {
    const { data, error } = await supabase
      .from('learning_configuration')
      .upsert(row, { onConflict: 'config_key' })
      .select()
      .single();

    if (error) {
      console.log(`  ✗ ${row.config_key} — ${error.message}`);
    } else {
      console.log(`  ✓ ${row.config_key}`);
    }
  }

  // Verify count
  const { count, error } = await supabase
    .from('learning_configuration')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log(`\n  ✗ Count check failed: ${error.message}`);
  } else {
    console.log(`\n  Total rows: ${count}`);
    console.log(count! >= 15 ? '  PASS: 15+ config entries seeded' : '  FAIL: expected 15+ rows');
  }
}

main().catch(console.error);
