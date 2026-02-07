import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { generateClientCommunication } from '@ma-deal-os/ai';

export async function POST(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;
    const body = await req.json();
    const { type, client_contact_id } = body;

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    // Load deal context
    const { data: deal, error: dealErr } = await supabase()
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealErr || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Load checklist status
    const { data: checklist } = await supabase()
      .from('checklist_items')
      .select('status')
      .eq('deal_id', dealId);

    const total = checklist?.length || 0;
    const completed = checklist?.filter((c: any) => c.status === 'complete').length || 0;

    // Load pending action items
    const { data: actionItems } = await supabase()
      .from('client_action_items')
      .select('description, priority, due_date')
      .eq('deal_id', dealId)
      .eq('status', 'pending')
      .limit(10);

    // Generate communication via AI pipeline
    let subject: string;
    let emailBody: string;
    try {
      const result = await generateClientCommunication({
        deal_name: deal.name,
        deal_status: deal.status,
        deal_value: deal.deal_value,
        checklist_progress: { total, completed },
        pending_action_items: actionItems || [],
        communication_type: type,
      });
      subject = result.subject;
      emailBody = result.body;
    } catch {
      // Fallback template if AI pipeline fails
      subject = `${deal.name} — ${type === 'status_update' ? 'Status Update' : 'Action Required'}`;
      emailBody = `Dear Client,\n\nThis is an automated ${type} regarding ${deal.name}.\n\nChecklist progress: ${completed}/${total} items complete.\n${(actionItems || []).length > 0 ? '\nPending action items:\n' + (actionItems || []).map((a: any) => `- ${a.description}`).join('\n') : ''}\n\nPlease let us know if you have any questions.\n\nBest regards`;
    }

    // Store as draft communication
    const { data: comm, error: commErr } = await supabase()
      .from('client_communications')
      .insert({
        deal_id: dealId,
        client_contact_id: client_contact_id || null,
        type,
        subject,
        body: emailBody,
        status: 'draft',
        generated_by: 'system',
      })
      .select()
      .single();

    if (commErr) {
      // If table doesn't exist, return the generated content without persisting
      if (commErr.message?.includes('client_communications')) {
        return NextResponse.json({ subject, body: emailBody, status: 'draft', persisted: false });
      }
      console.error('Failed to store communication:', commErr);
      return NextResponse.json({ error: 'Failed to store communication' }, { status: 500 });
    }

    return NextResponse.json(comm, { status: 201 });
  } catch (error) {
    console.error('Failed to generate communication:', error);
    return NextResponse.json({ error: 'Failed to generate communication' }, { status: 500 });
  }
}
