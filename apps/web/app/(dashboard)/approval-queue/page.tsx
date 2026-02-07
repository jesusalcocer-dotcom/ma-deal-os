'use client';

import { useEffect, useState, useCallback } from 'react';
import { QueueStats } from '@/components/approval-queue/QueueStats';
import { ApprovalCard } from '@/components/approval-queue/ApprovalCard';

interface Chain {
  id: string;
  deal_id: string;
  trigger_event_id?: string;
  summary: string;
  approval_tier: number;
  significance: number;
  status: string;
  created_at: string;
  proposed_actions: any[];
}

export default function ApprovalQueuePage() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchChains = useCallback(async () => {
    try {
      const res = await fetch('/api/approval-queue');
      const data = await res.json();
      setChains(data.chains || []);
      setTotal(data.total || 0);
    } catch {
      // API may not have data yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChains();
  }, [fetchChains]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Approval Queue</h1>
        <p className="text-muted-foreground">Review and approve pending actions</p>
      </div>

      <div className="mb-6">
        <QueueStats />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : chains.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground">No pending approvals. All caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{total} pending chain{total !== 1 ? 's' : ''}</p>
          {chains.map((chain) => (
            <ApprovalCard key={chain.id} chain={chain} onUpdate={fetchChains} />
          ))}
        </div>
      )}
    </div>
  );
}
