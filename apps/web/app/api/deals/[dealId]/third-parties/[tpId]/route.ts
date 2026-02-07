import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { dealId: string; tpId: string } }
) {
  try {
    const { dealId, tpId } = await params;
    const body = await req.json();

    const allowedFields = [
      'role', 'firm_name', 'contact_name', 'contact_email',
      'deliverables', 'last_communication_at', 'outstanding_items', 'status',
    ];
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const { data, error } = await supabase()
      .from('deal_third_parties')
      .update(updates)
      .eq('id', tpId)
      .eq('deal_id', dealId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update third party:', error);
      return NextResponse.json({ error: 'Failed to update third party' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Third party not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update third party:', error);
    return NextResponse.json({ error: 'Failed to update third party' }, { status: 500 });
  }
}
