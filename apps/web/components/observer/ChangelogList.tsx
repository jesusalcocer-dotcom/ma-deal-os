'use client';

import { useState } from 'react';

interface ChangelogEntry {
  id: string;
  change_type: string;
  file_path: string | null;
  description: string;
  diagnosis: string | null;
  prescribed_fix: string | null;
  git_commit_hash: string | null;
  test_results: any;
  confidence: string;
  reverted: boolean;
  reverted_at: string | null;
  needs_human_review: boolean;
  created_at: string;
}

interface ChangelogListProps {
  entries: ChangelogEntry[];
  onRevert?: (id: string) => void;
}

const changeTypeColors: Record<string, string> = {
  skill_update: 'bg-blue-100 text-blue-800',
  prompt_modification: 'bg-purple-100 text-purple-800',
  code_fix: 'bg-orange-100 text-orange-800',
  config_change: 'bg-green-100 text-green-800',
  diagnosis: 'bg-gray-100 text-gray-800',
};

const confidenceColors: Record<string, string> = {
  high: 'text-green-600',
  medium: 'text-yellow-600',
  low: 'text-red-600',
};

export function ChangelogList({ entries, onRevert }: ChangelogListProps) {
  const [reverting, setReverting] = useState<string | null>(null);

  const handleRevert = async (id: string) => {
    setReverting(id);
    try {
      const res = await fetch(`/api/observer/revert/${id}`, { method: 'POST' });
      if (res.ok && onRevert) {
        onRevert(id);
      }
    } catch {
      // Handle error silently
    } finally {
      setReverting(null);
    }
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border p-12 text-center">
        <p className="text-muted-foreground">No Observer changes recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`rounded-lg border p-4 ${entry.reverted ? 'opacity-50' : ''} ${entry.needs_human_review ? 'border-yellow-400' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${changeTypeColors[entry.change_type] || 'bg-gray-100 text-gray-800'}`}>
                  {entry.change_type.replace('_', ' ')}
                </span>
                <span className={`text-xs font-medium ${confidenceColors[entry.confidence] || ''}`}>
                  {entry.confidence} confidence
                </span>
                {entry.needs_human_review && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    needs review
                  </span>
                )}
                {entry.reverted && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                    reverted
                  </span>
                )}
              </div>

              <p className="text-sm font-medium mb-1">{entry.description}</p>

              {entry.file_path && (
                <p className="text-xs text-muted-foreground font-mono mb-1">
                  {entry.file_path}
                </p>
              )}

              {entry.diagnosis && (
                <p className="text-xs text-muted-foreground mt-1">
                  Diagnosis: {entry.diagnosis}
                </p>
              )}

              {entry.prescribed_fix && (
                <p className="text-xs text-muted-foreground mt-1">
                  Fix: {entry.prescribed_fix}
                </p>
              )}

              {entry.git_commit_hash && (
                <p className="text-xs font-mono text-muted-foreground mt-1">
                  Commit: {entry.git_commit_hash}
                </p>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                {new Date(entry.created_at).toLocaleString()}
              </p>
            </div>

            {!entry.reverted && onRevert && (
              <button
                onClick={() => handleRevert(entry.id)}
                disabled={reverting === entry.id}
                className="ml-4 px-3 py-1 text-xs border rounded hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
              >
                {reverting === entry.id ? 'Reverting...' : 'Revert'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
