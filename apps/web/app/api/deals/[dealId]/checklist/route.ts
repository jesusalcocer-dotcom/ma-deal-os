import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { checklistItems } from '@ma-deal-os/db';
import { eq, asc } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = await params;
    const items = await db()
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.deal_id, dealId))
      .orderBy(asc(checklistItems.sort_order));
    return NextResponse.json(items);
  } catch (error) {
    console.error('Failed to get checklist:', error);
    return NextResponse.json({ error: 'Failed to get checklist' }, { status: 500 });
  }
}
