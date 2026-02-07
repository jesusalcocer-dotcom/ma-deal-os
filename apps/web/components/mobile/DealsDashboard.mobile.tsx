'use client';

import { useEffect, useState, useCallback } from 'react';
import { DealStatusCardMobile } from './DealStatusCard.mobile';

interface Deal {
  id: string;
  name: string;
  status: string;
  deal_type: string;
  parameters?: any;
}

export function DealsDashboardMobile() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch('/api/deals');
      const data = await res.json();
      setDeals(data.deals || []);
    } catch {
      // API may not have data yet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDeals();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Active Deals</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-sm text-primary disabled:opacity-50 min-h-[44px] px-2"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading deals...</p>
      ) : deals.length === 0 ? (
        <p className="text-muted-foreground text-sm">No active deals.</p>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => (
            <DealStatusCardMobile key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
