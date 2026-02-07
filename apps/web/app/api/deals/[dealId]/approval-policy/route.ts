import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { DEFAULT_PARTNER_POLICY } from '@ma-deal-os/core';

export async function GET(
  _req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;

    // Look for a deal-specific policy first
    const { data: dealPolicy } = await supabase()
      .from('approval_policies')
      .select('*')
      .eq('scope_type', 'deal')
      .eq('scope_id', dealId)
      .eq('is_active', true)
      .single();

    if (dealPolicy) {
      return NextResponse.json(dealPolicy);
    }

    // Fall back to default policy
    return NextResponse.json({
      ...DEFAULT_PARTNER_POLICY,
      _source: 'default',
      _deal_id: dealId,
    });
  } catch (error) {
    console.error('Failed to fetch approval policy:', error);
    return NextResponse.json({ error: 'Failed to fetch approval policy' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;
    const body = await req.json();

    // Validate rules array exists
    if (!body.rules || !Array.isArray(body.rules)) {
      return NextResponse.json({ error: 'rules array is required' }, { status: 400 });
    }

    // Check if a deal-specific policy already exists
    const { data: existing } = await supabase()
      .from('approval_policies')
      .select('id')
      .eq('scope_type', 'deal')
      .eq('scope_id', dealId)
      .eq('is_active', true)
      .single();

    if (existing) {
      // Update existing policy
      const { data, error } = await supabase()
        .from('approval_policies')
        .update({
          name: body.name || `Deal ${dealId} Policy`,
          description: body.description || 'Deal-specific approval policy',
          rules: body.rules,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update policy:', error);
        return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
      }

      return NextResponse.json(data);
    } else {
      // Insert new deal-specific policy
      const { data, error } = await supabase()
        .from('approval_policies')
        .insert({
          name: body.name || `Deal ${dealId} Policy`,
          description: body.description || 'Deal-specific approval policy',
          scope_type: 'deal',
          scope_id: dealId,
          rules: body.rules,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create policy:', error);
        return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 });
      }

      return NextResponse.json(data, { status: 201 });
    }
  } catch (error) {
    console.error('Failed to upsert approval policy:', error);
    return NextResponse.json({ error: 'Failed to upsert approval policy' }, { status: 500 });
  }
}
