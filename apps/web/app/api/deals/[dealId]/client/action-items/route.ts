import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = supabase()
      .from('client_action_items')
      .select('*, client_contacts(name, email)')
      .eq('deal_id', dealId)
      .order('priority', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      if (error.message?.includes('client_action_items')) {
        return NextResponse.json([]);
      }
      console.error('Failed to fetch client action items:', error);
      return NextResponse.json({ error: 'Failed to fetch client action items' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Failed to fetch client action items:', error);
    return NextResponse.json({ error: 'Failed to fetch client action items' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;
    const body = await req.json();

    const { description, detail, category, due_date, priority, client_contact_id, blocks_checklist_items, related_disclosure_schedule_id } = body;

    if (!description) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }

    const { data, error } = await supabase()
      .from('client_action_items')
      .insert({
        deal_id: dealId,
        client_contact_id: client_contact_id || null,
        description,
        detail: detail || null,
        category: category || null,
        due_date: due_date || null,
        priority: priority || 'normal',
        blocks_checklist_items: blocks_checklist_items || null,
        related_disclosure_schedule_id: related_disclosure_schedule_id || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create client action item:', error);
      return NextResponse.json({ error: 'Failed to create client action item' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Failed to create client action item:', error);
    return NextResponse.json({ error: 'Failed to create client action item' }, { status: 500 });
  }
}
