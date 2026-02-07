import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { PropagationEventType, PropagationEvent } from '../types/events';
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

    // Auto-execute Tier 1 chains immediately
    if (maxTier === 1 && insertedActions) {
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

  private async markProcessed(eventId: string): Promise<void> {
    await this.supabase
      .from('propagation_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('id', eventId);
  }
}
