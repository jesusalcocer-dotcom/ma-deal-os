'use client';

import { useEffect, useState, useCallback } from 'react';

interface DashboardData {
  activePatterns: number;
  retiredPatterns: number;
  avgScore: number;
  scoreImprovement: number;
  humanCorrections: number;
  metaInterventions: number;
  dealsProcessed: number;
  recentEvents: AuditEvent[];
  velocityData: VelocityEntry[];
  spendData: SpendEntry[];
  monthlyTotalSpend: number;
}

interface AuditEvent {
  id: string;
  event_type: string;
  actor: string;
  entity_type: string;
  description: string;
  created_at: string;
}

interface VelocityEntry {
  date: string;
  avgScore: number;
  count: number;
}

interface SpendEntry {
  agentType: string;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  activations: number;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatEventType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAgentType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LearningDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/learning/dashboard');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Learning Dashboard</h1>
        <p className="text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Learning Dashboard</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Failed to load dashboard</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={fetchDashboard}
            className="mt-2 rounded border border-red-300 px-3 py-1 text-sm hover:bg-red-100 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const scoreColor =
    data.avgScore >= 0.8
      ? 'text-green-600'
      : data.avgScore >= 0.6
        ? 'text-yellow-600'
        : 'text-red-600';

  const improvementColor =
    data.scoreImprovement > 0
      ? 'text-green-600'
      : data.scoreImprovement < 0
        ? 'text-red-600'
        : 'text-gray-500';

  const improvementPrefix = data.scoreImprovement > 0 ? '+' : '';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Learning Dashboard</h1>
        <p className="text-muted-foreground">
          System-wide learning metrics, patterns, and agent performance
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Active Patterns</p>
          <p className="text-2xl font-bold text-blue-600">
            {data.activePatterns}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Retired Patterns</p>
          <p className="text-2xl font-bold text-gray-500">
            {data.retiredPatterns}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Avg Agent Score</p>
          <p className={`text-2xl font-bold ${scoreColor}`}>
            {(data.avgScore * 100).toFixed(1)}%
          </p>
          {data.scoreImprovement !== 0 && (
            <p className={`text-xs mt-0.5 ${improvementColor}`}>
              {improvementPrefix}
              {(data.scoreImprovement * 100).toFixed(1)}% trend
            </p>
          )}
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Meta Interventions</p>
          <p className="text-2xl font-bold text-orange-600">
            {data.metaInterventions}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Deals Processed</p>
          <p className="text-2xl font-bold">{data.dealsProcessed}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Spend This Month</p>
          <p className="text-2xl font-bold text-emerald-600">
            ${data.monthlyTotalSpend.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Two-column layout: Events Feed + Score Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Events Feed */}
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3 bg-muted/30">
            <h2 className="text-lg font-semibold">Recent Events</h2>
            <p className="text-xs text-muted-foreground">
              Latest learning system activity from the audit log
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y">
            {data.recentEvents.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No events recorded yet
              </div>
            ) : (
              data.recentEvents.map((event) => (
                <div key={event.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {formatEventType(event.event_type)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {formatRelativeTime(event.created_at)}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {event.entity_type}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                      {event.actor}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Score Velocity Table */}
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3 bg-muted/30">
            <h2 className="text-lg font-semibold">Score Velocity</h2>
            <p className="text-xs text-muted-foreground">
              Average agent evaluation scores by day (last 30 days)
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data.velocityData.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No evaluation data yet
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                      Avg Score
                    </th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                      Evals
                    </th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                      Bar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.velocityData.map((entry) => {
                    const pct = Math.round(entry.avgScore * 100);
                    const barColor =
                      pct >= 80
                        ? 'bg-green-500'
                        : pct >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500';
                    return (
                      <tr key={entry.date}>
                        <td className="px-4 py-2 font-mono text-xs">
                          {entry.date}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {pct}%
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {entry.count}
                        </td>
                        <td className="px-4 py-2">
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${barColor}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Spend Breakdown Table */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3 bg-muted/30">
          <h2 className="text-lg font-semibold">Agent Spend Breakdown</h2>
          <p className="text-xs text-muted-foreground">
            Cost and token usage by agent type this month
          </p>
        </div>
        {data.spendData.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No activations recorded this month
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Agent Type
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                    Activations
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                    Input Tokens
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                    Output Tokens
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                    Total Cost
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.spendData.map((entry) => {
                  const sharePct =
                    data.monthlyTotalSpend > 0
                      ? Math.round(
                          (entry.totalCost / data.monthlyTotalSpend) * 100
                        )
                      : 0;
                  return (
                    <tr key={entry.agentType} className="hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium">
                        {formatAgentType(entry.agentType)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {entry.activations.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {entry.totalInputTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {entry.totalOutputTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        ${entry.totalCost.toFixed(4)}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-emerald-500"
                              style={{
                                width: `${Math.min(sharePct, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {sharePct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right">
                    {data.spendData
                      .reduce((s, e) => s + e.activations, 0)
                      .toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {data.spendData
                      .reduce((s, e) => s + e.totalInputTokens, 0)
                      .toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {data.spendData
                      .reduce((s, e) => s + e.totalOutputTokens, 0)
                      .toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    ${data.monthlyTotalSpend.toFixed(4)}
                  </td>
                  <td className="px-4 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
