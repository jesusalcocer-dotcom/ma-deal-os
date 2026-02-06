import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { deals } from '@ma-deal-os/db';
import { eq } from 'drizzle-orm';
import { parseTermSheet } from '@ma-deal-os/ai';
import { extractTextFromDocx, extractTextFromPdf } from '@ma-deal-os/integrations';

export async function POST(req: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = await params;
    const [deal] = await db().select().from(deals).where(eq(deals.id, dealId));
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;

    if (file.name.endsWith('.pdf')) {
      text = await extractTextFromPdf(buffer);
    } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      text = await extractTextFromDocx(buffer);
    } else if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Upload .docx, .pdf, .md, or .txt.' }, { status: 400 });
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 });
    }

    const result = await parseTermSheet(text);

    const existingParams = (deal.parameters || {}) as Record<string, any>;
    const mergedParams = { ...existingParams, ...result.parameters };

    const updateData: Record<string, any> = {
      parameters: mergedParams,
      updated_at: new Date(),
    };
    if (result.metadata.target_name?.value) updateData.target_name = result.metadata.target_name.value;
    if (result.metadata.buyer_name?.value) updateData.buyer_name = result.metadata.buyer_name.value;
    if (result.metadata.seller_name?.value) updateData.seller_name = result.metadata.seller_name.value;
    if (result.metadata.industry?.value) updateData.industry = result.metadata.industry.value;
    if (result.metadata.deal_value?.value) updateData.deal_value = String(result.metadata.deal_value.value);
    if (result.metadata.buyer_type?.value) updateData.buyer_type = result.metadata.buyer_type.value;

    const [updated] = await db().update(deals).set(updateData).where(eq(deals.id, dealId)).returning();

    return NextResponse.json({ deal: updated, extractions: result.extractions, metadata: result.metadata });
  } catch (error) {
    console.error('Failed to parse term sheet:', error);
    return NextResponse.json({ error: 'Failed to parse term sheet' }, { status: 500 });
  }
}
