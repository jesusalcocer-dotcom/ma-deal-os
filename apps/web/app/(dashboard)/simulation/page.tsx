'use client';

import { useEffect, useState, useCallback } from 'react';
import { SimulationControls } from '@/components/simulation/SimulationControls';
import { SimulationTimeline } from '@/components/simulation/SimulationTimeline';

interface SimulationStatus {
  status: 'idle' | 'running' | 'completed';
  simulation: any;
}

export default function SimulationPage() {
  const [simStatus, setSimStatus] = useState<SimulationStatus>({
    status: 'idle',
    simulation: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/simulation/status');
      const data = await res.json();
      setSimStatus(data);
    } catch {
      // API may not have data yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleStart = async () => {
    try {
      await fetch('/api/simulation/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      fetchStatus();
    } catch {
      // Handle error
    }
  };

  const handleStop = async () => {
    try {
      await fetch('/api/simulation/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      fetchStatus();
    } catch {
      // Handle error
    }
  };

  const isRunning = simStatus.status === 'running';
  const sim = simStatus.simulation;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Simulation Dashboard</h1>
        <p className="text-muted-foreground">
          Run and monitor full deal lifecycle simulations
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="md:col-span-1">
            <SimulationControls
              isRunning={isRunning}
              onStart={handleStart}
              onStop={handleStop}
            />

            {/* Metrics */}
            {sim && (
              <div className="mt-4 rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Metrics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Events</span>
                    <span className="font-mono">{sim.metrics?.totalEvents ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Agent Activations</span>
                    <span className="font-mono">{sim.metrics?.totalAgentActivations ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cost</span>
                    <span className="font-mono">${(sim.metrics?.totalCostUsd ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Issues Found</span>
                    <span className="font-mono">{sim.metrics?.issuesDiscovered ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Documents</span>
                    <span className="font-mono">{sim.metrics?.documentsGenerated ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Emails</span>
                    <span className="font-mono">{sim.metrics?.emailsExchanged ?? 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="md:col-span-2">
            <SimulationTimeline
              currentPhase={sim?.phase || 'setup'}
              phaseHistory={sim?.phaseHistory || []}
            />

            {/* Status */}
            <div className="mt-4 rounded-lg border p-4">
              <h3 className="font-semibold mb-2">Status</h3>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  simStatus.status === 'running' ? 'bg-green-500 animate-pulse' :
                  simStatus.status === 'completed' ? 'bg-blue-500' :
                  'bg-gray-300'
                }`} />
                <span className="text-sm capitalize">{simStatus.status}</span>
              </div>
              {sim?.startedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Started: {new Date(sim.startedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
