import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/learning/exemplars — list exemplars with filtering
 * Params: document_type, source_type, distillation_eligible, limit
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('document_type');
    const sourceType = searchParams.get('source_type');
    const distillationEligible = searchParams.get('distillation_eligible');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const db = supabase();
    let query = db
      .from('exemplar_library')
      .select('*', { count: 'exact' })
      .order('quality_score', { ascending: false })
      .limit(limit);

    if (documentType) query = query.eq('document_type', documentType);
    if (sourceType) query = query.eq('source_type', sourceType);
    if (distillationEligible === 'true') query = query.eq('distillation_eligible', true);

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ exemplars: data || [], count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch exemplars';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/learning/exemplars — add a new exemplar
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source_type, source_firm, document_type, deal_characteristics, content, quality_score } = body;

    if (!source_type || !document_type || !content || quality_score === undefined) {
      return NextResponse.json(
        { error: 'source_type, document_type, content, and quality_score are required' },
        { status: 400 }
      );
    }

    const db = supabase();

    const { data, error } = await db.from('exemplar_library').insert({
      source_type,
      source_firm: source_firm || null,
      document_type,
      deal_characteristics: deal_characteristics || null,
      content,
      quality_score,
      distillation_eligible: source_type === 'internal_opus',
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ exemplar: data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create exemplar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
