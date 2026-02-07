/**
 * Manager Agent Implementation
 * Handles on-demand queries, event-driven evaluation, and scheduled tasks.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../../client';
import { loadManagerContext } from './context-loader';
import { buildManagerPrompt } from './system-prompt';
import { ModelRouter } from '../../routing/model-router';
import type {
  ManagerContext,
  AgentActivationRecord,
  TriggerType,
  AgentMessage,
} from '../types';

export interface ManagerActivationResult {
  response: string;
  context: ManagerContext;
  activation: AgentActivationRecord;
  suggested_actions?: Array<{
    description: string;
    action_type: string;
    requires_approval: boolean;
  }>;
}

interface ActivateManagerOptions {
  /** The deal to activate for */
  dealId: string;
  /** What triggered this activation */
  triggerType: TriggerType;
  /** Source of the trigger (e.g., 'chat', 'dd.finding_confirmed', 'cron.morning') */
  triggerSource: string;
  /** User query for chat-based activations */
  query?: string;
  /** Event data for event-driven activations */
  eventData?: Record<string, any>;
  /** Conversation history for chat continuity */
  conversationHistory?: AgentMessage[];
  /** Model override — defaults to sonnet for routine, opus for strategic */
  model?: string;
}

/**
 * Activate the Manager Agent.
 * Loads deal context, builds prompt, calls Claude, tracks activation.
 */
