'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface HardConstraint {
  id: string;
  category: string;
  description: string;
  rule: string;
  consequence: 'block_and_escalate' | 'escalate' | 'flag';
}

interface Preference {
  id: string;
  category: string;
  description: string;
  default_behavior: string;
  override_condition: string;
}

interface StrategicDirective {
  id: string;
  description: string;
  applies_to: string[];
  priority: 'primary' | 'secondary' | 'background';
}

interface Constitution {
  hard_constraints: HardConstraint[];
  preferences: Preference[];
  strategic_directives: StrategicDirective[];
}

interface ConstitutionEditorProps {
  constitution: Constitution | null;
  dealId: string;
  onUpdate: () => void;
}

export function ConstitutionEditor({ constitution, dealId, onUpdate }: ConstitutionEditorProps) {
  const [saving, setSaving] = useState(false);

  async function handleDelete(type: 'hard_constraints' | 'preferences' | 'strategic_directives', id: string) {
    if (!constitution) return;
    setSaving(true);
    try {
      const updated = {
        ...constitution,
        [type]: constitution[type].filter((item: any) => item.id !== id),
      };
      await fetch(`/api/deals/${dealId}/constitution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  if (!constitution) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground mb-2">No constitution set for this deal.</p>
        <p className="text-sm text-muted-foreground">Use the conversational encoder below to create one, or set it via API.</p>
      </div>
    );
  }

  const { hard_constraints, preferences, strategic_directives } = constitution;

  return (
    <div className="space-y-6">
      {/* Hard Constraints */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
          Hard Constraints ({hard_constraints.length})
        </h2>
        {hard_constraints.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hard constraints defined.</p>
        ) : (
          <div className="space-y-2">
            {hard_constraints.map((c) => (
              <div key={c.id} className="rounded-lg border-l-4 border-l-red-500 border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium uppercase bg-red-100 text-red-800 px-2 py-0.5 rounded">
                        {c.category}
                      </span>
                      <span className="text-xs text-muted-foreground">{c.consequence}</span>
                    </div>
                    <p className="font-medium">{c.description}</p>
                    <p className="text-sm text-muted-foreground mt-1">Rule: {c.rule}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete('hard_constraints', c.id)}
                    disabled={saving}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Preferences */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-yellow-500" />
          Preferences ({preferences.length})
        </h2>
        {preferences.length === 0 ? (
          <p className="text-sm text-muted-foreground">No preferences defined.</p>
        ) : (
          <div className="space-y-2">
            {preferences.map((p) => (
              <div key={p.id} className="rounded-lg border-l-4 border-l-yellow-500 border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium uppercase bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                      {p.category}
                    </span>
                    <p className="font-medium mt-1">{p.description}</p>
                    <p className="text-sm text-muted-foreground mt-1">Default: {p.default_behavior}</p>
                    <p className="text-sm text-muted-foreground">Override: {p.override_condition}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete('preferences', p.id)}
                    disabled={saving}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Strategic Directives */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
          Strategic Directives ({strategic_directives.length})
        </h2>
        {strategic_directives.length === 0 ? (
          <p className="text-sm text-muted-foreground">No strategic directives defined.</p>
        ) : (
          <div className="space-y-2">
            {strategic_directives.map((d) => (
              <div key={d.id} className="rounded-lg border-l-4 border-l-blue-500 border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium uppercase px-2 py-0.5 rounded ${
                        d.priority === 'primary' ? 'bg-blue-100 text-blue-800' :
                        d.priority === 'secondary' ? 'bg-blue-50 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {d.priority}
                      </span>
                      {d.applies_to.map((domain) => (
                        <span key={domain} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {domain}
                        </span>
                      ))}
                    </div>
                    <p className="font-medium">{d.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete('strategic_directives', d.id)}
                    disabled={saving}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
