/**
 * Outcome Signal Tracker
 * Tracks downstream outcomes — what happens AFTER an agent produces output.
 * Hooks into approval workflows and deal state changes to record metrics.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export class OutcomeTracker {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Record an outcome signal in the outcome_signals table.
   */
  async recordSignal(
    dealId: string,
    signalType: string,
    agentType: string,
    metricName: string,
    metricValue: number,
    context?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.supabase.from('outcome_signals').insert({
        deal_id: dealId,
        signal_type: signalType,
        agent_type: agentType,
        metric_name: metricName,
        metric_value: metricValue,
        context: context || null,
      });
    } catch {
      console.warn('Failed to record outcome signal — table may not exist');
    }
  }

  /**
   * Track when a checklist item is never completed after N days.
   */
  async trackUnusedChecklistItem(dealId: string, itemId: string, agentType: string): Promise<void> {
    await this.recordSignal(dealId, 'ignored_output', agentType, 'checklist_item_unused', 1.0, { itemId });
  }

  /**
   * Track when a negotiation position changes after being marked "agreed".
   */
  async trackReopenedPosition(dealId: string, positionId: string): Promise<void> {
    await this.recordSignal(dealId, 'position_reopened', 'negotiation_tracking', 'agreed_then_changed', 1.0, { positionId });
  }

  /**
   * Track when a disclosure schedule is completely rewritten.
   */
  async trackScheduleRewrite(dealId: string, scheduleId: string): Promise<void> {
    await this.recordSignal(dealId, 'rewrite', 'disclosure_generation', 'schedule_rewritten', 1.0, { scheduleId });
  }

  /**
   * Track action item calibration — ratio of generated vs acted-upon items.
   */
  async trackActionItemCalibration(dealId: string): Promise<{ generated: number; actedOn: number; calibration: number }> {
    const { data: emails } = await this.supabase
      .from('deal_emails')
      .select('action_items')
      .eq('deal_id', dealId);

    if (!emails || emails.length === 0) {
      return { generated: 0, actedOn: 0, calibration: 0 };
    }

    let generated = 0;
    let actedOn = 0;

    for (const email of emails) {
      const items = email.action_items as Array<{ status?: string }> | null;
      if (Array.isArray(items)) {
        generated += items.length;
        actedOn += items.filter(i => i.status && i.status !== 'ignored' && i.status !== 'pending').length;
      }
    }

    const calibration = generated > 0 ? actedOn / generated : 0;
    await this.recordSignal(dealId, 'calibration', 'email_extraction', 'action_item_calibration', calibration, {
      generated,
      acted_on: actedOn,
    });

    return { generated, actedOn, calibration };
  }

  /**
   * Track when an agent output is approved vs modified vs rejected.
   * Extends feedback events to also create outcome signals.
   */
  async trackFeedbackOutcome(
    dealId: string,
    agentType: string,
    eventType: 'approved' | 'modified' | 'rejected'
  ): Promise<void> {
    const metricValue = eventType === 'approved' ? 1.0 : eventType === 'modified' ? 0.5 : 0.0;
    await this.recordSignal(dealId, 'calibration', agentType, 'feedback_outcome', metricValue, { event_type: eventType });
  }

  /**
   * Compute stale checklist items — items pending for more than the given number of days.
   */
  async trackStaleChecklistItems(dealId: string, staleDays: number = 14): Promise<number> {
    const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: staleItems } = await this.supabase
      .from('checklist_items')
      .select('id')
      .eq('deal_id', dealId)
      .eq('status', 'pending')
      .lt('created_at', cutoff);

    const count = staleItems?.length || 0;

    if (count > 0) {
      await this.recordSignal(dealId, 'ignored_output', 'checklist_management', 'stale_items_count', count, {
        stale_days: staleDays,
      });
    }

    return count;
  }

  /**
   * Get all outcome signals for a deal.
   */
  async getSignals(dealId: string, options?: { signalType?: string; agentType?: string }): Promise<unknown[]> {
    let query = this.supabase
      .from('outcome_signals')
      .select('*')
      .eq('deal_id', dealId)
      .order('measured_at', { ascending: false });

    if (options?.signalType) {
      query = query.eq('signal_type', options.signalType);
    }
    if (options?.agentType) {
      query = query.eq('agent_type', options.agentType);
    }

    const { data } = await query.limit(100);
    return data || [];
  }
}
