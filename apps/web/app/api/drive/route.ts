import { NextRequest, NextResponse } from 'next/server';
import { createDealFolderStructure } from '@ma-deal-os/integrations';

export async function POST(req: NextRequest) {
  try {
    const { dealName, codeName } = await req.json();
    if (!dealName) {
      return NextResponse.json({ error: 'dealName is required' }, { status: 400 });
    }
    const result = await createDealFolderStructure(dealName, codeName);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to create drive folder:', error);
    return NextResponse.json({ error: 'Failed to create drive folder' }, { status: 500 });
  }
}
