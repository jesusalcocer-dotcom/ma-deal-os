'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Pattern {
  id: string;
  agent_type: string | null;
  pattern_type: string;
  description: string;
  condition: Record<string, unknown>;
  instruction: string;
  confidence: number;
  supporting_count: number;
  contradicting_count: number;
  lifecycle_stage: string;
  version: number;
  last_applied_at: string | null;
  created_at: string;
}

const LIFECYCLE_STAGES = ['all', 'proposed', 'confirmed', 'established', 'hard_rule', 'retired'] as const;

const AGENT_TYPES = [
  'all',
  'term_sheet_parser',
  'checklist_generator',
  'document_drafter',
  'provision_segmenter',
  'dd_analyst',
  'negotiation_advisor',
  'closing_coordinator',
] as const;

function lifecycleBadgeColor(stage: string): string {
  switch (stage) {
    case 'proposed':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    case 'confirmed':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'established':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'hard_rule':
      return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'retired':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'decayed':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-300';
  }
}

function confidenceBarColor(confidence: number): string {
  if (confidence >= 0.7) return 'bg-green-500';
  if (confidence >= 0.4) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function PatternsListPage() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [lifecycleStage, setLifecycleStage] = useState<string>('all');
  const [agentType, setAgentType] = useState<string>('all');
  const [minConfidence, setMinConfidence] = useState<number>(0);

  const fetchPatterns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (lifecycleStage !== 'all') params.set('lifecycle_stage', lifecycleStage);
      if (agentType !== 'all') params.set('agent_type', agentType);
      if (minConfidence > 0) params.set('min_confidence', minConfidence.toString());

      const res = await fetch(`/api/learning/patterns?${params}`);
      if (!res.ok) throw new Error('Failed to fetch patterns');
      const data = await res.json();
      setPatterns(data.patterns || []);
      setCount(data.count ?? (data.patterns || []).length);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load patterns';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [lifecycleStage, agentType, minConfidence]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pattern Explorer</h1>
        <p className="text-muted-foreground">
          Browse and filter learned patterns discovered by the reflection engine
        </p>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 rounded-lg border p-4 bg-muted/20">
        <div className="flex flex-wrap items-end gap-4">
          {/* Lifecycle Stage */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Lifecycle Stage
            </label>
            <select
              value={lifecycleStage}
              onChange={(e) => setLifecycleStage(e.target.value)}
              className="rounded border px-3 py-1.5 text-sm bg-background"
            >
              {LIFECYCLE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage === 'all' ? 'All Stages' : stage.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Agent Type */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Agent Type
            </label>
            <select
              value={agentType}
              onChange={(e) => setAgentType(e.target.value)}
              className="rounded border px-3 py-1.5 text-sm bg-background"
            >
              {AGENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Agents' : type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Min Confidence */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Min Confidence: {(minConfidence * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          {/* Count badge */}
          <div className="text-sm text-muted-foreground">
            {count} pattern{count !== 1 ? 's' : ''}
          </div>
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

      {/* Content */}
      {loading ? (
        <p className="text-muted-foreground">Loading patterns...</p>
      ) : patterns.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground">No patterns found matching the current filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {patterns.map((pattern) => (
            <div
              key={pattern.id}
              onClick={() => router.push(`/learning/patterns/${pattern.id}`)}
              className="cursor-pointer rounded-lg border p-4 transition-shadow hover:shadow-md"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <span
                  className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${lifecycleBadgeColor(pattern.lifecycle_stage)}`}
                >
                  {pattern.lifecycle_stage.replace('_', ' ')}
                </span>
                <span className="text-xs text-muted-foreground">
                  v{pattern.version}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm font-medium mb-3 line-clamp-3">
                {pattern.description}
              </p>

              {/* Confidence bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-mono font-medium">
                    {(pattern.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full transition-all ${confidenceBarColor(pattern.confidence)}`}
                    style={{ width: `${Math.min(pattern.confidence * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Meta row */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {pattern.agent_type
                    ? pattern.agent_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                    : 'All Agents'}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-green-600">
                    +{pattern.supporting_count ?? 0}
                  </span>
                  <span className="text-red-600">
                    -{pattern.contradicting_count ?? 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
