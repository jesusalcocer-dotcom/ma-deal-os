import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { generateClosingChecklist } from '@ma-deal-os/ai';

export async function POST(
  _req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;

    // Load deal info
    const { data: deal, error: dealErr } = await supabase()
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealErr || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Load latest SPA document text
    const { data: docs } = await supabase()
      .from('document_versions')
      .select('content')
      .eq('deal_id', dealId)
      .eq('document_type', 'spa')
      .order('version_number', { ascending: false })
      .limit(1);

    // Use SPA text if available, otherwise use a standard conditions template
    let spaText: string;
    if (docs && docs.length > 0 && docs[0].content) {
      spaText = docs[0].content;
    } else {
      // Generate standard closing conditions based on deal parameters
      spaText = buildStandardConditionsText(deal);
    }

    // Generate via AI
    let conditions: any[];
    let deliverables: any[];
    try {
      const result = await generateClosingChecklist(spaText, {
        deal_type: deal.parameters?.deal_type,
        deal_value: deal.deal_value,
      });
      conditions = result.conditions;
      deliverables = result.deliverables;
    } catch {
      // Fallback: standard closing conditions
      conditions = getStandardConditions();
      deliverables = getStandardDeliverables();
    }

    // Create closing checklist record
    const { data: checklist, error: clErr } = await supabase()
      .from('closing_checklists')
      .insert({
        deal_id: dealId,
        status: 'draft',
        conditions_total: conditions.length,
        conditions_satisfied: 0,
        conditions_waived: 0,
      })
      .select()
      .single();

    if (clErr) {
      // If table doesn't exist, return generated data without persisting
      if (clErr.message?.includes('closing_checklists')) {
        return NextResponse.json({
          checklist: null,
          conditions,
          deliverables,
          conditions_total: conditions.length,
          deliverables_total: deliverables.length,
          persisted: false,
        });
      }
      console.error('Failed to create closing checklist:', clErr);
      return NextResponse.json({ error: 'Failed to create closing checklist' }, { status: 500 });
    }

    // Insert conditions
    const conditionRecords = conditions.map((c, i) => ({
      closing_checklist_id: checklist.id,
      deal_id: dealId,
      description: c.description,
      condition_type: c.condition_type,
      category: c.category || 'legal',
      responsible_party: c.responsible_party || 'mutual',
      blocks_closing: c.blocks_closing !== false,
      sort_order: i,
      status: 'pending',
    }));

    if (conditionRecords.length > 0) {
      await supabase().from('closing_conditions').insert(conditionRecords);
    }

    // Insert deliverables
    const deliverableRecords = deliverables.map((d, i) => ({
      closing_checklist_id: checklist.id,
      deal_id: dealId,
      description: d.description,
      deliverable_type: d.deliverable_type || 'other',
      responsible_party: d.responsible_party,
      status: 'pending',
      sort_order: i,
    }));

    if (deliverableRecords.length > 0) {
      await supabase().from('closing_deliverables').insert(deliverableRecords);
    }

    return NextResponse.json({
      checklist,
      conditions_total: conditions.length,
      deliverables_total: deliverables.length,
      persisted: true,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to generate closing checklist:', error);
    return NextResponse.json({ error: 'Failed to generate closing checklist' }, { status: 500 });
  }
}

function buildStandardConditionsText(deal: any): string {
  const dealType = deal.parameters?.deal_type || 'Stock Purchase Agreement';
  const value = deal.deal_value ? `$${(deal.deal_value / 1_000_000).toFixed(1)}M` : 'undisclosed value';
  return `
${dealType.toUpperCase()}

Transaction: ${deal.name}
Value: ${value}

ARTICLE VII — CONDITIONS TO CLOSING

Section 7.1 Conditions to Obligations of Each Party. The obligations of each party to consummate the Closing are subject to satisfaction of the following conditions:
(a) No Injunction. No court of competent jurisdiction shall have issued any order restraining or prohibiting the consummation of the transactions.
(b) HSR Act. Any waiting period under the HSR Act shall have expired or been terminated.
(c) Governmental Approvals. All material governmental approvals shall have been obtained.

Section 7.2 Conditions to Obligations of the Buyer. The obligations of the Buyer to consummate the Closing are subject to satisfaction of the following conditions:
(a) Representations and Warranties. The representations and warranties of the Seller shall be true and correct in all material respects as of the Closing Date.
(b) Covenants. The Seller shall have performed in all material respects all covenants required to be performed by it prior to the Closing Date.
(c) No Material Adverse Effect. Since the date of this Agreement, no Material Adverse Effect shall have occurred.
(d) Officer's Certificate. The Buyer shall have received a certificate signed by an officer of the Seller certifying that the conditions in Sections 7.2(a), (b), and (c) have been satisfied.
(e) Legal Opinion. The Buyer shall have received a legal opinion from counsel to the Seller.
(f) FIRPTA Certificate. The Buyer shall have received a FIRPTA certificate from the Seller.

Section 7.3 Conditions to Obligations of the Seller. The obligations of the Seller to consummate the Closing are subject to satisfaction of the following conditions:
(a) Representations and Warranties. The representations and warranties of the Buyer shall be true and correct in all material respects as of the Closing Date.
(b) Covenants. The Buyer shall have performed in all material respects all covenants required to be performed by it prior to the Closing Date.
(c) Officer's Certificate. The Seller shall have received a certificate signed by an officer of the Buyer certifying that the conditions in Sections 7.3(a) and (b) have been satisfied.
(d) Payment. The Buyer shall have delivered the Purchase Price in accordance with Section 2.3.
`;
}

function getStandardConditions(): any[] {
  return [
    { description: 'No injunction or order restraining the transaction', condition_type: 'mutual', category: 'legal', responsible_party: 'mutual', blocks_closing: true },
    { description: 'HSR Act waiting period expired or terminated', condition_type: 'mutual', category: 'regulatory', responsible_party: 'regulatory', blocks_closing: true },
    { description: 'All required governmental approvals obtained', condition_type: 'mutual', category: 'regulatory', responsible_party: 'regulatory', blocks_closing: true },
    { description: 'Seller representations and warranties true and correct', condition_type: 'buyer', category: 'legal', responsible_party: 'seller', blocks_closing: true },
    { description: 'Seller covenants performed in all material respects', condition_type: 'buyer', category: 'legal', responsible_party: 'seller', blocks_closing: true },
    { description: 'No Material Adverse Effect has occurred', condition_type: 'buyer', category: 'financial', responsible_party: 'seller', blocks_closing: true },
    { description: 'Buyer representations and warranties true and correct', condition_type: 'seller', category: 'legal', responsible_party: 'buyer', blocks_closing: true },
    { description: 'Buyer covenants performed in all material respects', condition_type: 'seller', category: 'legal', responsible_party: 'buyer', blocks_closing: true },
    { description: 'Purchase price payment delivered', condition_type: 'seller', category: 'financial', responsible_party: 'buyer', blocks_closing: true },
  ];
}

function getStandardDeliverables(): any[] {
  return [
    { description: 'Officer certificate — Seller', deliverable_type: 'certificate', responsible_party: 'seller' },
    { description: 'Officer certificate — Buyer', deliverable_type: 'certificate', responsible_party: 'buyer' },
    { description: 'Legal opinion of Seller counsel', deliverable_type: 'legal_opinion', responsible_party: 'seller' },
    { description: 'FIRPTA certificate', deliverable_type: 'certificate', responsible_party: 'seller' },
    { description: 'Board resolution — Seller', deliverable_type: 'resolution', responsible_party: 'seller' },
    { description: 'Board resolution — Buyer', deliverable_type: 'resolution', responsible_party: 'buyer' },
    { description: 'Good standing certificate', deliverable_type: 'good_standing', responsible_party: 'seller' },
    { description: 'Third party consents', deliverable_type: 'consent', responsible_party: 'seller' },
    { description: 'Executed signature pages — SPA', deliverable_type: 'signature_page', responsible_party: 'seller' },
    { description: 'Executed signature pages — SPA', deliverable_type: 'signature_page', responsible_party: 'buyer' },
  ];
}
