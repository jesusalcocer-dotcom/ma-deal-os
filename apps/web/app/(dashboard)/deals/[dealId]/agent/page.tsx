'use client';

import { useParams } from 'next/navigation';
import { ChatInterface } from '@/components/agent/ChatInterface';

export default function AgentPage() {
  const params = useParams();
  const dealId = params.dealId as string;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Agent</h1>
        <p className="text-muted-foreground mt-1">
          Chat with the Manager Agent for deal-specific strategy and the System
          Expert for platform help.
        </p>
      </div>

      <ChatInterface dealId={dealId} />
    </div>
  );
}
