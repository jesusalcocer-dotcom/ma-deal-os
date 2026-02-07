'use client';

import { useState } from 'react';
import { SwipeableCard } from './SwipeableCard';
import { ActionPreviewMobile } from './ActionPreview.mobile';

interface MobileApprovalCardProps {
  chain: {
    id: string;
    deal_id: string;
    summary: string;
    approval_tier: number;
    significance: number;
    status: string;
    created_at: string;
    proposed_actions: any[];
  };
  onApprove?: (chainId: string) => void;
  onReview?: (chainId: string) => void;
}

const significanceColors: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

function getSignificanceLabel(value: number): string {
  if (value >= 0.7) return 'high';
  if (value >= 0.4) return 'medium';
  return 'low';
}

export function MobileApprovalCard({ chain, onApprove, onReview }: MobileApprovalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const significance = getSignificanceLabel(chain.significance);
  const isTier2 = chain.approval_tier === 2;

  return (
    <SwipeableCard
      onSwipeRight={isTier2 ? () => onApprove?.(chain.id) : undefined}
      onSwipeLeft={() => onReview?.(chain.id)}
      rightLabel={isTier2 ? 'Approve' : undefined}
      leftLabel="Review"
      disabled={!isTier2}
    >
      <div className="border rounded-lg p-4" onClick={() => setExpanded(!expanded)}>
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-3 h-3 rounded-full ${significanceColors[significance]}`} />
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Tier {chain.approval_tier}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {chain.proposed_actions?.length || 0} actions
          </span>
        </div>

        {/* Summary */}
        <p className="text-base font-medium leading-snug mb-2">
          {chain.summary}
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(chain.created_at).toLocaleDateString()}</span>
          <span className="capitalize">{chain.status}</span>
        </div>

        {/* Action buttons - always visible for accessibility */}
        <div className="flex gap-2 mt-3">
          {isTier2 && (
            <button
              onClick={(e) => { e.stopPropagation(); onApprove?.(chain.id); }}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium min-h-[44px]"
            >
              Approve All
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onReview?.(chain.id); }}
            className={`${isTier2 ? 'flex-1' : 'w-full'} py-2.5 border rounded-lg text-sm font-medium min-h-[44px]`}
          >
            Review
          </button>
        </div>

        {/* Expanded actions */}
        {expanded && chain.proposed_actions && (
          <div className="mt-3 pt-3 border-t space-y-2">
            {chain.proposed_actions.map((action: any, i: number) => (
              <ActionPreviewMobile key={i} action={action} />
            ))}
          </div>
        )}
      </div>
    </SwipeableCard>
  );
}
