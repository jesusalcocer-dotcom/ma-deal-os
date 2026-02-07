import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { generateInitialPositions } from '@ma-deal-os/core';

export async function GET(
  _req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;

    const { data, error } = await supabase()
      .from('negotiation_positions')
      .select('*')
      .eq('deal_id', dealId)
      .order('significance', { ascending: false });

    if (error) {
      if (error.message?.includes('negotiation_positions')) {
        // Table doesn't exist — generate positions in-memory from deal params
        const { data: deal } = await supabase()
          .from('deals')
          .select('*')
          .eq('id', dealId)
          .single();

        if (!deal) {
          return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }

        const positions = generateInitialPositions({
          ...deal.parameters,
          deal_value: deal.deal_value,
          buyer_type: deal.buyer_type,
        });

        return NextResponse.json(positions.map((p, i) => ({ ...p, id: `generated-${i}`, deal_id: dealId, status: 'open' })));
      }
      console.error('Failed to fetch positions:', error);
      return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
    }

    // If no positions exist, seed them
    if (!data || data.length === 0) {
      const { data: deal } = await supabase()
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      if (deal) {
        const positions = generateInitialPositions({
          ...deal.parameters,
          deal_value: deal.deal_value,
          buyer_type: deal.buyer_type,
        });

        const inserts = positions.map((p) => ({
          deal_id: dealId,
          ...p,
          status: 'open',
        }));

        const { data: inserted, error: insertError } = await supabase()
          .from('negotiation_positions')
          .insert(inserts)
          .select();

        if (!insertError && inserted) {
          return NextResponse.json(inserted);
        }
      }

      // Return generated positions without DB insert
      const positions = generateInitialPositions({
        deal_value: deal?.deal_value,
        buyer_type: deal?.buyer_type,
        ...deal?.parameters,
      });
      return NextResponse.json(positions.map((p, i) => ({ ...p, id: `generated-${i}`, deal_id: dealId, status: 'open' })));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch positions:', error);
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
  }
}
