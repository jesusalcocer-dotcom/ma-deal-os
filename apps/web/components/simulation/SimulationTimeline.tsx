'use client';

const PHASES = [
  { id: 'intake', label: 'Intake', description: 'Process client instructions, parse term sheet' },
  { id: 'first_draft', label: 'First Draft', description: 'Generate initial SPA draft' },
  { id: 'dd_markup', label: 'DD & Markup', description: 'Due diligence review, mark up SPA' },
  { id: 'negotiation', label: 'Negotiation', description: '3-4 rounds of markup exchange' },
  { id: 'disclosure_schedules', label: 'Disclosures', description: 'Populate disclosure schedules' },
  { id: 'third_party_coordination', label: 'Third Parties', description: 'Escrow, R&W insurance' },
  { id: 'closing_preparation', label: 'Closing Prep', description: 'Checklist, conditions, funds flow' },
  { id: 'closing', label: 'Closing', description: 'Condition satisfaction, signature' },
  { id: 'post_closing', label: 'Post-Closing', description: 'Obligation tracking' },
];

interface SimulationTimelineProps {
  currentPhase: string;
  phaseHistory: Array<{
    phase: string;
    startedAt: string;
    completedAt?: string;
    eventsEmitted: number;
  }>;
}

export function SimulationTimeline({ currentPhase, phaseHistory }: SimulationTimelineProps) {
  const completedPhases = new Set(
    phaseHistory.filter((p) => p.completedAt).map((p) => p.phase)
  );

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold mb-3">Simulation Timeline</h3>

      <div className="space-y-2">
        {PHASES.map((phase) => {
          const isCompleted = completedPhases.has(phase.id);
          const isCurrent = currentPhase === phase.id;
          const historyEntry = phaseHistory.find((p) => p.phase === phase.id);

          return (
            <div
              key={phase.id}
              className={`flex items-center gap-3 p-2 rounded ${
                isCurrent ? 'bg-blue-50 border border-blue-200' :
                isCompleted ? 'bg-green-50' : ''
              }`}
            >
              {/* Status indicator */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isCompleted ? 'bg-green-500 text-white' :
                isCurrent ? 'bg-blue-500 text-white animate-pulse' :
                'bg-gray-200 text-gray-500'
              }`}>
                {isCompleted ? '\u2713' : isCurrent ? '\u25B6' : '\u2022'}
              </div>

              {/* Phase info */}
              <div className="flex-1">
                <p className="text-sm font-medium">{phase.label}</p>
                <p className="text-xs text-muted-foreground">{phase.description}</p>
              </div>

              {/* Event count */}
              {historyEntry && (
                <span className="text-xs text-muted-foreground">
                  {historyEntry.eventsEmitted} events
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