export async function activateManager(
  supabase: SupabaseClient,
  options: ActivateManagerOptions
): Promise<ManagerActivationResult> {
  const startTime = Date.now();
  const {
    dealId,
    triggerType,
    triggerSource,
    query,
    eventData,
    conversationHistory,
    model: modelOverride,
  } = options;

  // 1. Load deal context
  const context = await loadManagerContext(supabase, dealId);

  // 2. Build system prompt
  const systemPrompt = buildManagerPrompt(context);

  // 3. Build messages
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Include conversation history if provided
  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Build the user message based on trigger type
  let userMessage: string;
  switch (triggerType) {
    case 'chat':
      userMessage = query || 'What is the current status of this deal?';
      break;
    case 'event':
      userMessage = buildEventMessage(eventData || {});
      break;
    case 'scheduled':
      userMessage = buildScheduledMessage(triggerSource);
      break;
    case 'manual':
      userMessage = query || 'Provide a quick status update on this deal.';
      break;
    default:
      userMessage = query || 'What should I focus on right now?';
  }
  messages.push({ role: 'user', content: userMessage });

  // 4. Select model — use ModelRouter if no override, fall back to legacy selectModel
  let model: string;
  let routerSelection: { model: string; reason: string } | undefined;
  if (modelOverride) {
    model = modelOverride;
  } else {
    try {
      const router = new ModelRouter(supabase);
      const dealParams = context.deal?.parameters as Record<string, unknown> | undefined;
      const selection = await router.getModel('manager_chat', {
        dealId,
        dealType: dealParams?.deal_type as string | undefined,
        industry: dealParams?.industry as string | undefined,
        jurisdiction: dealParams?.jurisdiction as string | undefined,
        dealValue: dealParams?.deal_value ? Number(dealParams.deal_value) : undefined,
      });
      model = selection.modelId;
      routerSelection = { model: selection.model, reason: selection.reason };
    } catch {
      // Fallback if routing table doesn't exist yet
      model = selectModel(triggerType, triggerSource);
    }
  }

  // 5. Call Claude
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  const endTime = Date.now();
  const textBlock = response.content.find((b) => b.type === 'text');
  const responseText = textBlock?.text ?? '';

  // 6. Parse suggested actions from response
  const suggestedActions = parseActions(responseText);

  // 7. Build activation record
  const activation: AgentActivationRecord = {
    deal_id: dealId,
    agent_type: 'manager',
    trigger_type: triggerType,
    trigger_source: triggerSource,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    total_cost_usd: calculateCost(
      model,
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

  // 8. Track activation in database
  await trackActivation(supabase, activation);

  return {
    response: responseText,
    context,
    activation,
    suggested_actions: suggestedActions.length > 0 ? suggestedActions : undefined,
  };
}

/**
 * Select the appropriate model based on trigger type.
 * Strategic tasks use Opus, routine tasks use Sonnet.
 */
function selectModel(triggerType: TriggerType, triggerSource: string): string {
  // Use Sonnet for all routine operations to manage costs
  // Opus would be used for complex strategic synthesis if needed
  if (
    triggerType === 'event' &&
    (triggerSource.includes('critical') || triggerSource.includes('escalat'))
  ) {
    return 'claude-sonnet-4-5-20250929'; // Could upgrade to opus for critical events
  }
  return 'claude-sonnet-4-5-20250929';
}

/**
 * Build a user message for event-driven activations.
 */
function buildEventMessage(eventData: Record<string, any>): string {
  const eventType = eventData.event_type || 'unknown';
  const entityType = eventData.entity_type || 'unknown';
  const description = eventData.description || '';

  return `An event has occurred that requires your analysis:

**Event Type**: ${eventType}
**Entity**: ${entityType}
**Details**: ${description}
${eventData.risk_level ? `**Risk Level**: ${eventData.risk_level}` : ''}
${eventData.payload ? `**Additional Data**: ${JSON.stringify(eventData.payload, null, 2)}` : ''}

Please analyze this event in the context of the deal and recommend:
1. What immediate actions should be taken?
2. Does this affect any other workstreams or deadlines?
3. Does this require escalation to partner level?
4. Are there any action chains that should be created?`;
}

/**
 * Build a user message for scheduled activations.
 */
function buildScheduledMessage(triggerSource: string): string {
  if (triggerSource.includes('briefing') || triggerSource.includes('morning')) {
    return `Generate a morning briefing for this deal. Include:
1. **Deal Status Summary**: Current state and progress since last briefing
2. **Overnight Activity**: Any changes or events in the last 24 hours
3. **Pending Approvals**: Number and urgency of items awaiting approval
4. **Critical Deadlines**: Items due in the next 7 days with status
5. **Recommended Priorities**: Top 3-5 things to focus on today
6. **Risk Flags**: Any emerging risks or concerns

Format your response as structured JSON with these fields:
{
  "summary": "...",
  "overnight_activity": ["..."],
  "pending_approvals": N,
  "critical_deadlines": [{ "item": "...", "date": "...", "status": "..." }],
  "recommended_priorities": ["..."],
  "risk_flags": ["..."]
}`;
  }

  return `Perform a scheduled review of this deal. Check for:
1. Overdue items
2. Upcoming deadlines
3. Stalled workstreams
4. Risk accumulation
Provide a brief status update.`;
}

/**
 * Parse action recommendations from agent response.
 */
function parseActions(
  response: string
): Array<{ description: string; action_type: string; requires_approval: boolean }> {
  const actions: Array<{
    description: string;
    action_type: string;
    requires_approval: boolean;
  }> = [];

  // Look for structured action recommendations
  const actionPattern = /\*\*Action\*\*:\s*(.+?)(?:\n|$)/gi;
  let match;
  while ((match = actionPattern.exec(response)) !== null) {
    const description = match[1].trim();
    const requiresApproval =
      response.includes('Tier 3') || response.includes('Partner approval');
    actions.push({
      description,
      action_type: inferActionType(description),
      requires_approval: requiresApproval,
    });
  }

  return actions;
}

/**
 * Infer action type from description.
 */
function inferActionType(description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes('draft') || lower.includes('document')) return 'document_action';
  if (lower.includes('email') || lower.includes('communicate'))
    return 'communication_action';
  if (lower.includes('negotiate') || lower.includes('position'))
    return 'negotiation_action';
  if (lower.includes('review') || lower.includes('analyze')) return 'analysis_action';
  if (lower.includes('escalat') || lower.includes('approv')) return 'escalation_action';
  if (lower.includes('closing') || lower.includes('condition'))
    return 'closing_action';
  return 'general_action';
}

/**
 * Calculate API cost based on model and token usage.
 */
function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Pricing as of early 2026
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
    'claude-opus-4-6': { input: 15.0, output: 75.0 },
    'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  };

  const rates = pricing[model] || pricing['claude-sonnet-4-5-20250929'];
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

/**
 * Track agent activation in the database.
 */
async function trackActivation(
  supabase: SupabaseClient,
  activation: AgentActivationRecord
): Promise<void> {
  try {
    await supabase.from('agent_activations').insert({
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
    // Don't fail the activation if tracking fails (table might not exist yet)
    console.warn('Failed to track agent activation — table may not exist');
  }
}
