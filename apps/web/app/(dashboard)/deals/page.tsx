import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DealsPage() {
  let dealList: any[] = [];
  try {
    const { data, error } = await supabase()
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) dealList = data;
  } catch {
    // DB not connected yet - show empty state
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deals</h1>
          <p className="text-muted-foreground">Manage your M&A transactions</p>
        </div>
        <Button asChild>
          <Link href="/deals/new">
            <Plus className="mr-2 h-4 w-4" />
            New Deal
          </Link>
        </Button>
      </div>

      {dealList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">No deals yet. Create your first deal to get started.</p>
            <Button asChild>
              <Link href="/deals/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Deal
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dealList.map((deal) => (
            <Link key={deal.id} href={`/deals/${deal.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{deal.name}</CardTitle>
                    <Badge variant={deal.status === 'active' ? 'default' : 'secondary'}>
                      {deal.status}
                    </Badge>
                  </div>
                  {deal.code_name && (
                    <CardDescription>Code: {deal.code_name}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {deal.target_name && <p>Target: {deal.target_name}</p>}
                    {deal.buyer_name && <p>Buyer: {deal.buyer_name}</p>}
                    {deal.deal_value && (
                      <p>Value: ${Number(deal.deal_value).toLocaleString()}</p>
                    )}
                    {deal.industry && <p>Industry: {deal.industry}</p>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
