import { supabase } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DealNav } from '@/components/layout/DealNav';

export const dynamic = 'force-dynamic';

const VERSION_TYPE_LABELS: Record<string, string> = {
  template: 'v1 Template',
  precedent_applied: 'v2 Precedent',
  scrubbed: 'v3 Scrubbed',
  adapted: 'v4 Adapted',
  attorney_reviewed: 'Attorney Reviewed',
  counterparty_markup: 'Counterparty Markup',
  response: 'Response',
  final: 'Final',
  executed: 'Executed',
};

export default async function DocumentsPage({ params }: { params: { dealId: string } }) {
  const { dealId } = await params;
  let deal: any;
  let versions: any[] = [];
  let checklistItems: Record<string, any> = {};

  try {
    const { data: dealData, error: dealError } = await supabase()
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !dealData) notFound();
    deal = dealData;

    const { data: versionsData } = await supabase()
      .from('document_versions')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    versions = versionsData || [];

    // Fetch checklist items for names
    const { data: items } = await supabase()
      .from('checklist_items')
      .select('*')
      .eq('deal_id', dealId);

    if (items) {
      for (const item of items) {
        checklistItems[(item as any).id] = item;
      }
    }
  } catch {
    notFound();
  }

  // Group versions by checklist item
  const grouped = versions.reduce<Record<string, any[]>>((acc, v) => {
    const key = v.checklist_item_id || 'unlinked';
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  return (
    <div>
      <DealNav />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            {versions.length} document version{versions.length !== 1 ? 's' : ''} across{' '}
            {Object.keys(grouped).length} document{Object.keys(grouped).length !== 1 ? 's' : ''}
          </p>
        </div>

        {versions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-muted-foreground">
                No documents generated yet. Go to the Checklist tab to generate documents.
              </p>
              <Link
                href={`/deals/${dealId}/checklist`}
                className="text-sm text-primary underline"
              >
                Go to Checklist
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([checklistItemId, itemVersions]) => {
              const checklistItem = checklistItems[checklistItemId];
              const docName = checklistItem?.document_name || 'Unknown Document';
              const docType = checklistItem?.document_type || '';

              return (
                <Card key={checklistItemId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{docName}</CardTitle>
                      {docType && (
                        <Badge variant="secondary">{docType}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {itemVersions.map((v: any) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between rounded-md border p-3"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {VERSION_TYPE_LABELS[v.version_type] || v.version_label}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                v{v.version_number}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>
                                {new Date(v.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {v.file_size_bytes && (
                                <span>{Math.round(v.file_size_bytes / 1024)} KB</span>
                              )}
                              {v.source && <span>{v.source}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {v.change_summary?.description && (
                              <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                                {v.change_summary.description}
                              </span>
                            )}
                            <Link
                              href={`/api/deals/${dealId}/documents/${v.id}?download=true`}
                              className="text-xs text-primary underline"
                            >
                              Download
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
