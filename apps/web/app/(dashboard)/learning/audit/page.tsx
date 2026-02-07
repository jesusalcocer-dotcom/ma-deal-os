'use client';

import { useEffect, useState, useCallback } from 'react';

interface AuditEntry {
  id: string;
  action: string;
  component: string;
  details: any;
  actor: string | null;
  deal_id: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  signal_collected: 'bg-blue-100 text-blue-700',
  pattern_detected: 'bg-purple-100 text-purple-700',
  pattern_promoted: 'bg-green-100 text-green-700',
  pattern_demoted: 'bg-red-100 text-red-700',
  exemplar_stored: 'bg-indigo-100 text-indigo-700',
  distillation_started: 'bg-yellow-100 text-yellow-700',
  distillation_completed: 'bg-green-100 text-green-700',
  handoff_executed: 'bg-emerald-100 text-emerald-700',
  handoff_reverted: 'bg-red-100 text-red-700',
  reflection_run: 'bg-cyan-100 text-cyan-700',
  config_changed: 'bg-orange-100 text-orange-700',
  consistency_check: 'bg-teal-100 text-teal-700',
};

const ACTION_OPTIONS = [
  'signal_collected',
  'pattern_detected',
  'pattern_promoted',
  'pattern_demoted',
  'exemplar_stored',
  'distillation_started',
  'distillation_completed',
  'handoff_executed',
  'handoff_reverted',
  'reflection_run',
  'config_changed',
  'consistency_check',
];

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function truncateDetails(details: any, maxLength: number = 120): string {
  if (!details) return '--';
  const str = typeof details === 'string' ? details : JSON.stringify(details);
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

export default function LearningAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [componentFilter, setComponentFilter] = useState<string>('');
  const [limit, setLimit] = useState(50);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [components, setComponents] = useState<string[]>([]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (actionFilter) params.set('action', actionFilter);
      if (componentFilter) params.set('component', componentFilter);

      const res = await fetch(`/api/learning/audit?${params}`);
      if (!res.ok) throw new Error('Failed to fetch audit log');
      const data = await res.json();

      setEntries(data.entries || []);
      setTotal(data.count || 0);

      // Extract unique components for filter dropdown
      const uniqueComponents = Array.from(
        new Set((data.entries || []).map((e: AuditEntry) => e.component).filter(Boolean))
      ) as string[];
      if (uniqueComponents.length > components.length) {
        setComponents(uniqueComponents);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load audit log';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, componentFilter, limit, components.length]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleLoadMore = () => {
    setLimit((prev) => Math.min(prev + 50, 200));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Learning Audit Trail</h1>
        <p className="text-muted-foreground">
          Complete log of all learning system actions: signals, patterns, distillation events, and configuration changes
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

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Action
          </label>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setLimit(50);
            }}
            className="rounded border px-2 py-1.5 text-sm bg-background"
          >
            <option value="">All Actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {formatAction(a)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Component
          </label>
          <select
            value={componentFilter}
            onChange={(e) => {
              setComponentFilter(e.target.value);
              setLimit(50);
            }}
            className="rounded border px-2 py-1.5 text-sm bg-background"
          >
            <option value="">All Components</option>
            {components.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto self-end">
          <span className="text-xs text-muted-foreground">
            Showing {entries.length} of {total ?? '?'} entries
          </span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-muted-foreground">Loading audit log...</p>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground">
            No audit log entries found. Entries are created automatically as the learning system operates.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium w-44">Time</th>
                <th className="text-left px-4 py-3 font-medium w-44">Action</th>
                <th className="text-left px-4 py-3 font-medium w-40">Component</th>
                <th className="text-left px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isExpanded = expandedRow === entry.id;
                const badgeColor = ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-700';

                return (
                  <tr
                    key={entry.id}
                    className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                    onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                  >
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(entry.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}
                      >
                        {formatAction(entry.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {entry.component || '--'}
                    </td>
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <pre className="whitespace-pre-wrap text-xs font-mono bg-muted/30 rounded p-2 max-h-60 overflow-y-auto">
                          {JSON.stringify(entry.details, null, 2) || '--'}
                        </pre>
                      ) : (
                        <span className="text-muted-foreground">
                          {truncateDetails(entry.details)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Load More */}
      {entries.length > 0 && entries.length < (total ?? 0) && limit < 200 && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="rounded border px-4 py-2 text-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
