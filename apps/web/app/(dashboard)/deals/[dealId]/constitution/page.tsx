'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ConstitutionEditor } from '@/components/constitution/ConstitutionEditor';
import { ConversationalEncoder } from '@/components/constitution/ConversationalEncoder';

export default function ConstitutionPage() {
  const params = useParams();
  const dealId = params.dealId as string;
  const [constitution, setConstitution] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchConstitution = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/constitution`);
      const data = await res.json();
      setConstitution(data);
    } catch {
      // constitution may not exist yet
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchConstitution();
  }, [fetchConstitution]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Partner Constitution</h1>
        <p className="text-muted-foreground">
          Governance rules that shape all agent behavior for this deal
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-8">
          <ConstitutionEditor
            constitution={constitution}
            dealId={dealId}
            onUpdate={fetchConstitution}
          />

          <ConversationalEncoder
            dealId={dealId}
            currentConstitution={constitution}
            onUpdate={fetchConstitution}
          />
        </div>
      )}
    </div>
  );
}
