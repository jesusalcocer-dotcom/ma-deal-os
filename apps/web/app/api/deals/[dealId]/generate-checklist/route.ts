import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { deals, checklistItems } from '@ma-deal-os/db';
import { eq } from 'drizzle-orm';
import { generateChecklistFromRules } from '@ma-deal-os/core';
import type { DealParameters } from '@ma-deal-os/core';

export async function POST(_req: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = await params;
    const [deal] = await db().select().from(deals).where(eq(deals.id, dealId));
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const dealParams = (deal.parameters || {}) as DealParameters;
    const items = generateChecklistFromRules(dealId, dealParams);

    if (items.length === 0) {
      return NextResponse.json({ message: 'No checklist items generated. Set deal parameters first.', items: [] });
    }

    // Clear existing deterministic items for regeneration
    await db().delete(checklistItems).where(eq(checklistItems.deal_id, dealId));

    const inserted = await db().insert(checklistItems).values(items).returning();

    return NextResponse.json({ message: `Generated ${inserted.length} checklist items`, items: inserted });
  } catch (error) {
    console.error('Failed to generate checklist:', error);
    return NextResponse.json({ error: 'Failed to generate checklist' }, { status: 500 });
  }
}
