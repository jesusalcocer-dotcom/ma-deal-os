'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { PositionHistory } from './PositionHistory';

interface Position {
  id: string;
  provision_type: string;
  provision_label: string;
  our_current_position: string | null;
  their_current_position: string | null;
  status: string;
  significance: number;
  category: string | null;
  position_history: any[];
}

function statusColor(status: string): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'agreed': return 'default';
    case 'impasse': return 'destructive';
    default: return 'secondary';
  }
}

function groupByCategory(positions: Position[]): Record<string, Position[]> {
  const groups: Record<string, Position[]> = {};
  for (const p of positions) {
    const cat = p.category || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  }
  return groups;
}

function categoryLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');
}

export function PositionTable({ positions }: { positions: Position[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const groups = groupByCategory(positions);

  if (positions.length === 0) {
    return (
      <div className="rounded-lg border p-12 text-center">
        <p className="text-muted-foreground">No negotiation positions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
            {categoryLabel(category)}
          </h3>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Provision</th>
                  <th className="text-left p-3 font-medium">Our Position</th>
                  <th className="text-left p-3 font-medium">Their Position</th>
                  <th className="text-center p-3 font-medium w-20">Status</th>
                  <th className="text-center p-3 font-medium w-16">Sig</th>
                </tr>
              </thead>
              <tbody>
                {items.map((pos) => {
                  const isExpanded = expandedId === pos.id;
                  return (
                    <>
                      <tr
                        key={pos.id}
                        className="border-b hover:bg-muted/30 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : pos.id)}
                      >
                        <td className="p-3 font-medium">{pos.provision_label}</td>
                        <td className="p-3 text-muted-foreground">{pos.our_current_position || '-'}</td>
                        <td className="p-3 text-muted-foreground">{pos.their_current_position || 'Awaiting'}</td>
                        <td className="p-3 text-center">
                          <Badge variant={statusColor(pos.status)} className="text-xs">
                            {pos.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-mono">{pos.significance}</td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${pos.id}-history`}>
                          <td colSpan={5} className="p-4 bg-muted/20">
                            <PositionHistory history={pos.position_history || []} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
