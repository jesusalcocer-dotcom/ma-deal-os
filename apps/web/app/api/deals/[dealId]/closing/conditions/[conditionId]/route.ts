import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { dealId: string; conditionId: string } }
) {
  try {
    const { dealId, conditionId } = await params;
    const body = await req.json();

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (body.status) {
      updates.status = body.status;
      if (body.status === 'satisfied') {
        updates.satisfied_at = new Date().toISOString();
      }
    }
    if (body.evidence !== undefined) updates.evidence = body.evidence;
    if (body.evidence_document_id !== undefined) updates.evidence_document_id = body.evidence_document_id;

    const { data, error } = await supabase()
      .from('closing_conditions')
      .update(updates)
      .eq('id', conditionId)
      .eq('deal_id', dealId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update closing condition:', error);
      return NextResponse.json({ error: 'Failed to update closing condition' }, { status: 500 });
    }

    // Update checklist counters
    if (data && data.closing_checklist_id && body.status) {
      const { data: allConditions } = await supabase()
        .from('closing_conditions')
        .select('status')
        .eq('closing_checklist_id', data.closing_checklist_id);

      if (allConditions) {
        const satisfied = allConditions.filter((c: any) => c.status === 'satisfied').length;
        const waived = allConditions.filter((c: any) => c.status === 'waived').length;
        await supabase()
          .from('closing_checklists')
          .update({
            conditions_satisfied: satisfied,
            conditions_waived: waived,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.closing_checklist_id);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update closing condition:', error);
    return NextResponse.json({ error: 'Failed to update closing condition' }, { status: 500 });
  }
}
