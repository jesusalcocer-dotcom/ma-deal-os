'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Tab = 'contacts' | 'action-items' | 'communications';

export default function ClientManagementPage() {
  const params = useParams();
  const dealId = params.dealId as string;
  const [activeTab, setActiveTab] = useState<Tab>('contacts');
  const [contacts, setContacts] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [contactsRes, itemsRes, commsRes] = await Promise.all([
        fetch(`/api/deals/${dealId}/client/contacts`),
        fetch(`/api/deals/${dealId}/client/action-items`),
        fetch(`/api/deals/${dealId}/client/communications`),
      ]);
      const contactsData = await contactsRes.json();
      const itemsData = await itemsRes.json();
      const commsData = await commsRes.json();
      setContacts(Array.isArray(contactsData) ? contactsData : []);
      setActionItems(Array.isArray(itemsData) ? itemsData : []);
      setCommunications(Array.isArray(commsData) ? commsData : []);
    } catch {
      // graceful
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleGenerateComm() {
    setGenerating(true);
    try {
      await fetch(`/api/deals/${dealId}/client/communications/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'status_update' }),
      });
      await fetchData();
      setActiveTab('communications');
    } catch {
      // handle error
    } finally {
      setGenerating(false);
    }
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'contacts', label: 'Contacts', count: contacts.length },
    { key: 'action-items', label: 'Action Items', count: actionItems.length },
    { key: 'communications', label: 'Communications', count: communications.length },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Management</h1>
          <p className="text-muted-foreground">Manage client contacts, action items, and communications</p>
        </div>
        <Button onClick={handleGenerateComm} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Status Update'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label} {tab.count > 0 && <span className="ml-1 text-xs opacity-60">({tab.count})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div>
              {contacts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No client contacts added yet.</p>
              ) : (
                <div className="rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Name</th>
                        <th className="px-4 py-2 text-left font-medium">Email</th>
                        <th className="px-4 py-2 text-left font-medium">Role</th>
                        <th className="px-4 py-2 text-left font-medium">Primary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((c: any) => (
                        <tr key={c.id} className="border-t">
                          <td className="px-4 py-2 font-medium">{c.name}</td>
                          <td className="px-4 py-2">{c.email}</td>
                          <td className="px-4 py-2 capitalize">{c.role || '—'}</td>
                          <td className="px-4 py-2">{c.is_primary ? 'Yes' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Action Items Tab */}
          {activeTab === 'action-items' && (
            <div>
              {actionItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No action items assigned to client.</p>
              ) : (
                <div className="rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Description</th>
                        <th className="px-4 py-2 text-left font-medium">Category</th>
                        <th className="px-4 py-2 text-left font-medium">Priority</th>
                        <th className="px-4 py-2 text-left font-medium">Due Date</th>
                        <th className="px-4 py-2 text-left font-medium">Status</th>
                        <th className="px-4 py-2 text-left font-medium">Follow-ups</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionItems.map((a: any) => (
                        <tr key={a.id} className="border-t">
                          <td className="px-4 py-2">{a.description}</td>
                          <td className="px-4 py-2 capitalize">{a.category || '—'}</td>
                          <td className="px-4 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              a.priority === 'high' ? 'bg-red-100 text-red-800' :
                              a.priority === 'urgent' ? 'bg-red-200 text-red-900' :
                              'bg-gray-100 text-gray-800'
                            }`}>{a.priority}</span>
                          </td>
                          <td className="px-4 py-2">{a.due_date || '—'}</td>
                          <td className="px-4 py-2 capitalize">{a.status}</td>
                          <td className="px-4 py-2">{a.follow_up_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Communications Tab */}
          {activeTab === 'communications' && (
            <div>
              {communications.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No communications generated yet.</p>
              ) : (
                <div className="space-y-3">
                  {communications.map((c: any) => (
                    <div key={c.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{c.subject}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.status === 'sent' ? 'bg-green-100 text-green-800' :
                          c.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>{c.status}</span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">{c.body}</p>
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Type: {c.type}</span>
                        <span>Generated: {c.generated_by}</span>
                        {c.sent_at && <span>Sent: {new Date(c.sent_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
