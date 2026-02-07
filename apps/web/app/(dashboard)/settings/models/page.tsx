'use client';
import { useEffect, useState, useCallback } from 'react';

interface RoutingConfig {
  id: string;
  task_type: string;
  current_model: string;
  distillation_status: string;
  exemplar_count: number;
  min_exemplars_for_testing: number;
  handoff_threshold: number;
  revert_threshold: number;
  spot_check_frequency: number;
  consecutive_low_scores: number;
  consecutive_high_scores: number;
  updated_at: string;
}

const MODEL_OPTIONS = ['opus', 'sonnet'] as const;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-700' },
  collecting: { label: 'Collecting', color: 'bg-blue-100 text-blue-700' },
  testing: { label: 'Testing', color: 'bg-yellow-100 text-yellow-700' },
  handed_off: { label: 'Handed Off', color: 'bg-green-100 text-green-700' },
};

function formatTaskType(taskType: string): string {
  return taskType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ModelRoutingPage() {
  const [configs, setConfigs] = useState<RoutingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/learning/routing');
      if (!res.ok) throw new Error('Failed to fetch routing configs');
      const data = await res.json();
      setConfigs(Array.isArray(data) ? data : data.configs || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load model routing configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const updateConfig = async (taskType: string, updates: Partial<RoutingConfig>) => {
    setSaving(taskType);
    try {
      const res = await fetch('/api/learning/routing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_type: taskType, ...updates }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setConfigs((prev) =>
        prev.map((c) => (c.task_type === taskType ? { ...c, ...updated } : c))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Model Routing</h1>
        <p className="text-muted-foreground">
          Configure which model handles each task type and manage Opus-to-Sonnet distillation
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
        <p className="text-muted-foreground">Loading routing configuration...</p>
      ) : configs.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground">
            No model routing configurations found. Configurations are created automatically when task types are registered.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Task Type</th>
                <th className="text-left px-4 py-3 font-medium">Current Model</th>
                <th className="text-left px-4 py-3 font-medium">Distillation Status</th>
                <th className="text-right px-4 py-3 font-medium">Exemplars</th>
                <th className="text-right px-4 py-3 font-medium">Min for Testing</th>
                <th className="text-right px-4 py-3 font-medium">Handoff Threshold</th>
                <th className="text-center px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => {
                const status = STATUS_LABELS[config.distillation_status] || STATUS_LABELS.not_started;
                const isExpanded = expandedRow === config.task_type;
                const isSaving = saving === config.task_type;
                const progress = config.min_exemplars_for_testing > 0
                  ? Math.min(100, Math.round((config.exemplar_count / config.min_exemplars_for_testing) * 100))
                  : 0;

                return (
                  <tr key={config.task_type} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {formatTaskType(config.task_type)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={config.current_model}
                        onChange={(e) => updateConfig(config.task_type, { current_model: e.target.value })}
                        disabled={isSaving}
                        className="rounded border px-2 py-1 text-sm bg-background disabled:opacity-50"
                      >
                        {MODEL_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>{config.exemplar_count}</span>
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{config.min_exemplars_for_testing}</td>
                    <td className="px-4 py-3 text-right">{(config.handoff_threshold * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setExpandedRow(isExpanded ? null : config.task_type)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {isExpanded ? 'Hide' : 'Configure'}
                      </button>
                    </td>
                    {isExpanded && (
                      <td colSpan={7} className="px-4 py-4 bg-muted/30">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Min Exemplars for Testing
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={config.min_exemplars_for_testing}
                              onChange={(e) =>
                                updateConfig(config.task_type, {
                                  min_exemplars_for_testing: parseInt(e.target.value) || 15,
                                })
                              }
                              disabled={isSaving}
                              className="w-full rounded border px-2 py-1 text-sm bg-background disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Handoff Threshold (0-1)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={1}
                              step={0.05}
                              value={config.handoff_threshold}
                              onChange={(e) =>
                                updateConfig(config.task_type, {
                                  handoff_threshold: parseFloat(e.target.value) || 0.85,
                                })
                              }
                              disabled={isSaving}
                              className="w-full rounded border px-2 py-1 text-sm bg-background disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Spot Check Frequency (every Nth call)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={config.spot_check_frequency}
                              onChange={(e) =>
                                updateConfig(config.task_type, {
                                  spot_check_frequency: parseInt(e.target.value) || 10,
                                })
                              }
                              disabled={isSaving}
                              className="w-full rounded border px-2 py-1 text-sm bg-background disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Revert Threshold (0-1)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={1}
                              step={0.05}
                              value={config.revert_threshold}
                              onChange={(e) =>
                                updateConfig(config.task_type, {
                                  revert_threshold: parseFloat(e.target.value) || 0.80,
                                })
                              }
                              disabled={isSaving}
                              className="w-full rounded border px-2 py-1 text-sm bg-background disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Consecutive Low Scores
                            </label>
                            <p className="text-sm">{config.consecutive_low_scores}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Consecutive High Scores
                            </label>
                            <p className="text-sm">{config.consecutive_high_scores}</p>
                          </div>
                        </div>
                        {config.updated_at && (
                          <p className="mt-3 text-xs text-muted-foreground">
                            Last updated: {new Date(config.updated_at).toLocaleString()}
                          </p>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      {configs.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Task Types</p>
            <p className="text-2xl font-bold">{configs.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Using Opus</p>
            <p className="text-2xl font-bold text-purple-600">
              {configs.filter((c) => c.current_model === 'opus').length}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Using Sonnet</p>
            <p className="text-2xl font-bold text-blue-600">
              {configs.filter((c) => c.current_model === 'sonnet').length}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Handed Off</p>
            <p className="text-2xl font-bold text-green-600">
              {configs.filter((c) => c.distillation_status === 'handed_off').length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
