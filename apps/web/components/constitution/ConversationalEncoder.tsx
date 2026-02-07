'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ConversationalEncoderProps {
  dealId: string;
  currentConstitution: any | null;
  onUpdate: () => void;
}

export function ConversationalEncoder({ dealId, currentConstitution, onUpdate }: ConversationalEncoderProps) {
  const [message, setMessage] = useState('');
  const [encoding, setEncoding] = useState(false);
  const [delta, setDelta] = useState<any>(null);
  const [applying, setApplying] = useState(false);

  async function handleEncode() {
    if (!message.trim()) return;
    setEncoding(true);
    setDelta(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/constitution/encode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      setDelta(data.delta);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setEncoding(false);
    }
  }

  async function handleApply() {
    if (!delta) return;
    setApplying(true);
    try {
      const base = currentConstitution || {
        hard_constraints: [],
        preferences: [],
        strategic_directives: [],
      };

      const merged = {
        hard_constraints: [...base.hard_constraints, ...(delta.add_constraints || [])],
        preferences: [...base.preferences, ...(delta.add_preferences || [])],
        strategic_directives: [...base.strategic_directives, ...(delta.add_directives || [])],
      };

      const res = await fetch(`/api/deals/${dealId}/constitution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      setDelta(null);
      setMessage('');
      onUpdate();
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h3 className="font-semibold">Add via Conversation</h3>
      <p className="text-sm text-muted-foreground">
        Describe your preferences in natural language. The system will extract constraints, preferences, and directives.
      </p>

      <textarea
        className="w-full rounded-md border p-3 text-sm min-h-[100px] resize-y"
        placeholder='e.g., "I want a clean exit for my client. No long-tail indemnification beyond the escrow. And nothing goes to the counterparty without my approval."'
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={encoding}
      />

      <Button onClick={handleEncode} disabled={encoding || !message.trim()}>
        {encoding ? 'Analyzing...' : 'Extract Provisions'}
      </Button>

      {/* Preview delta */}
      {delta && (
        <div className="space-y-3 pt-2 border-t">
          <h4 className="font-medium">Proposed Changes</h4>
          {delta.reasoning && (
            <p className="text-sm text-muted-foreground italic">{delta.reasoning}</p>
          )}

          {delta.add_constraints?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-700 mb-1">
                + {delta.add_constraints.length} Hard Constraint{delta.add_constraints.length > 1 ? 's' : ''}
              </p>
              {delta.add_constraints.map((c: any) => (
                <div key={c.id} className="text-sm bg-red-50 rounded p-2 mb-1">
                  <span className="font-medium">[{c.category}]</span> {c.description}
                </div>
              ))}
            </div>
          )}

          {delta.add_preferences?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-700 mb-1">
                + {delta.add_preferences.length} Preference{delta.add_preferences.length > 1 ? 's' : ''}
              </p>
              {delta.add_preferences.map((p: any) => (
                <div key={p.id} className="text-sm bg-yellow-50 rounded p-2 mb-1">
                  <span className="font-medium">[{p.category}]</span> {p.description}
                </div>
              ))}
            </div>
          )}

          {delta.add_directives?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">
                + {delta.add_directives.length} Directive{delta.add_directives.length > 1 ? 's' : ''}
              </p>
              {delta.add_directives.map((d: any) => (
                <div key={d.id} className="text-sm bg-blue-50 rounded p-2 mb-1">
                  <span className="font-medium">[{d.priority}]</span> {d.description}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleApply} disabled={applying}>
              {applying ? 'Applying...' : 'Apply Changes'}
            </Button>
            <Button variant="outline" onClick={() => setDelta(null)}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
