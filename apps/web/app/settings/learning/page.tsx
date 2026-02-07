'use client';
import { useEffect, useState, useCallback } from 'react';

interface ConfigEntry {
  id: string;
  config_key: string;
  config_value: any;
  updated_by: string | null;
  updated_at: string;
}

interface ToggleConfig {
  key: string;
  label: string;
  description: string;
  section: string;
  type: 'boolean' | 'number' | 'select';
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  defaultValue: any;
}

const TOGGLE_DEFINITIONS: ToggleConfig[] = [
  // Signal Collection
  {
    key: 'signal_collection_enabled',
    label: 'Enable Signal Collection',
    description: 'Collect evaluation signals, user feedback, and outcome data from all agent interactions.',
    section: 'Signal Collection',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'auto_evaluate_outputs',
    label: 'Auto-Evaluate Outputs',
    description: 'Automatically score agent outputs using the evaluation pipeline.',
    section: 'Signal Collection',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'collect_user_corrections',
    label: 'Collect User Corrections',
    description: 'Track when users manually edit or override agent-generated content.',
    section: 'Signal Collection',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'outcome_tracking_enabled',
    label: 'Track Deal Outcomes',
    description: 'Record deal progression events and final outcomes for long-term pattern analysis.',
    section: 'Signal Collection',
    type: 'boolean',
    defaultValue: true,
  },

  // Pattern Processing
  {
    key: 'pattern_detection_enabled',
    label: 'Enable Pattern Detection',
    description: 'Run periodic reflection to detect patterns from collected signals.',
    section: 'Pattern Processing',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'reflection_frequency_hours',
    label: 'Reflection Frequency',
    description: 'How often the reflection engine runs to analyze signals and extract patterns.',
    section: 'Pattern Processing',
    type: 'number',
    min: 1,
    max: 168,
    step: 1,
    unit: 'hours',
    defaultValue: 24,
  },
  {
    key: 'min_signals_for_pattern',
    label: 'Min Signals for Pattern',
    description: 'Minimum number of signals required before a pattern can be detected.',
    section: 'Pattern Processing',
    type: 'number',
    min: 3,
    max: 100,
    step: 1,
    defaultValue: 10,
  },
  {
    key: 'auto_promote_patterns',
    label: 'Auto-Promote Patterns',
    description: 'Automatically promote validated patterns from candidate to active status.',
    section: 'Pattern Processing',
    type: 'boolean',
    defaultValue: false,
  },
  {
    key: 'consistency_check_enabled',
    label: 'Consistency Checking',
    description: 'Run consistency analysis across deals to detect contradictions and anomalies.',
    section: 'Pattern Processing',
    type: 'boolean',
    defaultValue: true,
  },

  // Knowledge Injection
  {
    key: 'knowledge_injection_enabled',
    label: 'Enable Knowledge Injection',
    description: 'Inject learned patterns and exemplars into agent prompts.',
    section: 'Knowledge Injection',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'distillation_enabled',
    label: 'Enable Distillation',
    description: 'Allow Opus-to-Sonnet model distillation using exemplar-based knowledge transfer.',
    section: 'Knowledge Injection',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'auto_handoff_enabled',
    label: 'Auto Model Handoff',
    description: 'Automatically promote Sonnet when distillation trials pass the handoff threshold.',
    section: 'Knowledge Injection',
    type: 'boolean',
    defaultValue: false,
  },
  {
    key: 'max_exemplars_per_prompt',
    label: 'Max Exemplars per Prompt',
    description: 'Maximum number of exemplars to inject into a single agent prompt.',
    section: 'Knowledge Injection',
    type: 'number',
    min: 1,
    max: 20,
    step: 1,
    defaultValue: 5,
  },
  {
    key: 'injection_strategy',
    label: 'Injection Strategy',
    description: 'How exemplars are selected for injection: most relevant, most recent, or highest scored.',
    section: 'Knowledge Injection',
    type: 'select',
    options: ['relevance', 'recency', 'score'],
    defaultValue: 'relevance',
  },
];

const SECTIONS = ['Signal Collection', 'Pattern Processing', 'Knowledge Injection'];

