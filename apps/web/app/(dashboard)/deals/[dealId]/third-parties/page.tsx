'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

export default function ThirdPartiesPage() {
  const params = useParams();
  const dealId = params.dealId as string;
  const [thirdParties, setThirdParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/third-parties`);
      const data = await res.json();
      setThirdParties(Array.isArray(data) ? data : []);
    } catch {
      // graceful
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const roleLabels: Record<string, string> = {
    escrow_agent: 'Escrow Agent',
    rw_broker: 'R&W Insurance Broker',
    lenders_counsel: "Lender's Counsel",
    accountant: 'Accountant',
    environmental_consultant: 'Environmental Consultant',
    title_company: 'Title Company',
    surveyor: 'Surveyor',
    tax_advisor: 'Tax Advisor',
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Third-Party Tracking</h1>
        <p className="text-muted-foreground">Track escrow agents, brokers, accountants, and other third parties</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : thirdParties.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No third parties tracked yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {thirdParties.map((tp: any) => {
            const deliverables = Array.isArray(tp.deliverables) ? tp.deliverables : [];
            const outstanding = Array.isArray(tp.outstanding_items) ? tp.outstanding_items : [];

            return (
              <div key={tp.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{tp.firm_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {roleLabels[tp.role] || tp.role}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    tp.status === 'active' ? 'bg-green-100 text-green-800' :
                    tp.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>{tp.status}</span>
                </div>

                {tp.contact_name && (
                  <p className="text-sm">
                    {tp.contact_name}
                    {tp.contact_email && <span className="text-muted-foreground ml-1">({tp.contact_email})</span>}
                  </p>
                )}

                {tp.last_communication_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last contact: {new Date(tp.last_communication_at).toLocaleDateString()}
                  </p>
                )}

                {deliverables.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium mb-1">Deliverables ({deliverables.length})</p>
                    <div className="space-y-1">
                      {deliverables.map((d: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className={`w-2 h-2 rounded-full ${
                            d.status === 'received' ? 'bg-green-500' :
                            d.status === 'overdue' ? 'bg-red-500' : 'bg-gray-300'
                          }`} />
                          <span>{d.description || d.name || `Deliverable ${i + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {outstanding.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-red-600 mb-1">Outstanding ({outstanding.length})</p>
                    <ul className="text-xs text-red-600 list-disc list-inside">
                      {outstanding.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
