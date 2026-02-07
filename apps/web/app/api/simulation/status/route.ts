import { NextResponse } from 'next/server';

// In-memory simulation state (would be in database for production)
let currentSimulation: any = null;

export async function GET() {
  if (!currentSimulation) {
    return NextResponse.json({
      status: 'idle',
      message: 'No simulation is currently running',
      simulation: null,
    });
  }

  return NextResponse.json({
    status: currentSimulation.phase === 'completed' ? 'completed' : 'running',
    simulation: currentSimulation,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      currentSimulation = {
        id: crypto.randomUUID(),
        phase: 'setup',
        startedAt: new Date().toISOString(),
        config: body.config || {
          name: 'DataFlow Analytics Simulation',
          dealType: 'stock_purchase',
          purchasePrice: 150000000,
          industry: 'technology',
          clock: { mode: 'compressed', ratio: 100 },
          observerEnabled: true,
        },
        metrics: {
          totalEvents: 0,
          totalAgentActivations: 0,
          totalCostUsd: 0,
          issuesDiscovered: 0,
          documentsGenerated: 0,
          emailsExchanged: 0,
        },
      };
      return NextResponse.json({ status: 'started', simulation: currentSimulation });
    }

    if (action === 'stop') {
      currentSimulation = null;
      return NextResponse.json({ status: 'stopped' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
