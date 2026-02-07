'use client';

interface HistoryEntry {
  date: string;
  party: string;
  position: string;
  source: string;
}

export function PositionHistory({ history }: { history: HistoryEntry[] }) {
  if (!history || history.length === 0) {
    return <p className="text-xs text-muted-foreground">No position history yet</p>;
  }

  return (
    <div className="space-y-2 pl-4 border-l-2 border-muted">
      {history.map((entry, i) => (
        <div key={i} className="text-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{entry.date}</span>
            <span className="font-medium">{entry.party}</span>
            {entry.source && <span>via {entry.source}</span>}
          </div>
          <p className="mt-0.5">{entry.position}</p>
        </div>
      ))}
    </div>
  );
}
