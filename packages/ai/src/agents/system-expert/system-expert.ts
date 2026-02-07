/**
 * System Expert Agent
 * Lightweight agent for platform questions and configuration help.
 */

import { getAnthropicClient } from '../../client';
import { buildSystemExpertPrompt } from './system-prompt';
import type { AgentActivationRecord, AgentMessage } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SystemExpertResult {
  response: string;
  activation: AgentActivationRecord;
}

/**
 * Activate the System Expert Agent.
 * Answers questions about platform features, data model, and configuration.
 * Does NOT access deal-specific data.
 */
export async function activateSystemExpert(
  query: string,
  options?: {
    supabase?: SupabaseClient;
    conversationHistory?: AgentMessage[];
    dealId?: string;
  }
): Promise<SystemExpertResult> {
  const startTime = Date.now();
  const anthropic = getAnthropicClient();
  const model = 'claude-sonnet-4-5-20250929';

  const systemPrompt = buildSystemExpertPrompt();

  // Build messages with history
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (options?.conversationHistory) {
    for (const msg of options.conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: 'user', content: query });

  const response = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  const endTime = Date.now();
  const textBlock = response.content.find((b) => b.type === 'text');
  const responseText = textBlock?.text ?? '';

  const activation: AgentActivationRecord = {
    deal_id: options?.dealId || 'system',
    agent_type: 'system_expert',
    trigger_type: 'chat',
    trigger_source: 'system_expert_chat',
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    total_cost_usd: calculateCost(
      response.usage.input_tokens,
      response.usage.output_tokens
    ),
    model_used: model,
    steps: 1,
    tool_calls: 0,
    specialist_invocations: 0,
    duration_ms: endTime - startTime,
    response_summary: responseText.substring(0, 200),
  };

  // Track activation if supabase client provided
  if (options?.supabase) {
    try {
      await options.supabase.from('agent_activations').insert({
        deal_id: activation.deal_id,
        agent_type: activation.agent_type,
        trigger_type: activation.trigger_type,
        trigger_source: activation.trigger_source,
        input_tokens: activation.input_tokens,
        output_tokens: activation.output_tokens,
        total_cost_usd: activation.total_cost_usd,
        model_used: activation.model_used,
        steps: activation.steps,
        tool_calls: activation.tool_calls,
        specialist_invocations: activation.specialist_invocations,
        duration_ms: activation.duration_ms,
        response_summary: activation.response_summary,
      });
    } catch {
      // Don't fail if tracking fails
    }
  }

  return { response: responseText, activation };
}

function calculateCost(inputTokens: number, outputTokens: number): number {
  // Sonnet pricing
  return (inputTokens * 3.0 + outputTokens * 15.0) / 1_000_000;
}
