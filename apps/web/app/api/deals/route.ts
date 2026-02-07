import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { createDealFolderStructure } from '@ma-deal-os/integrations';

export async function GET() {
  try {
    const { data, error } = await supabase()
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to list deals:', error);
    return NextResponse.json({ error: 'Failed to list deals' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code_name, target_name, buyer_name, seller_name, industry, deal_value, parameters, buyer_type } = body;

    if (!name) {
      return NextResponse.json({ error: 'Deal name is required' }, { status: 400 });
    }

    const { data: dealData, error } = await supabase()
      .from('deals')
      .insert({
        name,
        code_name: code_name || null,
        status: 'active',
        parameters: parameters || {},
        deal_value: deal_value ? String(deal_value) : null,
        industry: industry || null,
        buyer_type: buyer_type || null,
        target_name: target_name || null,
        buyer_name: buyer_name || null,
        seller_name: seller_name || null,
        email_thread_ids: [],
      } as any)
      .select()
      .single();

    if (error) throw error;

    const deal = dealData as any;

    // Try to create Google Drive folder (non-blocking)
    try {
      const driveResult = await createDealFolderStructure(name, code_name);
      await supabase()
        .from('deals')
        .update({
          drive_folder_id: driveResult.rootFolderId,
          drive_folder_url: driveResult.rootFolderUrl,
        } as any)
        .eq('id', deal.id);
      deal.drive_folder_id = driveResult.rootFolderId;
      deal.drive_folder_url = driveResult.rootFolderUrl;
    } catch (driveError) {
      console.warn('Google Drive folder creation failed (non-fatal):', driveError);
    }

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error('Failed to create deal:', error);
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }
}
