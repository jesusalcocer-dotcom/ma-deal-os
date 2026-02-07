'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface Entry {
  id: string;
  entry_text: string;
  entry_type: string;
  status: string;
  created_at: string;
}

function entryTypeIcon(type: string): string {
  switch (type) {
    case 'dd_finding': return 'DD';
    case 'client_response': return 'CL';
    case 'system': return 'SYS';
    default: return 'MAN';
  }
}

export function ScheduleDetail({ dealId, scheduleId }: { dealId: string; scheduleId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/deals/${dealId}/disclosure-schedules/${scheduleId}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.disclosure_entries || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dealId, scheduleId]);

  if (loading) return <p className="text-xs text-muted-foreground">Loading entries...</p>;
  if (entries.length === 0) return <p className="text-xs text-muted-foreground">No entries yet</p>;

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-2 rounded border p-2 text-sm">
          <Badge variant="outline" className="text-xs shrink-0">
            {entryTypeIcon(entry.entry_type)}
          </Badge>
          <div className="flex-1">
            <p>{entry.entry_text}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Status: {entry.status}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
