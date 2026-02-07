import { supabase } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DealNav } from '@/components/layout/DealNav';
import { CHECKLIST_STATUS_LABELS } from '@ma-deal-os/core';
import { GenerateChecklistButton } from '@/components/deal/GenerateChecklistButton';

export const dynamic = 'force-dynamic';

export default async function ChecklistPage({ params }: { params: { dealId: string } }) {
  const { dealId } = await params;
  let deal: any;
  let items: any[] = [];

  try {
    const { data: dealData, error: dealError } = await supabase()
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !dealData) notFound();
    deal = dealData;

    const { data: itemsData } = await supabase()
      .from('checklist_items')
      .select('*')
      .eq('deal_id', dealId)
      .order('sort_order', { ascending: true });

    items = itemsData || [];
  } catch {
    notFound();
  }

  const groupedItems = items.reduce<Record<string, any[]>>((acc, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const priorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'destructive' as const;
      case 'high': return 'default' as const;
      default: return 'secondary' as const;
    }
  };

  return (
    <div>
      <DealNav />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Document Checklist</h1>
            <p className="text-muted-foreground">{items.length} items total</p>
          </div>
          <GenerateChecklistButton dealId={dealId} hasItems={items.length > 0} />
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-muted-foreground">
                No checklist items yet. Click &quot;Generate Checklist&quot; to create items from deal parameters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, catItems]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">
                    {category.replace(/_/g, ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {catItems.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent/50"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.document_name}</p>
                          <p className="text-xs text-muted-foreground">{item.trigger_rule}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.ball_with && (
                            <Badge variant="outline">{item.ball_with}</Badge>
                          )}
                          <Badge variant={priorityColor(item.priority)}>
                            {item.priority}
                          </Badge>
                          <Badge variant="outline">
                            {CHECKLIST_STATUS_LABELS[item.status] || item.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
