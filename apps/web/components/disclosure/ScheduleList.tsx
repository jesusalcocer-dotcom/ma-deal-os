'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ScheduleDetail } from './ScheduleDetail';
import { GapIndicator } from './GapIndicator';

interface Schedule {
  id: string;
  schedule_number: string;
  schedule_title: string;
  related_rep_section: string | null;
  status: string;
  entry_count: number;
  cross_reference_issues: any[];
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'populated':
    case 'cross_referenced':
    case 'attorney_reviewed':
    case 'final':
      return 'default';
    case 'partially_populated':
    case 'client_responding':
      return 'secondary';
    default:
      return 'secondary';
  }
}

export function ScheduleList({ schedules, dealId }: { schedules: Schedule[]; dealId: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (schedules.length === 0) {
    return (
      <div className="rounded-lg border p-12 text-center">
        <p className="text-muted-foreground">
          No disclosure schedules generated yet. Click &quot;Generate&quot; to create them from the SPA.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => {
        const isExpanded = expandedId === schedule.id;
        return (
          <Card key={schedule.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-sm font-mono">{schedule.schedule_number}</CardTitle>
                    <Badge variant={statusBadgeVariant(schedule.status)} className="text-xs">
                      {schedule.status}
                    </Badge>
                  </div>
                  <p className="text-sm">{schedule.schedule_title}</p>
                  {schedule.related_rep_section && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Ref: {schedule.related_rep_section}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {schedule.entry_count} entries
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedId(isExpanded ? null : schedule.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-0">
                <ScheduleDetail dealId={dealId} scheduleId={schedule.id} />
                <GapIndicator issues={schedule.cross_reference_issues} />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
