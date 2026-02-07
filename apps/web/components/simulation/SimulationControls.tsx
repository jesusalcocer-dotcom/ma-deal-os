'use client';

import { useState } from 'react';

interface SimulationControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function SimulationControls({ isRunning, onStart, onStop }: SimulationControlsProps) {
  const [clockMode, setClockMode] = useState<'real_time' | 'compressed' | 'skip_ahead'>('compressed');
  const [ratio, setRatio] = useState(100);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold mb-3">Simulation Controls</h3>

      <div className="space-y-3">
        {/* Clock Mode */}
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Clock Mode</label>
          <div className="flex gap-2">
            {(['real_time', 'compressed', 'skip_ahead'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setClockMode(mode)}
                disabled={isRunning}
                className={`px-3 py-1 rounded text-sm ${
                  clockMode === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'border hover:bg-muted'
                } disabled:opacity-50`}
              >
                {mode.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Compression Ratio */}
        {clockMode === 'compressed' && (
          <div>
            <label className="text-sm text-muted-foreground block mb-1">
              Compression: 1 sim day = {ratio} real minutes
            </label>
            <input
              type="range"
              min={10}
              max={1000}
              value={ratio}
              onChange={(e) => setRatio(Number(e.target.value))}
              disabled={isRunning}
              className="w-full"
            />
          </div>
        )}

        {/* Start/Stop */}
        <div className="flex gap-2">
          {!isRunning ? (
            <button
              onClick={onStart}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Start Simulation
            </button>
          ) : (
            <button
              onClick={onStop}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Stop Simulation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
