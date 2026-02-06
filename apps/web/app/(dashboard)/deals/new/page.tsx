'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TRANSACTION_STRUCTURES, TRANSACTION_STRUCTURE_LABELS } from '@ma-deal-os/core';

export default function NewDealPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [termSheetFile, setTermSheetFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body: Record<string, any> = {
      name: form.get('name'),
      code_name: form.get('code_name') || undefined,
      target_name: form.get('target_name') || undefined,
      buyer_name: form.get('buyer_name') || undefined,
      seller_name: form.get('seller_name') || undefined,
      industry: form.get('industry') || undefined,
      deal_value: form.get('deal_value') ? Number(form.get('deal_value')) : undefined,
      parameters: {
        transaction_structure: form.get('transaction_structure') || undefined,
      },
    };

    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to create deal');
      const deal = await res.json();

      // If a term sheet was uploaded, parse it
      if (termSheetFile) {
        const tsForm = new FormData();
        tsForm.append('file', termSheetFile);
        await fetch(`/api/deals/${deal.id}/parse-term-sheet`, {
          method: 'POST',
          body: tsForm,
        });
      }

      router.push(`/deals/${deal.id}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Create New Deal</h1>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deal Information</CardTitle>
              <CardDescription>Basic information about the transaction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Deal Name *</Label>
                  <Input id="name" name="name" placeholder="Project Mercury" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code_name">Code Name</Label>
                  <Input id="code_name" name="code_name" placeholder="Mercury" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_structure">Transaction Structure</Label>
                <Select name="transaction_structure">
                  <SelectTrigger>
                    <SelectValue placeholder="Select structure..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_STRUCTURES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {TRANSACTION_STRUCTURE_LABELS[s] || s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="target_name">Target</Label>
                  <Input id="target_name" name="target_name" placeholder="TargetCo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyer_name">Buyer</Label>
                  <Input id="buyer_name" name="buyer_name" placeholder="BuyerCorp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seller_name">Seller</Label>
                  <Input id="seller_name" name="seller_name" placeholder="SellerCo" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="deal_value">Deal Value ($)</Label>
                  <Input id="deal_value" name="deal_value" type="number" placeholder="250000000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" name="industry" placeholder="Technology" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Term Sheet (Optional)</CardTitle>
              <CardDescription>
                Upload a term sheet to auto-extract deal parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="file"
                accept=".docx,.pdf,.doc"
                onChange={(e) => setTermSheetFile(e.target.files?.[0] || null)}
              />
              {termSheetFile && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selected: {termSheetFile.name}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Deal'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
