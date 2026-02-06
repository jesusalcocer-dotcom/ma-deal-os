'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function GenerateChecklistButton({ dealId, hasItems }: { dealId: string; hasItems: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/generate-checklist`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to generate checklist');
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleGenerate} disabled={loading}>
      {loading ? 'Generating...' : hasItems ? 'Regenerate Checklist' : 'Generate Checklist'}
    </Button>
  );
}
