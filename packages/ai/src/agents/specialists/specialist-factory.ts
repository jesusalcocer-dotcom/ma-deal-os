/**
 * Specialist Configuration Framework
 * Factory for creating dynamically configured specialist agents.
 */

import { getAnthropicClient } from '../../client';
import { loadSkills } from '../../skills/skill-loader';
import { findApplicableSkills } from '../../skills/skill-registry';
import type { SpecialistConfig, SpecialistResult, SpecialistRunner } from '../types';

/**
 * Create a specialist runner from a configuration.
 * Returns a function that executes the specialist for a given deal and task input.
 */
export function createSpecialist(config: SpecialistConfig): SpecialistRunner {
  return async (
    dealId: string,
    taskInput: Record<string, any>
  ): Promise<SpecialistResult> => {
    const startTime = Date.now();
    const anthropic = getAnthropicClient();
    const model = config.model || 'claude-sonnet-4-5-20250929';
    const maxTokens = config.max_tokens || 4096;

    // Discover and load applicable skills
    let skillContent = '';
    try {
      const discoveredSkills = findApplicableSkills(config.task_type, {
        agentType: 'specialist',
      });
      // Merge with explicitly requested skills, deduplicate
      const allSkillIds = [...new Set([...config.skills, ...discoveredSkills])];
      if (allSkillIds.length > 0) {
        skillContent = await loadSkills(allSkillIds);
      }
    } catch {
      // Skills loading is optional — don't fail the specialist
    }

    // Build the specialist system prompt
    const systemPrompt = buildSpecialistPrompt(config, skillContent);

    // Build user message with task input
    const userMessage = buildTaskMessage(config, dealId, taskInput);

    // Call Claude
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const endTime = Date.now();
    const textBlock = response.content.find((b) => b.type === 'text');
    const responseText = textBlock?.text ?? '';

    // Calculate cost
    const cost = calculateSpecialistCost(
      model,
      response.usage.input_tokens,
      response.usage.output_tokens
    );

    // Parse structured output
    const parsed = parseSpecialistOutput(responseText, config);

    return {
      task_type: config.task_type,
      output: parsed.output,
      recommendations: parsed.recommendations,
      action_items: parsed.action_items,
      metadata: {
        model,
        tokens_used: response.usage.input_tokens + response.usage.output_tokens,
        cost_usd: cost,
        duration_ms: endTime - startTime,
      },
    };
  };
}

/**
 * Build the specialist's system prompt from its configuration.
 */
function buildSpecialistPrompt(config: SpecialistConfig, skillContent?: string): string {
  const skillsSection = skillContent
    ? `\n## Loaded Skills\n${skillContent}\n`
    : `\n## Skills\n${config.skills.map((s) => `- ${s}`).join('\n')}\n`;

  return `You are a Specialist Agent for M&A transactions.

## Your Specialization
**Task Type**: ${config.task_type}
**Name**: ${config.name}
**Description**: ${config.description}
${skillsSection}
## Instructions
${config.instructions}

## Output Format
Respond with structured JSON in this format:
{
  "output": { ... task-specific results ... },
  "recommendations": ["actionable recommendation 1", ...],
  "action_items": [
    {
      "description": "What needs to be done",
      "priority": "critical|high|normal",
      "suggested_action_type": "document_action|communication_action|negotiation_action|analysis_action|escalation_action"
    }
  ]
}

Be precise, thorough, and actionable. This is a professional M&A context.`;
}

/**
 * Build the task message with context.
 */
function buildTaskMessage(
  config: SpecialistConfig,
  dealId: string,
  taskInput: Record<string, any>
): string {
  const contextLines = config.context_requirements
    .map((req) => {
      const value = taskInput[req];
      if (value !== undefined) {
        return `**${req}**: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`;
      }
      return null;
    })
    .filter(Boolean);

  return `## Task Request
**Deal ID**: ${dealId}
**Task Type**: ${config.task_type}

## Context
${contextLines.length > 0 ? contextLines.join('\n\n') : 'No additional context provided.'}

## Task Input
${JSON.stringify(taskInput, null, 2)}

Please execute this task and provide your analysis.`;
}

/**
 * Parse the specialist's response into structured output.
 */
function parseSpecialistOutput(
  responseText: string,
  _config: SpecialistConfig
): {
  output: Record<string, any>;
  recommendations: string[];
  action_items: Array<{
    description: string;
    priority: string;
    suggested_action_type: string;
  }>;
} {
  // Try to extract JSON from the response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        output: parsed.output || parsed,
        recommendations: parsed.recommendations || [],
        action_items: parsed.action_items || [],
      };
    } catch {
      // Fall through to text parsing
    }
  }

  // Fallback: treat the whole response as unstructured output
  return {
    output: { raw_response: responseText },
    recommendations: [],
    action_items: [],
  };
}

/**
 * Calculate specialist API cost.
 */
function calculateSpecialistCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
    'claude-opus-4-6': { input: 15.0, output: 75.0 },
    'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  };
  const rates = pricing[model] || pricing['claude-sonnet-4-5-20250929'];
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}
