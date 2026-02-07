'use client';
import { useEffect, useState, useCallback } from 'react';

interface ConfigEntry {
  id: string;
  config_key: string;
  config_value: any;
  updated_by: string | null;
  updated_at: string;
}

interface SpendData {
  total_cost_usd: number;
  total_activations: number;
  total_input_tokens: number;
  total_output_tokens: number;
  by_agent_type: Record<string, { cost: number; count: number }>;
  by_day: Array<{ date: string; cost: number; count: number }>;
}

interface SpendSettings {
  monthly_budget_cap: number;
  per_deal_budget_cap: number;
  budget_exceeded_behavior: 'pause' | 'warn' | 'downgrade';
  alert_threshold_pct: number;
  track_by_agent: boolean;
  track_by_deal: boolean;
}

const DEFAULT_SETTINGS: SpendSettings = {
  monthly_budget_cap: 500,
  per_deal_budget_cap: 50,
  budget_exceeded_behavior: 'warn',
  alert_threshold_pct: 80,
  track_by_agent: true,
  track_by_deal: true,
};

const BEHAVIOR_OPTIONS: { value: SpendSettings['budget_exceeded_behavior']; label: string; description: string }[] = [
  { value: 'pause', label: 'Pause Operations', description: 'Stop all agent activations until budget resets or is increased' },
  { value: 'warn', label: 'Warn Only', description: 'Continue operations but show warnings in the dashboard' },
  { value: 'downgrade', label: 'Downgrade Models', description: 'Automatically switch to cheaper models (Sonnet/Haiku) when budget is exceeded' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

export default function SpendControlsPage() {
  const [settings, setSettings] = useState<SpendSettings>(DEFAULT_SETTINGS);
  const [spendData, setSpendData] = useState<SpendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/learning/config');
      if (!res.ok) throw new Error('Failed to fetch configuration');
      const data = await res.json();
      const entries: ConfigEntry[] = Array.isArray(data) ? data : data.configs || [];

      const newSettings = { ...DEFAULT_SETTINGS };
      for (const entry of entries) {
        const val = typeof entry.config_value === 'object' && entry.config_value !== null && 'value' in entry.config_value
          ? entry.config_value.value
          : entry.config_value;

        if (entry.config_key in DEFAULT_SETTINGS) {
          (newSettings as any)[entry.config_key] = val;
        }
      }
      setSettings(newSettings);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load spend settings');
    }
  }, []);

  const fetchSpendData = useCallback(async () => {
    try {
      // Get current month date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const res = await fetch(
        `/api/learning/dashboard?from=${encodeURIComponent(startOfMonth)}&to=${encodeURIComponent(endOfMonth)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSpendData(data);
      }
      // Dashboard endpoint may not exist yet, that's fine
    } catch {
      // Silently fail - spend data is optional
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchSpendData()]).finally(() => setLoading(false));
  }, [fetchSettings, fetchSpendData]);

  const updateSetting = async (key: keyof SpendSettings, value: any) => {
    setSaving(key);
    setLastSaved(null);
    try {
      const res = await fetch('/api/learning/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_key: key, config_value: { value } }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setSettings((prev) => ({ ...prev, [key]: value }));
      setLastSaved(key);
      setTimeout(() => setLastSaved(null), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const budgetUsedPct = spendData && settings.monthly_budget_cap > 0
    ? Math.min(100, (spendData.total_cost_usd / settings.monthly_budget_cap) * 100)
    : 0;

  const budgetBarColor = budgetUsedPct >= 100
    ? 'bg-red-500'
    : budgetUsedPct >= settings.alert_threshold_pct
      ? 'bg-yellow-500'
      : 'bg-green-500';

  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Spend Controls</h1>
        <p className="text-muted-foreground">
          Set budget caps, monitor AI spend, and configure behavior when budgets are exceeded
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
        <p className="text-muted-foreground">Loading spend data...</p>
      ) : (
        <div className="space-y-6">
          {/* Current Month Overview */}
          <div className="rounded-lg border p-5">
            <h2 className="text-lg font-semibold mb-4">
              {currentMonthName} Overview
            </h2>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  Budget Used: {formatCurrency(spendData?.total_cost_usd ?? 0)} of {formatCurrency(settings.monthly_budget_cap)}
                </span>
                <span className="text-sm font-medium">{budgetUsedPct.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${budgetBarColor}`}
                  style={{ width: `${budgetUsedPct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Total Spend</p>
                <p className="text-xl font-bold">
                  {formatCurrency(spendData?.total_cost_usd ?? 0)}
                </p>
              </div>
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Activations</p>
                <p className="text-xl font-bold">{spendData?.total_activations ?? 0}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Input Tokens</p>
                <p className="text-xl font-bold">
                  {formatTokens(spendData?.total_input_tokens ?? 0)}
                </p>
              </div>
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Output Tokens</p>
                <p className="text-xl font-bold">
                  {formatTokens(spendData?.total_output_tokens ?? 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Spend by Agent Type */}
          {spendData && Object.keys(spendData.by_agent_type).length > 0 && (
            <div className="rounded-lg border p-5">
              <h2 className="text-lg font-semibold mb-3">Spend by Agent Type</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Agent Type</th>
                    <th className="text-right py-2 font-medium">Activations</th>
                    <th className="text-right py-2 font-medium">Cost</th>
                    <th className="text-right py-2 font-medium">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(spendData.by_agent_type)
                    .sort(([, a], [, b]) => b.cost - a.cost)
                    .map(([agentType, stats]) => (
                      <tr key={agentType} className="border-b last:border-0">
                        <td className="py-2 font-medium">
                          {agentType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </td>
                        <td className="py-2 text-right">{stats.count}</td>
                        <td className="py-2 text-right">{formatCurrency(stats.cost)}</td>
                        <td className="py-2 text-right">
                          {spendData.total_cost_usd > 0
                            ? ((stats.cost / spendData.total_cost_usd) * 100).toFixed(1)
                            : '0'}
                          %
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Daily Spend */}
          {spendData && spendData.by_day.length > 0 && (
            <div className="rounded-lg border p-5">
              <h2 className="text-lg font-semibold mb-3">Daily Spend</h2>
              <div className="space-y-1">
                {spendData.by_day.slice(-14).map((day) => {
                  const maxDayCost = Math.max(...spendData.by_day.map((d) => d.cost), 1);
                  const widthPct = (day.cost / maxDayCost) * 100;
                  return (
                    <div key={day.date} className="flex items-center gap-3 text-sm">
                      <span className="w-24 text-muted-foreground shrink-0">
                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <span className="w-20 text-right shrink-0">{formatCurrency(day.cost)}</span>
                      <span className="w-12 text-right text-muted-foreground shrink-0">
                        {day.count}x
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Budget Settings */}
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3 bg-muted/30">
              <h2 className="text-lg font-semibold">Budget Caps</h2>
            </div>
            <div className="divide-y">
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium">Monthly Budget Cap</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Maximum total AI spend per calendar month across all deals
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={settings.monthly_budget_cap}
                    onChange={(e) => updateSetting('monthly_budget_cap', parseFloat(e.target.value) || 0)}
                    disabled={saving === 'monthly_budget_cap'}
                    className="w-28 rounded border px-2 py-1 text-sm bg-background disabled:opacity-50"
                  />
                  {saving === 'monthly_budget_cap' && <span className="text-xs text-muted-foreground">Saving...</span>}
                  {lastSaved === 'monthly_budget_cap' && <span className="text-xs text-green-600">Saved</span>}
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium">Per-Deal Budget Cap</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Maximum AI spend per individual deal
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={settings.per_deal_budget_cap}
                    onChange={(e) => updateSetting('per_deal_budget_cap', parseFloat(e.target.value) || 0)}
                    disabled={saving === 'per_deal_budget_cap'}
                    className="w-28 rounded border px-2 py-1 text-sm bg-background disabled:opacity-50"
                  />
                  {saving === 'per_deal_budget_cap' && <span className="text-xs text-muted-foreground">Saving...</span>}
                  {lastSaved === 'per_deal_budget_cap' && <span className="text-xs text-green-600">Saved</span>}
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium">Alert Threshold</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Show warnings when spend reaches this percentage of the monthly cap
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={50}
                    max={100}
                    step={5}
                    value={settings.alert_threshold_pct}
                    onChange={(e) => updateSetting('alert_threshold_pct', parseInt(e.target.value) || 80)}
                    disabled={saving === 'alert_threshold_pct'}
                    className="w-20 rounded border px-2 py-1 text-sm bg-background disabled:opacity-50"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  {saving === 'alert_threshold_pct' && <span className="text-xs text-muted-foreground">Saving...</span>}
                  {lastSaved === 'alert_threshold_pct' && <span className="text-xs text-green-600">Saved</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Budget Exceeded Behavior */}
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3 bg-muted/30">
              <h2 className="text-lg font-semibold">When Budget Is Exceeded</h2>
            </div>
            <div className="p-4 space-y-3">
              {BEHAVIOR_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    settings.budget_exceeded_behavior === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="budget_exceeded_behavior"
                    value={option.value}
                    checked={settings.budget_exceeded_behavior === option.value}
                    onChange={() => updateSetting('budget_exceeded_behavior', option.value)}
                    disabled={saving === 'budget_exceeded_behavior'}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </label>
              ))}
              {saving === 'budget_exceeded_behavior' && (
                <p className="text-xs text-muted-foreground">Saving...</p>
              )}
              {lastSaved === 'budget_exceeded_behavior' && (
                <p className="text-xs text-green-600">Saved</p>
              )}
            </div>
          </div>

          {/* Tracking Toggles */}
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3 bg-muted/30">
              <h2 className="text-lg font-semibold">Tracking Options</h2>
            </div>
            <div className="divide-y">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium">Track by Agent Type</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Break down spend by agent type (manager, specialist, observer, etc.)
                  </p>
                </div>
                <button
                  onClick={() => updateSetting('track_by_agent', !settings.track_by_agent)}
                  disabled={saving === 'track_by_agent'}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.track_by_agent ? 'bg-blue-600' : 'bg-gray-300'
                  } ${saving === 'track_by_agent' ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.track_by_agent ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium">Track by Deal</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Break down spend by individual deal for per-deal budget enforcement
                  </p>
                </div>
                <button
                  onClick={() => updateSetting('track_by_deal', !settings.track_by_deal)}
                  disabled={saving === 'track_by_deal'}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.track_by_deal ? 'bg-blue-600' : 'bg-gray-300'
                  } ${saving === 'track_by_deal' ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.track_by_deal ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
