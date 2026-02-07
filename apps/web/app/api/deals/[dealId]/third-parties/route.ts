import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;

    const { data, error } = await supabase()
      .from('deal_third_parties')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true });

    if (error) {
      if (error.message?.includes('deal_third_parties')) {
        return NextResponse.json([]);
      }
      console.error('Failed to fetch third parties:', error);
      return NextResponse.json({ error: 'Failed to fetch third parties' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Failed to fetch third parties:', error);
    return NextResponse.json({ error: 'Failed to fetch third parties' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;
    const body = await req.json();

    const { role, firm_name, contact_name, contact_email, deliverables, outstanding_items } = body;

    if (!role || !firm_name) {
      return NextResponse.json({ error: 'role and firm_name are required' }, { status: 400 });
    }

    const { data, error } = await supabase()
      .from('deal_third_parties')
      .insert({
        deal_id: dealId,
        role,
        firm_name,
        contact_name: contact_name || null,
        contact_email: contact_email || null,
        deliverables: deliverables || [],
        outstanding_items: outstanding_items || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create third party:', error);
      return NextResponse.json({ error: 'Failed to create third party' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Failed to create third party:', error);
    return NextResponse.json({ error: 'Failed to create third party' }, { status: 500 });
  }
}
