import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { generateDisclosureSchedules } from '@ma-deal-os/ai';

export async function POST(
  _req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;

    // Get the latest SPA document version
    const { data: docs, error: docsError } = await supabase()
      .from('document_versions')
      .select('*')
      .eq('deal_id', dealId)
      .order('version_number', { ascending: false });

    if (docsError || !docs || docs.length === 0) {
      return NextResponse.json(
        { error: 'No document versions found for this deal' },
        { status: 404 }
      );
    }

    // Find SPA document — look for the latest version
    const spaDoc = docs[0];

    // Read the document text from file_path
    let spaText = '';
    if (spaDoc.file_path) {
      try {
        const fs = await import('fs/promises');
        // Try .txt version first (generated alongside .docx)
        const txtPath = spaDoc.file_path.replace(/\.docx$/, '.txt');
        try {
          spaText = await fs.readFile(txtPath, 'utf-8');
        } catch {
          spaText = await fs.readFile(spaDoc.file_path, 'utf-8');
        }
      } catch {
        // Fall back to change_summary content if file not readable
        spaText = spaDoc.change_summary?.text || '';
      }
    }

    if (!spaText || spaText.length < 100) {
      return NextResponse.json(
        { error: 'Could not read SPA document text. Ensure a document version exists with readable text.' },
        { status: 400 }
      );
    }

    // Generate disclosure schedules from SPA text
    const result = await generateDisclosureSchedules(spaText);

    // Insert schedules into database (if table exists)
    const insertedSchedules = [];
    for (const schedule of result.schedules) {
      const { data, error } = await supabase()
        .from('disclosure_schedules')
        .insert({
          deal_id: dealId,
          schedule_number: schedule.schedule_number,
          schedule_title: schedule.schedule_title,
          related_rep_section: schedule.related_rep_section,
          related_rep_text: schedule.related_rep_text,
          status: 'pending',
        })
        .select()
        .single();

      if (!error && data) {
        insertedSchedules.push(data);
      } else if (error?.message?.includes('disclosure_schedules')) {
        // Table doesn't exist yet — return extraction results without DB insert
        return NextResponse.json({
          schedules: result.schedules,
          inserted: false,
          metadata: result.metadata,
          note: 'disclosure_schedules table not yet created. Run migration 007.',
        });
      }
    }

    return NextResponse.json({
      schedules: insertedSchedules.length > 0 ? insertedSchedules : result.schedules,
      inserted: insertedSchedules.length > 0,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('Failed to generate disclosure schedules:', error);
    return NextResponse.json(
      { error: 'Failed to generate disclosure schedules' },
      { status: 500 }
    );
  }
}
