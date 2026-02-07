'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface GenerateDocumentButtonProps {
  dealId: string;
  checklistItemId: string;
  documentName: string;
  documentType: string;
  currentVersionType?: string | null;
}

export function GenerateDocumentButton({
  dealId,
  checklistItemId,
  documentName,
  documentType,
  currentVersionType,
}: GenerateDocumentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Determine next stage
  const nextStage = getNextStage(currentVersionType);

  if (!nextStage) {
    return (
      <span className="text-xs text-muted-foreground">v3 complete</span>
    );
  }

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/deals/${dealId}/documents/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist_item_id: checklistItemId,
          stage: nextStage,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await res.json();
      setSuccess(data.message);

      // Refresh the page after a short delay
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const stageLabels: Record<string, string> = {
    v1_template: 'Generate v1 (Template)',
    v2_precedent: 'Generate v2 (Precedent)',
    v3_scrubbed: 'Generate v3 (Scrub)',
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? 'Generating...' : stageLabels[nextStage] || 'Generate'}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
      {success && <span className="text-xs text-green-600">{success}</span>}
    </div>
  );
}

function getNextStage(currentVersionType?: string | null): string | null {
  if (!currentVersionType) return 'v1_template';
  switch (currentVersionType) {
    case 'template': return 'v2_precedent';
    case 'precedent_applied': return 'v3_scrubbed';
    case 'scrubbed': return null; // v3 complete
    default: return null;
  }
}
