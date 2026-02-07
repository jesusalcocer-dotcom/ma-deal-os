import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = await params;
    const { data, error } = await supabase()
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get deal:', error);
    return NextResponse.json({ error: 'Failed to get deal' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = await params;
    const body = await req.json();

    const updateData: Record<string, any> = { ...body, updated_at: new Date().toISOString() };

    const { data: updated, error } = await supabase()
      .from('deals')
      .update(updateData as any)
      .eq('id', dealId)
      .select()
      .single();

    if (error || !updated) {
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
    const { data: updated, error } = await supabase()
      .from('deals')
      .update({ status: 'terminated', updated_at: new Date().toISOString() } as any)
      .eq('id', dealId)
      .select()
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Deal terminated', deal: updated });
  } catch (error) {
    console.error('Failed to delete deal:', error);
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
  }
}
