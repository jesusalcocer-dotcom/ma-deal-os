/**
 * Simulation Manager
 * Manages simulation lifecycle: setup, run, pause, evaluate.
 */

import type {
  SimulationConfig,
  SimulationState,
  SimulationPhase,
} from '../types/simulation';
import { SimulationClock } from './simulation-clock';

const SIMULATION_PHASES: SimulationPhase[] = [
  'intake',
  'first_draft',
  'dd_markup',
  'negotiation',
  'disclosure_schedules',
  'third_party_coordination',
  'closing_preparation',
  'closing',
  'post_closing',
];

export class SimulationManager {
  private state: SimulationState;
  private clock: SimulationClock;

  constructor(config: SimulationConfig) {
    const id = config.id || crypto.randomUUID();
    this.clock = new SimulationClock(config.clock);

    this.state = {
      id,
      config,
      phase: 'setup',
      buyerDealId: null,
      sellerDealId: null,
      clockState: this.clock.getState(),
      phaseHistory: [],
      metrics: {
        totalEvents: 0,
        totalAgentActivations: 0,
        totalCostUsd: 0,
        issuesDiscovered: 0,
        documentsGenerated: 0,
        emailsExchanged: 0,
      },
      errors: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get the simulation ID.
   */
  get id(): string {
    return this.state.id;
  }

  /**
   * Get the simulation clock.
   */
  getClock(): SimulationClock {
    return this.clock;
  }

  /**
   * Get the current simulation state.
   */
  getState(): SimulationState {
    this.state.clockState = this.clock.getState();
    this.state.updatedAt = new Date().toISOString();
    return { ...this.state };
  }

  /**
   * Set the deal IDs for buyer and seller sides.
   */
  setDealIds(buyerDealId: string, sellerDealId: string): void {
    this.state.buyerDealId = buyerDealId;
    this.state.sellerDealId = sellerDealId;
  }

  /**
   * Get the current simulation phase.
   */
  get currentPhase(): SimulationPhase {
    return this.state.phase;
  }

  /**
   * Advance to the next simulation phase.
   */
  advancePhase(): SimulationPhase {
    // Complete current phase
    const currentEntry = this.state.phaseHistory.find(
      (h) => h.phase === this.state.phase && !h.completedAt
    );
    if (currentEntry) {
      currentEntry.completedAt = this.clock.nowISO();
    }

    // Find next phase
    const currentIndex = SIMULATION_PHASES.indexOf(this.state.phase);
    if (currentIndex >= 0 && currentIndex < SIMULATION_PHASES.length - 1) {
      const nextPhase = SIMULATION_PHASES[currentIndex + 1];
      this.state.phase = nextPhase;
      this.state.phaseHistory.push({
        phase: nextPhase,
        startedAt: this.clock.nowISO(),
        eventsEmitted: 0,
      });
    } else {
      this.state.phase = 'completed';
    }

    return this.state.phase;
  }

  /**
   * Start the simulation (transition from setup to intake).
   */
  start(): void {
    if (this.state.phase !== 'setup') {
      throw new Error(`Cannot start simulation in phase: ${this.state.phase}`);
    }
    this.state.phase = 'intake';
    this.state.phaseHistory.push({
      phase: 'intake',
      startedAt: this.clock.nowISO(),
      eventsEmitted: 0,
    });
  }

  /**
   * Pause the simulation.
   */
  pause(): void {
    this.clock.pause();
    this.state.phase = 'paused';
  }

  /**
   * Resume the simulation.
   */
  resume(phase: SimulationPhase): void {
    this.clock.resume();
    this.state.phase = phase;
  }

  /**
   * Record a simulation event.
   */
  recordEvent(): void {
    this.state.metrics.totalEvents++;
    const currentEntry = this.state.phaseHistory.find(
      (h) => h.phase === this.state.phase && !h.completedAt
    );
    if (currentEntry) {
      currentEntry.eventsEmitted++;
    }
  }

  /**
   * Record an agent activation.
   */
  recordActivation(costUsd: number): void {
    this.state.metrics.totalAgentActivations++;
    this.state.metrics.totalCostUsd += costUsd;
  }

  /**
   * Record a document generation.
   */
  recordDocument(): void {
    this.state.metrics.documentsGenerated++;
  }

  /**
   * Record an email exchange.
   */
  recordEmail(): void {
    this.state.metrics.emailsExchanged++;
  }

  /**
   * Record an issue discovery.
   */
  recordIssueDiscovered(): void {
    this.state.metrics.issuesDiscovered++;
  }

  /**
   * Record an error.
   */
  recordError(error: string): void {
    this.state.errors.push(error);
  }

  /**
   * Mark simulation as failed.
   */
  fail(reason: string): void {
    this.state.phase = 'failed';
    this.recordError(reason);
  }

  /**
   * Mark simulation as completed.
   */
  complete(): void {
    const currentEntry = this.state.phaseHistory.find(
      (h) => h.phase === this.state.phase && !h.completedAt
    );
    if (currentEntry) {
      currentEntry.completedAt = this.clock.nowISO();
    }
    this.state.phase = 'completed';
  }
}
