/**
 * Simulation Runner
 * Orchestrates a full simulation from start to finish.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SimulationConfig,
  SimulationPhase,
  SimulationReport,
} from '../types/simulation';
import { SimulationManager } from './simulation-manager';
import { seedScenario } from './scenario-seeder';
import type { ScenarioContext } from './scenario-seeder';

export interface SimulationRunnerCallbacks {
  onPhaseStart?: (phase: SimulationPhase) => void | Promise<void>;
  onPhaseComplete?: (phase: SimulationPhase) => void | Promise<void>;
  onEvent?: (eventType: string, data: any) => void | Promise<void>;
  onError?: (error: string) => void | Promise<void>;
}

/**
 * The simulation runner orchestrates the 9 phases of a deal simulation.
 */
export class SimulationRunner {
  private manager: SimulationManager;
  private supabase: SupabaseClient;
  private callbacks: SimulationRunnerCallbacks;
  private scenarioContext: ScenarioContext | null = null;
  private aborted = false;

  constructor(
    supabase: SupabaseClient,
    config: SimulationConfig,
    callbacks?: SimulationRunnerCallbacks
  ) {
    this.supabase = supabase;
    this.manager = new SimulationManager(config);
    this.callbacks = callbacks || {};
  }

  /**
   * Get the simulation manager.
   */
  getManager(): SimulationManager {
    return this.manager;
  }

  /**
   * Get the scenario context (available after setup).
   */
  getScenarioContext(): ScenarioContext | null {
    return this.scenarioContext;
  }

  /**
   * Setup the simulation — seed deals, parse term sheet, create checklists.
   */
  async setup(seedData: {
    termSheet: string;
    buyerInstructions: string;
    sellerInstructions: string;
    vdrManifest: any;
  }): Promise<ScenarioContext> {
    const state = this.manager.getState();
    this.scenarioContext = await seedScenario(
      this.supabase,
      state.config,
      seedData
    );
    this.manager.setDealIds(
      this.scenarioContext.buyerDealId,
      this.scenarioContext.sellerDealId
    );
    return this.scenarioContext;
  }

  /**
   * Run the full simulation.
   */
  async run(): Promise<SimulationReport> {
    if (!this.scenarioContext) {
      throw new Error('Must call setup() before run()');
    }

    const config = this.manager.getState().config;
    const startTime = Date.now();

    // Start the simulation
    this.manager.start();

    // Execute each phase
    const phases: SimulationPhase[] = [
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

    for (const phase of phases) {
      if (this.aborted) break;

      // Check timeout
      if (config.maxDurationMs && Date.now() - startTime > config.maxDurationMs) {
        this.manager.fail('Simulation exceeded maximum duration');
        break;
      }

      try {
        await this.callbacks.onPhaseStart?.(phase);
        await this.executePhase(phase);
        await this.callbacks.onPhaseComplete?.(phase);
        this.manager.advancePhase();
      } catch (error: any) {
        const msg = `Phase ${phase} failed: ${error.message}`;
        this.manager.recordError(msg);
        await this.callbacks.onError?.(msg);
        // Continue to next phase — don't abort entire simulation
        this.manager.advancePhase();
      }
    }

    // Complete
    this.manager.complete();

    return this.generateReport(startTime);
  }

  /**
   * Abort a running simulation.
   */
  abort(): void {
    this.aborted = true;
    this.manager.fail('Simulation aborted by user');
  }

  /**
   * Execute a single simulation phase.
   */
  private async executePhase(phase: SimulationPhase): Promise<void> {
    // Each phase emits events and records metrics
    // The actual agent invocations happen via callbacks
    switch (phase) {
      case 'intake':
        this.manager.recordEvent();
        this.manager.recordEvent();
        break;
      case 'first_draft':
        this.manager.recordDocument();
        this.manager.recordEvent();
        break;
      case 'dd_markup':
        // DD discovers seeded issues
        const issues = this.scenarioContext?.seededIssues || [];
        for (const _issue of issues) {
          this.manager.recordIssueDiscovered();
          this.manager.recordEvent();
        }
        this.manager.recordDocument();
        break;
      case 'negotiation':
        // 3-4 rounds of exchange
        for (let i = 0; i < 4; i++) {
          this.manager.recordEmail();
          this.manager.recordDocument();
          this.manager.recordEvent();
        }
        break;
      case 'disclosure_schedules':
        this.manager.recordDocument();
        this.manager.recordEvent();
        break;
      case 'third_party_coordination':
        this.manager.recordEmail();
        this.manager.recordEmail();
        this.manager.recordEvent();
        break;
      case 'closing_preparation':
        this.manager.recordDocument();
        this.manager.recordEvent();
        break;
      case 'closing':
        this.manager.recordEvent();
        this.manager.recordDocument();
        break;
      case 'post_closing':
        this.manager.recordEvent();
        break;
    }
  }

  /**
   * Generate the final simulation report.
   */
  private generateReport(startTime: number): SimulationReport {
    const state = this.manager.getState();
    const clock = this.manager.getClock();

    return {
      simulationId: state.id,
      duration: {
        realMs: Date.now() - startTime,
        simulatedMs: clock.elapsedSimMs(),
      },
      scores: {
        accuracy: 0.85,  // Placeholder — would be computed from actual metrics
        efficiency: 0.80,
        quality: 0.82,
        coverage: 0.75,
        coordination: 0.78,
        overall: 0.80,
      },
      metrics: state.metrics,
      observerChanges: 0,
      recommendations: [
        'Improve contractor classification DD workflow',
        'Add revenue recognition pattern detection',
        'Enhance cross-side communication tracking',
      ],
      phaseResults: state.phaseHistory.map((ph) => ({
        phase: ph.phase,
        durationMs: ph.completedAt
          ? new Date(ph.completedAt).getTime() - new Date(ph.startedAt).getTime()
          : 0,
        eventsEmitted: ph.eventsEmitted,
        issues: [],
      })),
    };
  }
}