export default function LearningSettingsPage() {
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/learning/config');
      if (!res.ok) throw new Error('Failed to fetch learning configuration');
      const data = await res.json();
      const configMap: Record<string, any> = {};
      const entries: ConfigEntry[] = Array.isArray(data) ? data : data.configs || [];
      for (const entry of entries) {
        configMap[entry.config_key] = entry.config_value;
      }
      setConfigs(configMap);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const getConfigValue = (key: string, defaultValue: any): any => {
    if (configs[key] === undefined) return defaultValue;
    const val = configs[key];
    // Config values are stored as JSONB, may be wrapped in an object
    if (typeof val === 'object' && val !== null && 'value' in val) {
      return val.value;
    }
    return val;
  };

  const updateConfig = async (key: string, value: any) => {
    setSaving(key);
    setLastSaved(null);
    try {
      const res = await fetch('/api/learning/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_key: key, config_value: { value } }),
      });
      if (!res.ok) throw new Error('Failed to update configuration');
      setConfigs((prev) => ({ ...prev, [key]: { value } }));
      setLastSaved(key);
      setTimeout(() => setLastSaved(null), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const renderControl = (toggle: ToggleConfig) => {
    const value = getConfigValue(toggle.key, toggle.defaultValue);
    const isSaving = saving === toggle.key;
    const justSaved = lastSaved === toggle.key;

    if (toggle.type === 'boolean') {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateConfig(toggle.key, !value)}
            disabled={isSaving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              value ? 'bg-blue-600' : 'bg-gray-300'
            } ${isSaving ? 'opacity-50' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                value ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-xs text-muted-foreground">
            {isSaving ? 'Saving...' : justSaved ? 'Saved' : value ? 'On' : 'Off'}
          </span>
        </div>
      );
    }

    if (toggle.type === 'number') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={toggle.min}
            max={toggle.max}
            step={toggle.step}
            value={value}
            onChange={(e) => {
              const numVal = parseFloat(e.target.value);
              if (!isNaN(numVal)) {
                updateConfig(toggle.key, numVal);
              }
            }}
            disabled={isSaving}
            className="w-20 rounded border px-2 py-1 text-sm bg-background disabled:opacity-50"
          />
          {toggle.unit && (
            <span className="text-xs text-muted-foreground">{toggle.unit}</span>
          )}
          {isSaving && <span className="text-xs text-muted-foreground">Saving...</span>}
          {justSaved && <span className="text-xs text-green-600">Saved</span>}
        </div>
      );
    }

    if (toggle.type === 'select') {
      return (
        <div className="flex items-center gap-2">
          <select
            value={value}
            onChange={(e) => updateConfig(toggle.key, e.target.value)}
            disabled={isSaving}
            className="rounded border px-2 py-1 text-sm bg-background disabled:opacity-50"
          >
            {toggle.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
          {isSaving && <span className="text-xs text-muted-foreground">Saving...</span>}
          {justSaved && <span className="text-xs text-green-600">Saved</span>}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Learning Settings</h1>
        <p className="text-muted-foreground">
          Configure how the system collects signals, detects patterns, and injects knowledge
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading learning configuration...</p>
      ) : (
        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const toggles = TOGGLE_DEFINITIONS.filter((t) => t.section === section);
            const enabledCount = toggles.filter(
              (t) => t.type === 'boolean' && getConfigValue(t.key, t.defaultValue) === true
            ).length;
            const booleanCount = toggles.filter((t) => t.type === 'boolean').length;

            return (
              <div key={section} className="rounded-lg border">
                <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
                  <div>
                    <h2 className="text-lg font-semibold">{section}</h2>
                    {booleanCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {enabledCount} of {booleanCount} features enabled
                      </p>
                    )}
                  </div>
                </div>
                <div className="divide-y">
                  {toggles.map((toggle) => (
                    <div
                      key={toggle.key}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex-1 pr-4">
                        <p className="text-sm font-medium">{toggle.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {toggle.description}
                        </p>
                      </div>
                      {renderControl(toggle)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Reset to Defaults */}
          <div className="rounded-lg border border-dashed p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Reset to Defaults</p>
                <p className="text-xs text-muted-foreground">
                  Restore all learning settings to their default values
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!confirm('Reset all learning settings to defaults? This cannot be undone.')) return;
                  for (const toggle of TOGGLE_DEFINITIONS) {
                    await updateConfig(toggle.key, toggle.defaultValue);
                  }
                }}
                className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 transition-colors"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
