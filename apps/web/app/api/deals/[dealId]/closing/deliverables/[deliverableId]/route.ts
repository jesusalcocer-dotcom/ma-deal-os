import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { dealId: string; deliverableId: string } }
) {
  try {
    const { dealId, deliverableId } = await params;
    const body = await req.json();

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (body.status) {
      updates.status = body.status;
      if (body.status === 'received') {
        updates.received_at = new Date().toISOString();
      }
    }
    if (body.document_version_id !== undefined) updates.document_version_id = body.document_version_id;
    if (body.drive_file_id !== undefined) updates.drive_file_id = body.drive_file_id;

    const { data, error } = await supabase()
      .from('closing_deliverables')
      .update(updates)
      .eq('id', deliverableId)
      .eq('deal_id', dealId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update closing deliverable:', error);
      return NextResponse.json({ error: 'Failed to update closing deliverable' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update closing deliverable:', error);
    return NextResponse.json({ error: 'Failed to update closing deliverable' }, { status: 500 });
  }
}
