import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { callClaude } from '@ma-deal-os/ai';

export async function POST(
  _req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;

    // Get deal details
    const { data: deal, error: dealError } = await supabase()
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Get current positions
    let positions: any[] = [];
    const { data: posData } = await supabase()
      .from('negotiation_positions')
      .select('*')
      .eq('deal_id', dealId);

    if (posData) positions = posData;

    const prompt = `Generate a negotiation strategy roadmap for this M&A deal:

Deal: ${deal.name}
Structure: ${deal.parameters?.transaction_structure || 'N/A'}
Value: $${Number(deal.deal_value || 0).toLocaleString()}
Buyer: ${deal.buyer_name} (${deal.buyer_type})
Target: ${deal.target_name}
Seller: ${deal.seller_name}

Current positions:
${positions.map((p) => `- ${p.provision_label}: ${p.our_current_position || 'Not set'} vs ${p.their_current_position || 'Awaiting'}`).join('\n')}

Output JSON with these fields:
{
  "strategy_summary": "2-3 paragraph strategy overview",
  "key_leverage_points": ["point1", "point2", ...],
  "concession_priorities": [{"provision": "...", "concession": "...", "in_exchange_for": "..."}],
  "red_lines": ["absolute non-negotiable 1", ...],
  "fallback_positions": {"provision_type": "fallback position", ...}
}
Output ONLY the JSON object.`;

    const response = await callClaude([{ role: 'user', content: prompt }], {
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 4096,
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to generate roadmap' }, { status: 500 });
    }

    const roadmap = JSON.parse(jsonMatch[0]);

    // Try to save to database
    const { data: saved, error: saveError } = await supabase()
      .from('negotiation_roadmaps')
      .insert({
        deal_id: dealId,
        ...roadmap,
        generated_by: 'ai',
      })
      .select()
      .single();

    if (saveError) {
      // Table may not exist — return roadmap without saving
      return NextResponse.json({
        deal_id: dealId,
        ...roadmap,
        saved: false,
        note: saveError.message?.includes('negotiation_roadmaps')
          ? 'Table not created yet. Run migration 008.'
          : saveError.message,
      });
    }

    return NextResponse.json(saved);
  } catch (error) {
    console.error('Failed to generate roadmap:', error);
    return NextResponse.json({ error: 'Failed to generate roadmap' }, { status: 500 });
  }
}
