'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

interface Pattern {
  id: string;
  agent_type: string | null;
  pattern_type: string;
  description: string;
  condition: Record<string, unknown>;
  instruction: string;
  confidence: number;
  source_signals: string[];
  supporting_count: number;
  contradicting_count: number;
  lifecycle_stage: string;
  version: number;
  version_history: unknown[];
  last_applied_at: string | null;
  last_evaluated_at: string | null;
  created_at: string;
  updated_at: string;
}

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

function renderConditions(condition: Record<string, unknown>): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(condition)) {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (Array.isArray(value)) {
      lines.push(`${label} is one of: ${value.join(', ')}`);
    } else if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      if ('min' in obj && 'max' in obj) {
        lines.push(`${label} between ${obj.min} and ${obj.max}`);
      } else if ('min' in obj) {
        lines.push(`${label} >= ${obj.min}`);
      } else if ('max' in obj) {
        lines.push(`${label} <= ${obj.max}`);
      } else {
        lines.push(`${label}: ${JSON.stringify(value)}`);
      }
    } else {
      lines.push(`${label} is "${String(value)}"`);
    }
  }
  return lines.length > 0 ? lines : ['No specific conditions -- applies universally'];
}

export default function PatternDetailPage({
  params,
}: {
  params: Promise<{ patternId: string }>;
}) {
  const { patternId } = use(params);
  const router = useRouter();

  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit instruction modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInstruction, setEditInstruction] = useState('');
  const [saving, setSaving] = useState(false);

  // Retire confirm
  const [showRetireConfirm, setShowRetireConfirm] = useState(false);

  const fetchPattern = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all patterns and find by ID, since the API doesn't support single-pattern fetch
      const res = await fetch(`/api/learning/patterns?limit=100`);
      if (!res.ok) throw new Error('Failed to fetch patterns');
      const data = await res.json();
      const found = (data.patterns || []).find((p: Pattern) => p.id === patternId);
      if (!found) throw new Error('Pattern not found');
      setPattern(found);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load pattern';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [patternId]);

  useEffect(() => {
    fetchPattern();
  }, [fetchPattern]);

  const handleSaveInstruction = async () => {
    if (!pattern) return;
    setSaving(true);
    try {
      const res = await fetch('/api/learning/patterns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pattern.id, instruction: editInstruction }),
      });
      if (!res.ok) throw new Error('Failed to update instruction');
      const data = await res.json();
      setPattern(data.pattern);
      setShowEditModal(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRetire = async () => {
    if (!pattern) return;
    setSaving(true);
    try {
      const res = await fetch('/api/learning/patterns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pattern.id, lifecycle_stage: 'retired' }),
      });
      if (!res.ok) throw new Error('Failed to retire pattern');
      const data = await res.json();
      setPattern(data.pattern);
      setShowRetireConfirm(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retire';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading pattern...</p>
      </div>
    );
  }

  if (error || !pattern) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || 'Pattern not found'}
        </div>
        <button
          onClick={() => router.push('/learning/patterns')}
          className="mt-4 text-sm text-blue-600 underline hover:no-underline"
        >
          Back to patterns
        </button>
      </div>
    );
  }

  const conditions = renderConditions(
    typeof pattern.condition === 'object' && pattern.condition !== null
      ? (pattern.condition as Record<string, unknown>)
      : {}
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.push('/learning/patterns')}
        className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        &larr; Back to patterns
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-2">
          <h1 className="text-2xl font-bold flex-1">{pattern.description}</h1>
          <span
            className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${lifecycleBadgeColor(pattern.lifecycle_stage)}`}
          >
            {pattern.lifecycle_stage.replace('_', ' ')}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {pattern.agent_type
            ? pattern.agent_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            : 'All Agents'}{' '}
          &middot; {pattern.pattern_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </p>
      </div>

      {/* Confidence bar (large) */}
      <div className="mb-6 rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Confidence</span>
          <span className="text-2xl font-bold font-mono">
            {(pattern.confidence * 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-4 w-full rounded-full bg-gray-200">
          <div
            className={`h-4 rounded-full transition-all ${confidenceBarColor(pattern.confidence)}`}
            style={{ width: `${Math.min(pattern.confidence * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Applies When */}
      <div className="mb-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold mb-3">Applies When</h2>
        <ul className="space-y-1">
          {conditions.map((line, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground mt-0.5">&bull;</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Instruction */}
      <div className="mb-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold mb-2">Instruction (injected into prompts)</h2>
        <div className="rounded bg-muted/30 p-3 text-sm whitespace-pre-wrap font-mono leading-relaxed">
          {pattern.instruction}
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Supporting</p>
          <p className="text-xl font-bold text-green-600">
            {pattern.supporting_count ?? 0}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Contradicting</p>
          <p className="text-xl font-bold text-red-600">
            {pattern.contradicting_count ?? 0}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Created</p>
          <p className="text-sm font-medium">
            {pattern.created_at ? new Date(pattern.created_at).toLocaleDateString() : 'N/A'}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Last Applied</p>
          <p className="text-sm font-medium">
            {pattern.last_applied_at
              ? new Date(pattern.last_applied_at).toLocaleDateString()
              : 'Never'}
          </p>
        </div>
      </div>

      {/* Version */}
      <div className="mb-6 text-sm text-muted-foreground">
        Version {pattern.version}
        {pattern.updated_at && (
          <> &middot; Last updated {new Date(pattern.updated_at).toLocaleDateString()}</>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setEditInstruction(pattern.instruction);
            setShowEditModal(true);
          }}
          className="rounded border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Edit Instruction
        </button>
        <button
          onClick={() => setShowRetireConfirm(true)}
          disabled={pattern.lifecycle_stage === 'retired'}
          className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Retire Pattern
        </button>
      </div>

      {/* Edit Instruction Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-xl rounded-lg border bg-background p-6 shadow-lg mx-4">
            <h3 className="text-lg font-semibold mb-3">Edit Instruction</h3>
            <p className="text-sm text-muted-foreground mb-3">
              This text will be injected into agent prompts when this pattern applies.
            </p>
            <textarea
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
              rows={8}
              className="w-full rounded border bg-background p-3 text-sm font-mono resize-y"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="rounded border px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInstruction}
                disabled={saving || editInstruction === pattern.instruction}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retire Confirm Dialog */}
      {showRetireConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg mx-4">
            <h3 className="text-lg font-semibold mb-2">Retire Pattern?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Retiring this pattern will stop it from being injected into agent prompts.
              This action can be reversed by manually updating the lifecycle stage.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRetireConfirm(false)}
                className="rounded border px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRetire}
                disabled={saving}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Retiring...' : 'Retire'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline hover:no-underline">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
