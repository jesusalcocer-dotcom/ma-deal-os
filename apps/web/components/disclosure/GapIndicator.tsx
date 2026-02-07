'use client';

import { Badge } from '@/components/ui/badge';

export function GapIndicator({ issues }: { issues: any[] }) {
  if (!issues || issues.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {issues.map((issue: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <Badge variant="destructive" className="text-xs">Gap</Badge>
          <span className="text-muted-foreground">{issue.description || issue}</span>
        </div>
      ))}
    </div>
  );
}
