/**
 * Meta Agent — Opus-only intervention agent
 *
 * Activated when other agents fail, conflict, or time out. Gathers full context,
 * calls Claude Opus for analysis, and produces a structured intervention plan.
 *
 * Intervention modes:
 *   - reroute:    redirect to correct agent/model
 *   - decompose:  break complex task into subtasks
 *   - synthesize: resolve conflicting agent outputs
 *   - escalate:   present human with 2-3 concrete options
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../../client';
import { META_AGENT_SYSTEM_PROMPT, buildMetaPrompt } from './meta-prompts';
import type { MetaContext } from './meta-prompts';
import type { MetaTrigger } from './trigger-detector';

export type { MetaContext } from './meta-prompts';
export type { MetaTrigger } from './trigger-detector';

export interface MetaIntervention {
  id?: string;
  trigger: MetaTrigger;
  mode: 'reroute' | 'decompose' | 'synthesize' | 'escalate';
  reasoning: string;
  actions: MetaAction[];
  escalationOptions?: EscalationOption[];
}

export interface MetaAction {
  type: string;
  description: string;
  target?: string;
  params?: Record<string, unknown>;
}

export interface EscalationOption {
  label: string;
  description: string;
  tradeoffs: string;
}

const OPUS_MODEL = 'claude-opus-4-6';

export class MetaAgent {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Run a full Meta Agent intervention cycle:
   *   1. Gather context for the trigger
   *   2. Call Claude Opus with the Meta Agent system prompt
   *   3. Parse the structured intervention decision
   *   4. Record the intervention in the database
   *   5. Write an audit log entry
   */
  async intervene(trigger: MetaTrigger): Promise<MetaIntervention> {
    // 1. Gather full context for the trigger
    const context = await this.gatherContext(trigger);

    // 2. Call Claude Opus
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: OPUS_MODEL,
      max_tokens: 4096,
      system: META_AGENT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildMetaPrompt(trigger, context) }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const responseText = textBlock?.text ?? '';

    // 3. Parse the structured decision
    const intervention = this.parseIntervention(responseText, trigger);

    // 4. Record intervention in the meta_interventions table
    await this.recordIntervention(intervention);

    // 5. Write audit log entry
    await this.auditLog('meta_intervention', {
      trigger: trigger.reason,
      mode: intervention.mode,
      dealId: trigger.dealId,
      agentType: trigger.agentType,
      actionsCount: intervention.actions.length,
      hasEscalation: intervention.mode === 'escalate',
    });

    return intervention;
  }

  /**
   * Gather all relevant context for the Meta Agent to make an informed decision.
   * Queries the deal, recent evaluations, unresolved contradictions, and pending requests.
   */
  private async gatherContext(trigger: MetaTrigger): Promise<MetaContext> {
    const dealId = trigger.dealId;

    const [dealSummary, recentEvaluations, contradictions, existingRequests] = await Promise.all([
      this.getDealSummary(dealId),
      this.getRecentEvaluations(dealId),
      this.getUnresolvedContradictions(dealId),
      this.getPendingRequests(dealId),
    ]);

    return {
      dealSummary,
      recentEvaluations,
      contradictions,
      existingRequests,
    };
  }

  /**
   * Load a brief summary of the deal for context.
   */
  private async getDealSummary(dealId?: string): Promise<string> {
    if (!dealId) return 'No deal associated with this trigger.';

    try {
      const { data, error } = await this.supabase
        .from('deals')
        .select('id, name, code_name, status, deal_value, buyer_type, parameters')
        .eq('id', dealId)
        .single();

      if (error || !data) {
        return `Deal ${dealId} could not be loaded.`;
      }

      const parts: string[] = [
        `**Deal**: ${data.name}${data.code_name ? ` (${data.code_name})` : ''}`,
        `**Status**: ${data.status}`,
      ];
      if (data.deal_value) parts.push(`**Value**: $${Number(data.deal_value).toLocaleString()}`);
      if (data.buyer_type) parts.push(`**Buyer Type**: ${data.buyer_type}`);
      if (data.parameters && typeof data.parameters === 'object') {
        const params = data.parameters as Record<string, unknown>;
        if (params.deal_type) parts.push(`**Deal Type**: ${params.deal_type}`);
        if (params.industry) parts.push(`**Industry**: ${params.industry}`);
        if (params.jurisdiction) parts.push(`**Jurisdiction**: ${params.jurisdiction}`);
      }

      return parts.join('\n');
    } catch {
      return `Deal ${dealId} context unavailable (query failed).`;
    }
  }

  /**
   * Load the 10 most recent self-evaluations, optionally filtered by deal.
   */
  private async getRecentEvaluations(dealId?: string): Promise<string> {
    try {
      let query = this.supabase
        .from('self_evaluations')
        .select('agent_type, overall_score, issues_found, model_used, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (dealId) {
        query = query.eq('deal_id', dealId);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return 'No recent evaluations available.';
      }

      const lines = data.map((e) => {
        const issues = Array.isArray(e.issues_found) ? e.issues_found : [];
        const issueCount = issues.length;
        const score = typeof e.overall_score === 'number' ? e.overall_score.toFixed(2) : '?';
        return `- ${e.agent_type} | score: ${score} | issues: ${issueCount} | model: ${e.model_used} | ${e.created_at}`;
      });

      return lines.join('\n');
    } catch {
      return 'Evaluation data unavailable (query failed).';
    }
  }

  /**
   * Load unresolved consistency check contradictions for the deal.
   */
  private async getUnresolvedContradictions(dealId?: string): Promise<string> {
    try {
      let query = this.supabase
        .from('consistency_checks')
        .select('id, check_type, source_entity_type, conflicting_entity_type, description, severity, created_at')
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (dealId) {
        query = query.eq('deal_id', dealId);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return 'No unresolved contradictions.';
      }

      const lines = data.map((c) => {
        return `- [${c.severity}] ${c.source_entity_type} vs ${c.conflicting_entity_type}: ${c.description} (${c.created_at})`;
      });

      return lines.join('\n');
    } catch {
      return 'Contradiction data unavailable (query failed).';
    }
  }

  /**
   * Load pending agent-to-agent requests for the deal.
   */
  private async getPendingRequests(dealId?: string): Promise<string> {
    try {
      let query = this.supabase
        .from('agent_requests')
        .select('id, requesting_agent, target_agent, request_type, description, status, expires_at, created_at')
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (dealId) {
        query = query.eq('deal_id', dealId);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return 'No pending agent requests.';
      }

      const lines = data.map((r) => {
        return `- ${r.requesting_agent} -> ${r.target_agent} [${r.request_type}] "${r.description}" (status: ${r.status}, expires: ${r.expires_at})`;
      });

      return lines.join('\n');
    } catch {
      return 'Agent request data unavailable (query failed).';
    }
  }

  /**
   * Parse the JSON intervention decision from the Opus response.
   * Falls back to an escalation mode if parsing fails, because if we can't
   * even parse the meta agent's output, a human should look at it.
   */
  private parseIntervention(responseText: string, trigger: MetaTrigger): MetaIntervention {
    // Try to extract JSON from the response (may be wrapped in markdown code fences)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return this.buildFallbackEscalation(trigger, responseText);
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate mode
      const validModes = ['reroute', 'decompose', 'synthesize', 'escalate'] as const;
      const mode = validModes.includes(parsed.mode) ? parsed.mode : 'escalate';

      // Parse actions
      const actions: MetaAction[] = Array.isArray(parsed.actions)
        ? parsed.actions.map((a: Record<string, unknown>) => ({
            type: typeof a.type === 'string' ? a.type : 'unknown',
            description: typeof a.description === 'string' ? a.description : 'No description provided',
            target: typeof a.target === 'string' ? a.target : undefined,
            params: a.params && typeof a.params === 'object' ? a.params as Record<string, unknown> : undefined,
          }))
        : [];

      // Parse escalation options (only for escalate mode)
      let escalationOptions: EscalationOption[] | undefined;
      if (mode === 'escalate' && Array.isArray(parsed.escalation_options)) {
        const parsedOptions: EscalationOption[] = parsed.escalation_options.map((o: Record<string, unknown>) => ({
          label: typeof o.label === 'string' ? o.label : 'Option',
          description: typeof o.description === 'string' ? o.description : '',
          tradeoffs: typeof o.tradeoffs === 'string' ? o.tradeoffs : '',
        }));

        // Ensure we have at least 2 options for escalation
        if (parsedOptions.length < 2) {
          parsedOptions.push({
            label: 'Z: Continue monitoring',
            description: 'Take no immediate action and wait for more data.',
            tradeoffs: 'Risk: issue may worsen | Benefit: no cost | Effort: none',
          });
        }

        escalationOptions = parsedOptions;
      }

      return {
        trigger,
        mode,
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'No reasoning provided.',
        actions,
        escalationOptions,
      };
    } catch {
      return this.buildFallbackEscalation(trigger, responseText);
    }
  }

  /**
   * Build a fallback escalation intervention when the Opus response cannot be parsed.
   */
  private buildFallbackEscalation(trigger: MetaTrigger, rawResponse: string): MetaIntervention {
    return {
      trigger,
      mode: 'escalate',
      reasoning: 'Meta Agent response could not be parsed as structured JSON. Escalating to human with raw analysis.',
      actions: [
        {
          type: 'notify_human',
          description: 'Meta Agent produced a non-parseable response. Human review required.',
          target: 'operator',
          params: { rawResponse: rawResponse.substring(0, 2000) },
        },
      ],
      escalationOptions: [
        {
          label: 'A: Retry Meta Agent with simplified context',
          description: 'Re-run the Meta Agent intervention with a reduced context window to improve parsing reliability.',
          tradeoffs: 'Risk: may lose nuance from trimmed context | Benefit: automated resolution | Effort: low (automated retry)',
        },
        {
          label: 'B: Manually resolve the original trigger',
          description: 'Review the original trigger details and make a direct fix without Meta Agent assistance.',
          tradeoffs: 'Risk: requires human time | Benefit: most reliable resolution | Effort: moderate (manual investigation)',
        },
        {
          label: 'C: Skip and defer',
          description: 'Mark this trigger as deferred and continue operating. The issue may self-resolve or recur with better context.',
          tradeoffs: 'Risk: underlying issue persists | Benefit: no immediate cost | Effort: none',
        },
      ],
    };
  }

  /**
   * Record the intervention in the meta_interventions table.
   */
  private async recordIntervention(intervention: MetaIntervention): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('meta_interventions')
        .insert({
          trigger_reason: intervention.trigger.reason,
          trigger_details: intervention.trigger.details,
          deal_id: intervention.trigger.dealId || null,
          agent_type: intervention.trigger.agentType || null,
          task_type: intervention.trigger.taskType || null,
          mode: intervention.mode,
          reasoning: intervention.reasoning,
          actions: intervention.actions,
          escalation_options: intervention.escalationOptions || null,
        })
        .select('id')
        .single();

      if (data?.id) {
        intervention.id = data.id;
      }
    } catch {
      // Don't fail the intervention if recording fails (table may not exist yet)
      console.warn('Failed to record meta intervention — table may not exist');
    }
  }

  /**
   * Write an entry to the learning audit log.
   */
  private async auditLog(action: string, details: Record<string, unknown>): Promise<void> {
    try {
      await this.supabase.from('learning_audit_log').insert({
        action,
        component: 'meta_agent',
        details,
      });
    } catch {
      // Audit logging is non-critical
      console.warn('Failed to write meta agent audit log entry');
    }
  }
}
