import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/deals/[dealId]/documents
 * List all document versions for a deal, optionally filtered by checklist_item_id.
 */
export async function GET(req: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = await params;
    const checklistItemId = req.nextUrl.searchParams.get('checklist_item_id');

    let query = supabase()
      .from('document_versions')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (checklistItemId) {
      query = query.eq('checklist_item_id', checklistItemId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Failed to list documents:', error);
    return NextResponse.json({ error: 'Failed to list documents' }, { status: 500 });
  }
}
