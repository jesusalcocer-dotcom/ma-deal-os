import { NextResponse } from 'next/server';

export async function GET() {
  // Return placeholder report — would be populated after simulation completes
  return NextResponse.json({
    report: null,
    message: 'No simulation report available. Run a simulation first.',
  });
}
