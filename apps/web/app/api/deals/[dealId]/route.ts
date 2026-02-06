import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { deals } from '@ma-deal-os/db';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = await params;
    const result = await db().select().from(deals).where(eq(deals.id, dealId));
    if (result.length === 0) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Failed to get deal:', error);
    return NextResponse.json({ error: 'Failed to get deal' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = await params;
    const body = await req.json();

    const updateData: Record<string, any> = { updated_at: new Date() };

    const allowedFields = [
      'name', 'code_name', 'status', 'parameters', 'deal_value',
      'industry', 'buyer_type', 'target_name', 'buyer_name', 'seller_name',
      'expected_signing_date', 'expected_closing_date',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const [updated] = await db()
      .update(deals)
      .set(updateData)
      .where(eq(deals.id, dealId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update deal:', error);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = await params;
    const [updated] = await db()
      .update(deals)
      .set({ status: 'terminated', updated_at: new Date() })
      .where(eq(deals.id, dealId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to archive deal:', error);
    return NextResponse.json({ error: 'Failed to archive deal' }, { status: 500 });
  }
}
