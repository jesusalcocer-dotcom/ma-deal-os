'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ReadinessBar } from '@/components/closing/ReadinessBar';
import { ConditionCard } from '@/components/closing/ConditionCard';

export default function ClosingPage() {
  const params = useParams();
  const dealId = params.dealId as string;
  const [data, setData] = useState<any>({ checklist: null, conditions: [], deliverables: [], post_closing: [] });
  const [fundsFlow, setFundsFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [closingRes, fundsRes] = await Promise.all([
        fetch(`/api/deals/${dealId}/closing`),
        fetch(`/api/deals/${dealId}/closing/funds-flow`),
      ]);
      const closingData = await closingRes.json();
      const fundsData = await fundsRes.json();
      setData(closingData);
      setFundsFlow(fundsData);
    } catch {
      // API may not have data yet
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await fetch(`/api/deals/${dealId}/closing/generate`, { method: 'POST' });
      await fetchData();
    } catch {
      // handle error
    } finally {
      setGenerating(false);
    }
  }

  async function handleConditionUpdate(conditionId: string, status: string) {
    try {
      await fetch(`/api/deals/${dealId}/closing/conditions/${conditionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await fetchData();
    } catch {
      // handle error
    }
  }

  const { checklist, conditions, deliverables, post_closing } = data;
  const mutualConditions = conditions.filter((c: any) => c.condition_type === 'mutual');
  const buyerConditions = conditions.filter((c: any) => c.condition_type === 'buyer');
  const sellerConditions = conditions.filter((c: any) => c.condition_type === 'seller');

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Closing Dashboard</h1>
          <p className="text-muted-foreground">Track closing conditions, deliverables, and readiness</p>
        </div>
        {!checklist && (
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Closing Checklist'}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !checklist && conditions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">No closing checklist generated yet.</p>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate from SPA'}
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Readiness Bar */}
          <ReadinessBar
            satisfied={checklist?.conditions_satisfied || conditions.filter((c: any) => c.status === 'satisfied').length}
            waived={checklist?.conditions_waived || conditions.filter((c: any) => c.status === 'waived').length}
            total={checklist?.conditions_total || conditions.length}
            targetDate={checklist?.target_closing_date}
          />

          {/* Conditions by Type */}
          {mutualConditions.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Mutual Conditions</h2>
              <div className="space-y-2">
                {mutualConditions.map((c: any) => (
                  <ConditionCard key={c.id || c.description} condition={c} onUpdate={handleConditionUpdate} />
                ))}
              </div>
            </section>
          )}

          {buyerConditions.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Buyer Conditions</h2>
              <div className="space-y-2">
                {buyerConditions.map((c: any) => (
                  <ConditionCard key={c.id || c.description} condition={c} onUpdate={handleConditionUpdate} />
                ))}
              </div>
            </section>
          )}

          {sellerConditions.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Seller Conditions</h2>
              <div className="space-y-2">
                {sellerConditions.map((c: any) => (
                  <ConditionCard key={c.id || c.description} condition={c} onUpdate={handleConditionUpdate} />
                ))}
              </div>
            </section>
          )}

          {/* Deliverables */}
          {deliverables.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Closing Deliverables</h2>
              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Deliverable</th>
                      <th className="px-4 py-2 text-left font-medium">Type</th>
                      <th className="px-4 py-2 text-left font-medium">Responsible</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliverables.map((d: any, i: number) => (
                      <tr key={d.id || i} className="border-t">
                        <td className="px-4 py-2">{d.description}</td>
                        <td className="px-4 py-2 capitalize">{(d.deliverable_type || '').replace('_', ' ')}</td>
                        <td className="px-4 py-2 capitalize">{d.responsible_party}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            d.status === 'received' ? 'bg-green-100 text-green-800' :
                            d.status === 'waived' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Funds Flow */}
          {fundsFlow && fundsFlow.purchase_price && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Funds Flow</h2>
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between">
                  <span>Purchase Price</span>
                  <span className="font-mono font-semibold">${(fundsFlow.purchase_price / 1_000_000).toFixed(1)}M</span>
                </div>
                {fundsFlow.escrow && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Escrow ({fundsFlow.escrow.percentage}%)</span>
                    <span className="font-mono">-${(fundsFlow.escrow.amount / 1_000_000).toFixed(1)}M</span>
                  </div>
                )}
                <hr />
                <div className="flex justify-between font-semibold">
                  <span>Net to Seller</span>
                  <span className="font-mono">${(fundsFlow.net_to_seller / 1_000_000).toFixed(1)}M</span>
                </div>
              </div>
            </section>
          )}

          {/* Post-Closing */}
          {post_closing.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Post-Closing Obligations</h2>
              <div className="space-y-2">
                {post_closing.map((o: any, i: number) => (
                  <div key={o.id || i} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{o.description}</p>
                      <p className="text-xs text-muted-foreground">{o.obligation_type} — {o.responsible_party}</p>
                    </div>
                    {o.deadline && <span className="text-xs text-muted-foreground">{o.deadline}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
