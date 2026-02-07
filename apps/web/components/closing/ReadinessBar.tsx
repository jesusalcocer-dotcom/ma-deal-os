'use client';

interface ReadinessBarProps {
  satisfied: number;
  waived: number;
  total: number;
  targetDate?: string;
}

export function ReadinessBar({ satisfied, waived, total, targetDate }: ReadinessBarProps) {
  const met = satisfied + waived;
  const percentage = total > 0 ? Math.round((met / total) * 100) : 0;

  let statusColor = 'bg-yellow-500';
  let statusText = 'In Progress';
  if (percentage === 100) {
    statusColor = 'bg-green-500';
    statusText = 'Ready to Close';
  } else if (percentage === 0) {
    statusColor = 'bg-gray-300';
    statusText = 'Not Started';
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-semibold">Closing Readiness</h3>
          <p className="text-sm text-muted-foreground">
            {met}/{total} conditions met ({satisfied} satisfied, {waived} waived)
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium text-white ${statusColor}`}>
            {statusText}
          </span>
          {targetDate && (
            <p className="text-xs text-muted-foreground mt-1">Target: {targetDate}</p>
          )}
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all ${statusColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-right text-xs text-muted-foreground mt-1">{percentage}%</p>
    </div>
  );
}
