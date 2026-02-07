/**
 * Nightly Checks Scheduler
 * Logic for determining which checks to run and tracking execution.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface NightlyCheckConfig {
  consistencyChecksEnabled: boolean;
  reflectionEnabled: boolean;
  consistencySchedule: string; // 'nightly' | 'weekly'
  reflectionSchedule: string;
}

/**
 * Load nightly check configuration from learning_configuration table.
 */
export async function loadNightlyConfig(supabase: SupabaseClient): Promise<NightlyCheckConfig> {
  const defaults: NightlyCheckConfig = {
    consistencyChecksEnabled: true,
    reflectionEnabled: true,
    consistencySchedule: 'nightly',
    reflectionSchedule: 'nightly',
  };

  try {
    const { data } = await supabase
      .from('learning_configuration')
      .select('config_key, config_value')
      .in('config_key', [
        'learning.consistency_checks.enabled',
        'learning.reflection.enabled',
      ]);

    if (data) {
      for (const row of data) {
        const val = row.config_value as Record<string, unknown>;
        if (row.config_key === 'learning.consistency_checks.enabled') {
          defaults.consistencyChecksEnabled = val.enabled !== false;
          defaults.consistencySchedule = (val.schedule as string) || 'nightly';
        }
        if (row.config_key === 'learning.reflection.enabled') {
          defaults.reflectionEnabled = val.enabled !== false;
          defaults.reflectionSchedule = (val.schedule as string) || 'nightly';
        }
      }
    }
  } catch {
    // Use defaults if config table doesn't exist
  }

  return defaults;
}

/**
 * Get all active deal IDs that need consistency checking.
 */
export async function getActiveDealsForChecking(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from('deals')
    .select('id')
    .eq('status', 'active')
    .limit(50);

  return (data || []).map(d => d.id);
}
