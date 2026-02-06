import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase/server';
import { deals, checklistItems } from '@ma-deal-os/db';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DealNav } from '@/components/layout/DealNav';
import { TRANSACTION_STRUCTURE_LABELS, CHECKLIST_STATUS_LABELS } from '@ma-deal-os/core';

export const dynamic = 'force-dynamic';

export default async function DealDashboardPage({ params }: { params: { dealId: string } }) {
  const { dealId } = await params;
  let deal: any;
  let items: any[] = [];

  try {
    const result = await db().select().from(deals).where(eq(deals.id, dealId));
    deal = result[0];
    if (!deal) notFound();

    items = await db().select().from(checklistItems).where(eq(checklistItems.deal_id, dealId));
  } catch {
    notFound();
  }

  const params_obj = (deal.parameters || {}) as any;
  const totalItems = items.length;
  const criticalItems = items.filter((i) => i.priority === 'critical' && i.status === 'identified').length;
  const completedItems = items.filter((i) =>
    ['final', 'executed', 'filed'].includes(i.status)
  ).length;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div>
      <DealNav />
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{deal.name}</h1>
            {deal.code_name && (
              <Badge variant="secondary">{deal.code_name}</Badge>
            )}
            <Badge>{deal.status}</Badge>
          </div>
          {params_obj.transaction_structure && (
            <p className="mt-1 text-muted-foreground">
              {TRANSACTION_STRUCTURE_LABELS[params_obj.transaction_structure] || params_obj.transaction_structure}
            </p>
          )}
        </div>

        {/* Health Indicators */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Critical Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${criticalItems > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {criticalItems}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Document Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressPct}%</div>
              <p className="text-xs text-muted-foreground">
                {completedItems} / {totalItems} items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Deal Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {deal.deal_value ? `$${Number(deal.deal_value).toLocaleString()}` : 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Days to Close
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {deal.expected_closing_date
                  ? Math.max(0, Math.ceil((new Date(deal.expected_closing_date).getTime() - Date.now()) / 86400000))
                  : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Checklist Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Checklist Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-muted-foreground">
                No checklist items yet. Generate a checklist from the deal parameters.
              </p>
            ) : (
              <div className="space-y-2">
                {items.slice(0, 10).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">{item.document_name}</p>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.priority === 'critical' ? 'destructive' : 'secondary'}>
                        {item.priority}
                      </Badge>
                      <Badge variant="outline">
                        {CHECKLIST_STATUS_LABELS[item.status] || item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {items.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground">
                    and {items.length - 10} more items...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
