import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { SPA_PROVISION_TAXONOMY } from '@ma-deal-os/core';

/**
 * POST /api/provisions/seed
 * Seed the provision_types table with the SPA provision taxonomy.
 */
export async function POST() {
  try {
    // Check if already seeded
    const { data: existing } = await supabase()
      .from('provision_types')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({
        message: 'Provision types already seeded',
        count: existing.length,
      });
    }

    // Insert all provision types
    const insertData = SPA_PROVISION_TAXONOMY.map(p => ({
      code: p.code,
      name: p.name,
      category: p.category,
      parent_code: p.parent_code || null,
      description: p.description,
      applicable_doc_types: p.applicable_doc_types,
      sort_order: p.sort_order,
    }));

    const { data, error } = await supabase()
      .from('provision_types')
      .insert(insertData as any)
      .select();

    if (error) throw error;

    return NextResponse.json({
      message: `Seeded ${(data || []).length} provision types`,
      count: (data || []).length,
    });
  } catch (error) {
    console.error('Failed to seed provisions:', error);
    return NextResponse.json(
      { error: 'Failed to seed provisions', details: String(error) },
      { status: 500 }
    );
  }
}
