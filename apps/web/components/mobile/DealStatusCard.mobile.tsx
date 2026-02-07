'use client';

import Link from 'next/link';

interface DealStatusCardMobileProps {
  deal: {
    id: string;
    name: string;
    status: string;
    deal_type: string;
    parameters?: {
      purchase_price?: number;
      industry?: string;
    };
  };
  pendingApprovals?: number;
  overdueTasks?: number;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  closing: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-800',
  paused: 'bg-yellow-100 text-yellow-800',
};

export function DealStatusCardMobile({ deal, pendingApprovals = 0, overdueTasks = 0 }: DealStatusCardMobileProps) {
  const healthColor = overdueTasks > 2 ? 'bg-red-500' : overdueTasks > 0 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <Link href={`/deals/${deal.id}`}>
      <div className="border rounded-lg p-4 min-h-[44px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${healthColor}`} />
            <h3 className="font-medium text-base">{deal.name}</h3>
          </div>
          {pendingApprovals > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold min-w-[24px] text-center">
              {pendingApprovals}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded ${statusColors[deal.status] || 'bg-gray-100 text-gray-800'}`}>
            {deal.status}
          </span>
          <span className="text-muted-foreground">{deal.deal_type}</span>
          {deal.parameters?.purchase_price && (
            <span className="text-muted-foreground ml-auto">
              ${(deal.parameters.purchase_price / 1_000_000).toFixed(0)}M
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
