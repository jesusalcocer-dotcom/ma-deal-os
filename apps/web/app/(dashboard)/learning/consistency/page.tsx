'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';

interface ConsistencyCheck {
  id: string;
  deal_id: string;
  check_type: string;
  source_entity_type: string;
  source_entity_id: string;
  conflicting_entity_type: string;
  conflicting_entity_id: string;
  description: string;
  severity: string;
  resolution: string | null;
  resolved_by: string | null;
  detected_at: string;
  resolved_at: string | null;
}

function severityBadgeColor(severity: string): string {
  switch (severity) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'low':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-300';
  }
}

function truncateId(id: string): string {
  if (!id) return '--';
  return id.length > 8 ? id.slice(0, 8) + '...' : id;
}

export default function ConsistencyLogPage() {
  const [checks, setChecks] = useState<ConsistencyCheck[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [resolvedFilter, setResolvedFilter] = useState<string>('all');

  const fetchChecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (resolvedFilter === 'resolved') params.set('resolved', 'true');
      if (resolvedFilter === 'unresolved') params.set('resolved', 'false');

      const res = await fetch(`/api/learning/signals/consistency?${params}`);
      if (!res.ok) throw new Error('Failed to fetch consistency checks');
      const data = await res.json();
      setChecks(data.consistency_checks || []);
      setCount(data.count ?? (data.consistency_checks || []).length);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load consistency checks';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [severityFilter, resolvedFilter]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Summary stats
  const highCount = checks.filter((c) => c.severity === 'high').length;
  const unresolvedCount = checks.filter((c) => !c.resolved_at).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Consistency Log</h1>
        <p className="text-muted-foreground">
          Cross-agent consistency checks and contradiction detection
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Checks</p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">High Severity</p>
          <p className="text-2xl font-bold text-red-600">{highCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Unresolved</p>
          <p className="text-2xl font-bold text-yellow-600">{unresolvedCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Resolved</p>
          <p className="text-2xl font-bold text-green-600">{checks.length - unresolvedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Severity
          </label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded border px-3 py-1.5 text-sm bg-background"
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Status
          </label>
          <select
            value={resolvedFilter}
            onChange={(e) => setResolvedFilter(e.target.value)}
            className="rounded border px-3 py-1.5 text-sm bg-background"
          >
            <option value="all">All</option>
            <option value="resolved">Resolved</option>
            <option value="unresolved">Unresolved</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline hover:no-underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-muted-foreground">Loading consistency checks...</p>
      ) : checks.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground">No consistency checks found matching the current filters.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Deal ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Severity</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => {
                const isExpanded = expandedId === check.id;
                const isResolved = !!check.resolved_at;

                return (
                  <Fragment key={check.id}>
                    <tr
                      onClick={() => toggleExpand(check.id)}
                      className={`border-b cursor-pointer transition-colors hover:bg-muted/20 ${
                        isExpanded ? 'bg-muted/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {check.detected_at
                          ? new Date(check.detected_at).toLocaleDateString()
                          : '--'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" title={check.deal_id}>
                        {truncateId(check.deal_id)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${severityBadgeColor(check.severity)}`}
                        >
                          {check.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate">
                        {check.description}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            isResolved
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {isResolved ? 'Resolved' : 'Unresolved'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className={`transition-transform inline-block ${isExpanded ? 'rotate-90' : ''}`}>
                          &#9654;
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b">
                        <td colSpan={6} className="px-4 py-4 bg-muted/5">
                          <div className="space-y-3">
                            {/* Contradiction details */}
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                                Contradiction Details
                              </h4>
                              <p className="text-sm">{check.description}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Source entity */}
                              <div className="rounded border p-3 bg-background">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Source Entity
                                </p>
                                <p className="text-sm font-medium">
                                  {check.source_entity_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                  {truncateId(check.source_entity_id)}
                                </p>
                              </div>

                              {/* Conflicting entity */}
                              <div className="rounded border p-3 bg-background">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Conflicting Entity
                                </p>
                                <p className="text-sm font-medium">
                                  {check.conflicting_entity_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                  {truncateId(check.conflicting_entity_id)}
                                </p>
                              </div>
                            </div>

                            {/* Resolution */}
                            {check.resolution && (
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                                  Resolution
                                </h4>
                                <p className="text-sm">{check.resolution}</p>
                                {check.resolved_by && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Resolved by: {check.resolved_by}
                                    {check.resolved_at && (
                                      <> on {new Date(check.resolved_at).toLocaleDateString()}</>
                                    )}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Meta */}
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>Check type: {check.check_type}</span>
                              <span>ID: {truncateId(check.id)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
