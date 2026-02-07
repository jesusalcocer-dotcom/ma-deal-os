import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/deals/[dealId]/documents/[docId]
 * Get document version details, optionally with text content.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { dealId: string; docId: string } }
) {
  try {
    const { dealId, docId } = await params;

    // Check if this is a download request
    const download = req.nextUrl.searchParams.get('download');

    const { data: doc, error } = await supabase()
      .from('document_versions')
      .select('*')
      .eq('id', docId)
      .eq('deal_id', dealId)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docData = doc as any;

    if (download === 'true' && docData.file_path) {
      // Return the DOCX file
      const filePath = path.resolve(docData.file_path);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
            'Content-Length': String(buffer.length),
          },
        });
      }
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    // Return metadata + optional text content
    const response: any = { ...docData };

    // Try to read the text version
    if (docData.file_path) {
      const txtPath = docData.file_path.replace(/\.docx$/, '.txt');
      if (fs.existsSync(txtPath)) {
        response.text_content = fs.readFileSync(txtPath, 'utf-8');
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to get document:', error);
    return NextResponse.json({ error: 'Failed to get document' }, { status: 500 });
  }
}
