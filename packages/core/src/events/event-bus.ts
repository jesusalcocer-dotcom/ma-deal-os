import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { PropagationEventType, PropagationEvent } from '../types/events';
import type { HardConstraint, PartnerConstitution } from '../types/constitution';
import { resolveConsequences } from '../rules/consequence-maps';
import { assignApprovalTier } from '../rules/approval-policy';
import { ActionExecutor } from './action-executor';

interface EmitEventParams {
  deal_id: string;
  event_type: PropagationEventType;
  source_entity_type: string;
  source_entity_id: string;
  payload: Record<string, any>;
  significance?: 1 | 2 | 3 | 4 | 5;
}

export class EventBus {
  private supabase: SupabaseClient;
  private executor: ActionExecutor;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase URL and service role key are required');
    }
    this.supabase = createClient(url, key);
    this.executor = new ActionExecutor(this.supabase);
  }

  async emit(params: EmitEventParams): Promise<PropagationEvent> {
    const { data: event, error } = await this.supabase
      .from('propagation_events')
      .insert({
        deal_id: params.deal_id,
        event_type: params.event_type,
        source_entity_type: params.source_entity_type,
        source_entity_id: params.source_entity_id,
        payload: params.payload,
        significance: params.significance ?? 3,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to emit event: ${error.message}`);
    }

    try {
      await this.process(event);
    } catch (e) {
      console.error(`Error processing event ${event.id}:`, e);
    }

    return event;
  }

  async process(event: PropagationEvent): Promise<void> {
    const consequences = resolveConsequences(event);

    if (consequences.length === 0) {
      await this.markProcessed(event.id);
      return;
    }

    // Determine the highest approval tier needed across all consequences
    const tiers = consequences.map((c) =>
      assignApprovalTier(c.type, event.payload)
    );
    const maxTier = Math.max(...tiers) as 1 | 2 | 3;

    const summary = consequences.map((c) => c.action).join('; ');

    // Create action chain with policy-based tier
    const { data: chain, error: chainError } = await this.supabase
      .from('action_chains')
      .insert({
        deal_id: event.deal_id,
        trigger_event_id: event.id,
        summary: summary.substring(0, 500),
        significance: event.significance,
        approval_tier: maxTier,
        status: 'pending',
      })
      .select()
      .single();

    if (chainError) {
      console.error(`Failed to create action chain: ${chainError.message}`);
      await this.markProcessed(event.id);
      return;
    }

    // Create proposed actions
    const actions = consequences.map((consequence, index) => ({
      chain_id: chain.id,
      sequence_order: index + 1,
      action_type: consequence.type,
      target_entity_type: consequence.target || 'unknown',
      payload: { action: consequence.action, priority: consequence.priority },
      preview: {
        title: `${consequence.type}: ${consequence.action.substring(0, 80)}`,
        description: consequence.action,
      },
      status: 'pending' as const,
    }));

    const { data: insertedActions, error: actionsError } = await this.supabase
      .from('proposed_actions')
      .insert(actions)
      .select();

    if (actionsError) {
      console.error(`Failed to create proposed actions: ${actionsError.message}`);
    }

    // Check constitution constraints before auto-executing
    const constitutionViolation = await this.checkConstitution(
      event.deal_id,
      consequences.map((c) => c.type)
    );

    if (constitutionViolation) {
      // Elevate to Tier 3 and mark constitutional violation
      await this.supabase
        .from('action_chains')
        .update({
          approval_tier: 3,
          summary: `[CONSTITUTIONAL VIOLATION] ${constitutionViolation.description} — ${summary.substring(0, 400)}`,
        })
        .eq('id', chain.id);
    } else if (maxTier === 1 && insertedActions) {
      // Auto-execute Tier 1 chains only if no constitutional violation
      await this.autoExecuteChain(chain.id, insertedActions);
    }

    await this.markProcessed(event.id);
  }

  private async autoExecuteChain(chainId: string, actions: any[]): Promise<void> {
    for (const action of actions) {
      const result = await this.executor.execute(action);
      await this.supabase
        .from('proposed_actions')
        .update({
          status: result.success ? 'executed' : 'failed',
          execution_result: result,
          executed_at: new Date().toISOString(),
        })
        .eq('id', action.id);
    }

    await this.supabase
      .from('action_chains')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', chainId);
  }

  /**
   * Check proposed actions against the deal's constitutional hard constraints.
   * Returns the violated constraint if found, null otherwise.
   */
  private async checkConstitution(
    dealId: string,
    actionTypes: string[]
  ): Promise<HardConstraint | null> {
    try {
      const { data: deal } = await this.supabase
        .from('deals')
        .select('constitution')
        .eq('id', dealId)
        .single();

      const constitution = deal?.constitution as PartnerConstitution | null;
      if (!constitution?.hard_constraints?.length) return null;

      // Pattern-match action types against constraint rules
      for (const constraint of constitution.hard_constraints) {
        if (constraint.consequence !== 'block_and_escalate' && constraint.consequence !== 'escalate') {
          continue;
        }

        // Communication constraints: block client-facing actions
        if (
          constraint.category === 'communication' &&
          actionTypes.some((t) =>
            ['client_communication', 'notification'].includes(t) &&
            constraint.rule.toLowerCase().includes('client')
          )
        ) {
          return constraint;
        }

        // Financial constraints: block financial-impact actions
        if (
          constraint.category === 'financial' &&
          actionTypes.some((t) =>
            ['document_modification', 'negotiation_update'].includes(t)
          ) &&
          constraint.rule.toLowerCase().includes('financial')
        ) {
          return constraint;
        }

        // Negotiation constraints: block negotiation changes
        if (
          constraint.category === 'negotiation' &&
          actionTypes.some((t) =>
            ['negotiation_update', 'document_modification'].includes(t)
          )
        ) {
          return constraint;
        }

        // Drafting constraints: block document modifications
        if (
          constraint.category === 'drafting' &&
          actionTypes.some((t) => t === 'document_modification')
        ) {
          return constraint;
        }

        // Process constraints: generic escalation for any matching action
        if (
          constraint.category === 'process' &&
          constraint.rule.toLowerCase().includes('tier3')
        ) {
          return constraint;
        }
      }

      return null;
    } catch {
      // If constitution column doesn't exist yet, no violation
      return null;
    }
  }

  private async markProcessed(eventId: string): Promise<void> {
    await this.supabase
      .from('propagation_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('id', eventId);
  }
}
