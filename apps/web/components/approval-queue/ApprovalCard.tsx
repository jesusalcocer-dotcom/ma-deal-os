'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';
import { ActionPreview } from './ActionPreview';

interface ProposedAction {
  id: string;
  action_type: string;
  description: string;
  target_entity_type?: string;
  target_entity_id?: string;
  payload?: Record<string, any>;
  preview?: Record<string, any>;
  status: string;
}

interface Chain {
  id: string;
  deal_id: string;
  trigger_event_id?: string;
  summary: string;
  approval_tier: number;
  significance: number;
  status: string;
  created_at: string;
  proposed_actions: ProposedAction[];
}

function significanceBadgeVariant(sig: number): 'default' | 'secondary' | 'destructive' {
  if (sig >= 4) return 'destructive';
  if (sig === 3) return 'secondary';
  return 'default';
}

function tierLabel(tier: number): string {
  if (tier === 2) return 'Approve';
  if (tier === 3) return 'Review';
  return 'Auto';
}

export function ApprovalCard({ chain, onUpdate }: { chain: Chain; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);

  async function handleApproveAll() {
    setApproving(true);
    try {
      await fetch(`/api/approval-queue/${chain.id}/approve`, { method: 'POST' });
      onUpdate();
    } finally {
      setApproving(false);
    }
  }

  const actionCount = chain.proposed_actions?.length || 0;
  const pendingCount = chain.proposed_actions?.filter((a) => a.status === 'pending').length || 0;
  const timeAgo = getTimeAgo(chain.created_at);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant={significanceBadgeVariant(chain.significance)}>
                Sig {chain.significance}
              </Badge>
              <Badge variant="outline">Tier {chain.approval_tier} - {tierLabel(chain.approval_tier)}</Badge>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
            <CardTitle className="text-base">{chain.summary}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {actionCount} action{actionCount !== 1 ? 's' : ''} — {pendingCount} pending
            </p>
          </div>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <Button size="sm" disabled={approving} onClick={handleApproveAll}>
                <CheckCircle className="mr-1 h-3 w-3" />
                Approve All
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-2 pt-0">
          {chain.proposed_actions?.map((action) => (
            <ActionPreview key={action.id} action={action} chainId={chain.id} onUpdate={onUpdate} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
