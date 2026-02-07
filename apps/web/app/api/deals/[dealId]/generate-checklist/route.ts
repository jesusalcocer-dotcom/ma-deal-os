import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { generateChecklistFromRules } from '@ma-deal-os/core';
import type { DealParameters } from '@ma-deal-os/core';

export async function POST(_req: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = await params;
    const { data: dealData, error: dealError } = await supabase()
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !dealData) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = dealData as any;
    const dealParams = (deal.parameters || {}) as DealParameters;
    const items = generateChecklistFromRules(dealId, dealParams);

    if (items.length === 0) {
      return NextResponse.json({ message: 'No checklist items generated. Set deal parameters first.', items: [] });
    }

    // Clear existing deterministic items for regeneration
    const { error: deleteError } = await supabase()
      .from('checklist_items')
      .delete()
      .eq('deal_id', dealId);

    if (deleteError) throw deleteError;

    // Insert new items
    const { data: inserted, error: insertError } = await supabase()
      .from('checklist_items')
      .insert(items as any)
      .select();

    if (insertError) throw insertError;

    return NextResponse.json({ message: `Generated ${(inserted || []).length} checklist items`, items: inserted || [] });
  } catch (error) {
    console.error('Failed to generate checklist:', error);
    return NextResponse.json({ error: 'Failed to generate checklist' }, { status: 500 });
  }
}
