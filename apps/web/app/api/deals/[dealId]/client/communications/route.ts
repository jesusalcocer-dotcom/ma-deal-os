import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;

    const { data, error } = await supabase()
      .from('client_communications')
      .select('*, client_contacts(name, email)')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('client_communications')) {
        return NextResponse.json([]);
      }
      console.error('Failed to fetch client communications:', error);
      return NextResponse.json({ error: 'Failed to fetch client communications' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Failed to fetch client communications:', error);
    return NextResponse.json({ error: 'Failed to fetch client communications' }, { status: 500 });
  }
}
