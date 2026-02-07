/**
 * Simulation Clock
 * Controls time progression for simulations.
 */

import type { ClockMode, SimulationClockConfig } from '../types/simulation';

export class SimulationClock {
  readonly mode: ClockMode;
  private readonly ratio: number;
  private readonly realStartTime: number;
  private simulatedStartTime: number;
  private manualAdvanceMs: number = 0;
  private paused: boolean = false;
  private pausedAt: number = 0;
  private totalPausedMs: number = 0;

  constructor(config: SimulationClockConfig) {
    this.mode = config.mode;
    this.ratio = config.ratio ?? 100; // 1 sim day = ratio minutes real time
    this.realStartTime = Date.now();
    this.simulatedStartTime = config.startTime
      ? new Date(config.startTime).getTime()
      : this.realStartTime;
  }

  /**
   * Get the current simulated time.
   */
  now(): Date {
    if (this.mode === 'real_time') {
      return new Date(this.simulatedStartTime + this.realElapsedMs() + this.manualAdvanceMs);
    }

    if (this.mode === 'compressed') {
      // ratio minutes of real time = 1 simulated day (86400000 ms)
      const ratioMs = this.ratio * 60 * 1000;
      const simMsPerRealMs = 86400000 / ratioMs;
      const simElapsed = this.realElapsedMs() * simMsPerRealMs;
      return new Date(this.simulatedStartTime + simElapsed + this.manualAdvanceMs);
    }

    // skip_ahead: only advances via manual advance()
    return new Date(this.simulatedStartTime + this.manualAdvanceMs);
  }

  /**
   * Get current time as ISO string.
   */
  nowISO(): string {
    return this.now().toISOString();
  }

  /**
   * Manually advance simulated time by the given milliseconds.
   */
  advance(ms: number): void {
    this.manualAdvanceMs += ms;
  }

  /**
   * Advance by a number of simulated days.
   */
  advanceDays(days: number): void {
    this.advance(days * 86400000);
  }

  /**
   * Pause the clock.
   */
  pause(): void {
    if (!this.paused) {
      this.paused = true;
      this.pausedAt = Date.now();
    }
  }

  /**
   * Resume the clock.
   */
  resume(): void {
    if (this.paused) {
      this.totalPausedMs += Date.now() - this.pausedAt;
      this.paused = false;
    }
  }

  /**
   * Get real elapsed time (excluding paused time).
   */
  private realElapsedMs(): number {
    const currentTime = this.paused ? this.pausedAt : Date.now();
    return currentTime - this.realStartTime - this.totalPausedMs;
  }

  /**
   * Get total simulated elapsed time in ms.
   */
  elapsedSimMs(): number {
    return this.now().getTime() - this.simulatedStartTime;
  }

  /**
   * Get total real elapsed time in ms.
   */
  elapsedRealMs(): number {
    return this.realElapsedMs();
  }

  /**
   * Get clock state for serialization.
   */
  getState() {
    return {
      mode: this.mode,
      simulatedTime: this.nowISO(),
      realStartTime: new Date(this.realStartTime).toISOString(),
      elapsedRealMs: this.realElapsedMs(),
      elapsedSimMs: this.elapsedSimMs(),
    };
  }
}
