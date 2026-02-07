'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChangelogList } from '@/components/observer/ChangelogList';

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

export default function ObserverDashboardPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'needs_review'>('all');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filter === 'needs_review') {
        params.set('needs_review', 'true');
      }
      const res = await fetch(`/api/observer/changelog?${params}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch {
      // API may not have data yet
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleRevert = () => {
    fetchEntries();
  };

  const stats = {
    total: entries.length,
    needsReview: entries.filter((e) => e.needs_human_review && !e.reverted).length,
    reverted: entries.filter((e) => e.reverted).length,
    skillUpdates: entries.filter((e) => e.change_type === 'skill_update').length,
    codeFixes: entries.filter((e) => e.change_type === 'code_fix').length,
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Observer Dashboard</h1>
        <p className="text-muted-foreground">
          Self-improvement changes made by the Observer Agent
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Changes</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Needs Review</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.needsReview}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Reverted</p>
          <p className="text-2xl font-bold text-red-600">{stats.reverted}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Skill Updates</p>
          <p className="text-2xl font-bold text-blue-600">{stats.skillUpdates}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Code Fixes</p>
          <p className="text-2xl font-bold text-orange-600">{stats.codeFixes}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded text-sm ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'border'}`}
        >
          All Changes
        </button>
        <button
          onClick={() => setFilter('needs_review')}
          className={`px-3 py-1 rounded text-sm ${filter === 'needs_review' ? 'bg-yellow-500 text-white' : 'border'}`}
        >
          Needs Review
        </button>
      </div>

      {/* Changelog */}
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <ChangelogList entries={entries} onRevert={handleRevert} />
      )}
    </div>
  );
}
