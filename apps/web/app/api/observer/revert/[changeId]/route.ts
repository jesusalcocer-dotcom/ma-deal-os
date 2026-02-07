import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ changeId: string }> }
) {
  try {
    const { changeId } = await params;
    const db = supabase();

    // Mark the changelog entry as reverted
    const { data, error } = await db
      .from('observer_changelog')
      .update({
        reverted: true,
        reverted_at: new Date().toISOString(),
      })
      .eq('id', changeId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Changelog entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      reverted: true,
      entry: data,
      message: `Change ${changeId} marked as reverted`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to revert change' },
      { status: 500 }
    );
  }
}
