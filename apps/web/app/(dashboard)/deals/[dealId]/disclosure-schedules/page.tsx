'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScheduleList } from '@/components/disclosure/ScheduleList';

export default function DisclosureSchedulesPage() {
  const params = useParams();
  const dealId = params.dealId as string;
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/disclosure-schedules`);
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch {
      // API may not have data yet
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/disclosure-schedules/generate`, {
        method: 'POST',
      });
      await res.json();
      await fetchSchedules();
    } catch {
      // handle error
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Disclosure Schedules</h1>
          <p className="text-muted-foreground">Manage disclosure schedules for this deal</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating...' : 'Generate from SPA'}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <ScheduleList schedules={schedules} dealId={dealId} />
      )}
    </div>
  );
}
