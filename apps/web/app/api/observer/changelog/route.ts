import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const needsReview = searchParams.get('needs_review');

    const db = supabase();

    let query = db
      .from('observer_changelog')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (needsReview === 'true') {
      query = query.eq('needs_human_review', true).eq('reverted', false);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message, entries: [], total: 0 },
        { status: 200 }
      );
    }

    return NextResponse.json({
      entries: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch changelog', entries: [], total: 0 },
      { status: 200 }
    );
  }
}
