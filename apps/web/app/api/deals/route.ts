import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { deals } from '@ma-deal-os/db';
import { desc, eq } from 'drizzle-orm';
import { createDealFolderStructure } from '@ma-deal-os/integrations';

export async function GET() {
  try {
    const result = await db().select().from(deals).orderBy(desc(deals.created_at));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to list deals:', error);
    return NextResponse.json({ error: 'Failed to list deals' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code_name, target_name, buyer_name, seller_name, industry, deal_value, parameters, buyer_type } = body;

    if (!name) {
      return NextResponse.json({ error: 'Deal name is required' }, { status: 400 });
    }

    const [deal] = await db()
      .insert(deals)
      .values({
        name,
        code_name: code_name || null,
        status: 'active',
        parameters: parameters || {},
        deal_value: deal_value ? String(deal_value) : null,
        industry: industry || null,
        buyer_type: buyer_type || null,
        target_name: target_name || null,
        buyer_name: buyer_name || null,
        seller_name: seller_name || null,
      })
      .returning();

    // Try to create Google Drive folder (non-blocking)
    try {
      const driveResult = await createDealFolderStructure(name, code_name);
      await db()
        .update(deals)
        .set({
          drive_folder_id: driveResult.rootFolderId,
          drive_folder_url: driveResult.rootFolderUrl,
        })
        .where(eq(deals.id, deal.id));
      deal.drive_folder_id = driveResult.rootFolderId;
      deal.drive_folder_url = driveResult.rootFolderUrl;
    } catch (driveError) {
      console.warn('Google Drive folder creation failed (non-fatal):', driveError);
    }

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error('Failed to create deal:', error);
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }
}
