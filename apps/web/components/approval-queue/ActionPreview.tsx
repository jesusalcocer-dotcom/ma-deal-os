'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

interface Action {
  id: string;
  action_type: string;
  description: string;
  target_entity_type?: string;
  target_entity_id?: string;
  payload?: Record<string, any>;
  preview?: Record<string, any>;
  status: string;
}

export function ActionPreview({
  action,
  chainId,
  onUpdate,
}: {
  action: Action;
  chainId: string;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleAction(endpoint: string) {
    setLoading(true);
    try {
      await fetch(`/api/approval-queue/${chainId}/actions/${action.id}/${endpoint}`, {
        method: 'POST',
      });
      onUpdate();
    } finally {
      setLoading(false);
    }
  }

  const isResolved = action.status !== 'pending';

  return (
    <div className="flex items-start justify-between gap-4 rounded-md border p-3">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {action.action_type.replace(/_/g, ' ')}
          </Badge>
          {isResolved && (
            <Badge variant={action.status === 'executed' ? 'default' : 'destructive'} className="text-xs">
              {action.status}
            </Badge>
          )}
        </div>
        <p className="text-sm">{action.description}</p>
        {action.target_entity_type && (
          <p className="text-xs text-muted-foreground">
            Target: {action.target_entity_type}
          </p>
        )}
      </div>
      {!isResolved && (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => handleAction('approve')}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => handleAction('reject')}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
