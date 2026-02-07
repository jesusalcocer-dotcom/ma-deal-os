'use client';

interface ConditionCardProps {
  condition: {
    id?: string;
    description: string;
    condition_type: string;
    category?: string;
    responsible_party?: string;
    status: string;
    satisfied_at?: string;
    evidence?: string;
    blocks_closing?: boolean;
  };
  onUpdate?: (id: string, status: string) => void;
}

export function ConditionCard({ condition, onUpdate }: ConditionCardProps) {
  const statusConfig: Record<string, { color: string; icon: string }> = {
    satisfied: { color: 'bg-green-100 text-green-800 border-green-200', icon: 'bg-green-500' },
    waived: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: 'bg-yellow-500' },
    pending: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: 'bg-gray-300' },
    failed: { color: 'bg-red-100 text-red-800 border-red-200', icon: 'bg-red-500' },
  };

  const config = statusConfig[condition.status] || statusConfig.pending;

  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${config.color}`}>
      {/* Traffic light indicator */}
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${config.icon}`} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{condition.description}</p>
        <div className="flex gap-2 mt-1 text-xs opacity-75">
          {condition.category && <span className="capitalize">{condition.category}</span>}
          {condition.responsible_party && (
            <>
              <span>·</span>
              <span className="capitalize">{condition.responsible_party}</span>
            </>
          )}
          {condition.blocks_closing && (
            <>
              <span>·</span>
              <span className="font-semibold">Blocks Closing</span>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {condition.id && condition.status === 'pending' && onUpdate && (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onUpdate(condition.id!, 'satisfied')}
            className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
          >
            Satisfy
          </button>
          <button
            onClick={() => onUpdate(condition.id!, 'waived')}
            className="rounded bg-yellow-600 px-2 py-1 text-xs text-white hover:bg-yellow-700"
          >
            Waive
          </button>
        </div>
      )}

      {condition.status !== 'pending' && (
        <span className="text-xs font-medium capitalize flex-shrink-0">{condition.status}</span>
      )}
    </div>
  );
}
