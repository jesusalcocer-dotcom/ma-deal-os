import { NextResponse } from 'next/server';
import { DEFAULT_PARTNER_POLICY } from '@ma-deal-os/core';

export async function GET() {
  return NextResponse.json(DEFAULT_PARTNER_POLICY);
}
