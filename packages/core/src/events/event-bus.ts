import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { PropagationEventType, PropagationEvent } from '../types/events';
import { resolveConsequences } from '../rules/consequence-maps';

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

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase URL and service role key are required');
    }
    this.supabase = createClient(url, key);
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

    // Process synchronously for now (Phase 4+ adds background processing)
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
      // No consequences, just mark as processed
      await this.markProcessed(event.id);
      return;
    }

    // Build summary from consequences
    const summary = consequences
      .map((c) => c.action)
      .join('; ');

    // Determine approval tier based on significance
    const approvalTier = event.significance >= 4 ? 3 : event.significance >= 2 ? 2 : 1;

    // Create action chain
    const { data: chain, error: chainError } = await this.supabase
      .from('action_chains')
      .insert({
        deal_id: event.deal_id,
        trigger_event_id: event.id,
        summary: summary.substring(0, 500),
        significance: event.significance,
        approval_tier: approvalTier as 1 | 2 | 3,
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

    const { error: actionsError } = await this.supabase
      .from('proposed_actions')
      .insert(actions);

    if (actionsError) {
      console.error(`Failed to create proposed actions: ${actionsError.message}`);
    }

    await this.markProcessed(event.id);
  }

  private async markProcessed(eventId: string): Promise<void> {
    await this.supabase
      .from('propagation_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('id', eventId);
  }
}
