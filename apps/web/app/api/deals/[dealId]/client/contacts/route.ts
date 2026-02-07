import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;

    const { data, error } = await supabase()
      .from('client_contacts')
      .select('*')
      .eq('deal_id', dealId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      if (error.message?.includes('client_contacts')) {
        return NextResponse.json([]);
      }
      console.error('Failed to fetch client contacts:', error);
      return NextResponse.json({ error: 'Failed to fetch client contacts' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Failed to fetch client contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch client contacts' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;
    const body = await req.json();

    const { name, email, role, is_primary, communication_preferences } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 });
    }

    const { data, error } = await supabase()
      .from('client_contacts')
      .insert({
        deal_id: dealId,
        name,
        email,
        role: role || null,
        is_primary: is_primary || false,
        communication_preferences: communication_preferences || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create client contact:', error);
      return NextResponse.json({ error: 'Failed to create client contact' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Failed to create client contact:', error);
    return NextResponse.json({ error: 'Failed to create client contact' }, { status: 500 });
  }
}
