/**
 * Simulation Framework Types
 */

export type SimulationPhase =
  | 'setup'
  | 'intake'
  | 'first_draft'
  | 'dd_markup'
  | 'negotiation'
  | 'disclosure_schedules'
  | 'third_party_coordination'
  | 'closing_preparation'
  | 'closing'
  | 'post_closing'
  | 'completed'
  | 'paused'
  | 'failed';

export type ClockMode = 'real_time' | 'compressed' | 'skip_ahead';

export interface SimulationClockConfig {
  mode: ClockMode;
  /** For compressed mode: 1 simulated day = ratio minutes of real time */
  ratio?: number;
  /** Starting simulation time (defaults to now) */
  startTime?: string;
}

export interface SimulationConfig {
  /** Unique simulation ID */
  id?: string;
  /** Name for this simulation run */
  name: string;
  /** Clock configuration */
  clock: SimulationClockConfig;
  /** Deal parameters to seed */
  dealType: 'stock_purchase' | 'asset_purchase' | 'merger';
  /** Purchase price */
  purchasePrice: number;
  /** Industry */
  industry: string;
  /** Enable Observer monitoring */
  observerEnabled: boolean;
  /** Max simulation duration in ms (real time) */
  maxDurationMs?: number;
  /** Seeded DD findings to discover */
  seededIssueCount?: number;
}

export interface SimulationState {
  id: string;
  config: SimulationConfig;
  phase: SimulationPhase;
  buyerDealId: string | null;
  sellerDealId: string | null;
  clockState: {
    mode: ClockMode;
    simulatedTime: string;
    realStartTime: string;
    elapsedRealMs: number;
    elapsedSimMs: number;
  };
  phaseHistory: Array<{
    phase: SimulationPhase;
    startedAt: string;
    completedAt?: string;
    eventsEmitted: number;
  }>;
  metrics: {
    totalEvents: number;
    totalAgentActivations: number;
    totalCostUsd: number;
    issuesDiscovered: number;
    documentsGenerated: number;
    emailsExchanged: number;
  };
  errors: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientAgentConfig {
  role: 'seller' | 'buyer';
  name: string;
  title: string;
  personality: {
    responseSpeed: 'fast' | 'moderate' | 'slow';
    detailLevel: 'terse' | 'moderate' | 'detailed';
    temperament: 'anxious' | 'confident' | 'aggressive';
  };
  objectives: string[];
  knowledge: string[];
  imperfections: string[];
}

export interface ThirdPartyAgentConfig {
  role: string;
  name: string;
  responseDelayMs: number;
  deliverables: string[];
  complications: string[];
}

export interface SimulationReport {
  simulationId: string;
  duration: {
    realMs: number;
    simulatedMs: number;
  };
  scores: {
    accuracy: number;
    efficiency: number;
    quality: number;
    coverage: number;
    coordination: number;
    overall: number;
  };
  metrics: SimulationState['metrics'];
  observerChanges: number;
  recommendations: string[];
  phaseResults: Array<{
    phase: SimulationPhase;
    durationMs: number;
    eventsEmitted: number;
    issues: string[];
  }>;
}
