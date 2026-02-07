import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;

    // Get deal details for funds flow calculation
    const { data: deal, error: dealErr } = await supabase()
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealErr || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Check if closing checklist has funds_flow already
    const { data: checklist } = await supabase()
      .from('closing_checklists')
      .select('funds_flow')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (checklist?.funds_flow) {
      return NextResponse.json(checklist.funds_flow);
    }

    // Generate funds flow from deal parameters
    const dealValue = deal.deal_value || 0;
    const params2 = deal.parameters || {};
    const escrowPercent = params2.escrow_percentage || 10;
    const escrowAmount = dealValue * (escrowPercent / 100);

    const fundsFlow = {
      purchase_price: dealValue,
      adjustments: [
        { description: 'Working capital adjustment (estimated)', amount: 0, type: 'adjustment' },
        { description: 'Indebtedness payoff', amount: 0, type: 'deduction' },
        { description: 'Transaction expenses', amount: 0, type: 'deduction' },
      ],
      escrow: {
        amount: escrowAmount,
        percentage: escrowPercent,
        release_schedule: params2.escrow_release_schedule || '12 months post-closing',
      },
      net_to_seller: dealValue - escrowAmount,
      wire_instructions: {
        confirmed: false,
        parties: ['Seller', 'Escrow Agent'],
      },
    };

    return NextResponse.json(fundsFlow);
  } catch (error) {
    console.error('Failed to get funds flow:', error);
    return NextResponse.json({ error: 'Failed to get funds flow' }, { status: 500 });
  }
}
