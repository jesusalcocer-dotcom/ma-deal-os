'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface Stats {
  pending_count: number;
  by_tier: { 1: number; 2: number; 3: number };
  avg_resolution_ms: number;
  recently_approved: number;
}

export function QueueStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/approval-queue/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) return null;

  const avgMinutes = stats.avg_resolution_ms > 0
    ? Math.round(stats.avg_resolution_ms / 60000)
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold">{stats.pending_count}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Tier 2 (Approve)</p>
          <p className="text-2xl font-bold">{stats.by_tier[2]}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Tier 3 (Review)</p>
          <p className="text-2xl font-bold">{stats.by_tier[3]}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Avg Resolution</p>
          <p className="text-2xl font-bold">{avgMinutes > 0 ? `${avgMinutes}m` : '--'}</p>
        </CardContent>
      </Card>
    </div>
  );
}
