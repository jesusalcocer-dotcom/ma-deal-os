'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { PositionTable } from '@/components/negotiation/PositionTable';

export default function NegotiationPage() {
  const params = useParams();
  const dealId = params.dealId as string;
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/negotiation/positions`);
      const data = await res.json();
      setPositions(Array.isArray(data) ? data : []);
    } catch {
      // API may not have data
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Negotiation State</h1>
        <p className="text-muted-foreground">Track provision-level negotiation positions</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading positions...</p>
      ) : (
        <PositionTable positions={positions} />
      )}
    </div>
  );
}
