/**
 * 5-Layer Prompt Assembler
 * Assembles complete agent prompts from 5 layers:
 *   1. Constitutional Rules (immutable)
 *   2. Firm Knowledge (curated)
 *   3. Learned Patterns (dynamic, from Reflection Engine)
 *   4. Deal Intelligence (per-deal shared context)
 *   5. Task Exemplars (few-shot examples + distillation)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getConstitutionalRules } from './layers/constitutional';
import { getFirmKnowledge } from './layers/firm-knowledge';
import { getRelevantPatterns, formatPatterns, type InjectedPattern } from './layers/learned-patterns';
import { getDealIntelligence, formatIntelligence, type DealInsight } from './layers/deal-intelligence';
import { getExemplars, formatExemplars, type InjectedExemplar } from './layers/exemplars';

export interface AssembledPrompt {
  systemPrompt: string;
  userMessage: string;
  metadata: {
    patternsInjected: string[];
    exemplarsInjected: string[];
    intelligenceInjected: string[];
    layerSizes: Record<string, number>;
  };
}

export class PromptAssembler {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Assemble a complete 5-layer prompt for an agent invocation.
   */
  async assemble(params: {
    agentType: string;
    taskType: string;
    dealId?: string;
    baseSystemPrompt: string;
    taskContent: string;
  }): Promise<AssembledPrompt> {
    // Fetch all 5 layers in parallel
    const [constitutional, firmKnowledge, patterns, intelligence, exemplars] = await Promise.all([
      getConstitutionalRules(this.supabase),
      getFirmKnowledge(this.supabase, params.agentType),
      getRelevantPatterns(this.supabase, params.agentType, params.dealId),
      params.dealId ? getDealIntelligence(this.supabase, params.dealId) : Promise.resolve([] as DealInsight[]),
      getExemplars(this.supabase, params.taskType, params.dealId),
    ]);

    // Build system prompt from layers
    const sections: string[] = [params.baseSystemPrompt];

    // Layer 1: Constitutional Rules (always present)
    sections.push('\n\n## CONSTITUTIONAL RULES (NEVER OVERRIDE)\n' + constitutional);

    // Layer 2: Firm Knowledge (if available)
    if (firmKnowledge) {
      sections.push('\n\n## FIRM PRACTICES\n' + firmKnowledge);
    }

    // Layer 3: Learned Patterns (if any match)
    const formattedPatterns = formatPatterns(patterns);
    if (formattedPatterns) {
      sections.push('\n\n## LEARNED PATTERNS (apply where relevant)\n' + formattedPatterns);
    }

    // Layer 4: Deal Intelligence (if any insights exist)
    const formattedIntelligence = formatIntelligence(intelligence);
    if (formattedIntelligence) {
      sections.push('\n\n## DEAL INTELLIGENCE (what the team knows)\n' + formattedIntelligence);
    }

    // Layer 5: Task Exemplars (if any match)
    const formattedExemplars = formatExemplars(exemplars);
    if (formattedExemplars) {
      sections.push('\n\n## REFERENCE EXAMPLES\n' + formattedExemplars);
    }

    const systemPrompt = sections.join('');

    return {
      systemPrompt,
      userMessage: params.taskContent,
      metadata: {
        patternsInjected: patterns.map((p: InjectedPattern) => p.id),
        exemplarsInjected: exemplars.map((e: InjectedExemplar) => e.id),
        intelligenceInjected: intelligence.map((i: DealInsight) => i.id),
        layerSizes: {
          base: params.baseSystemPrompt.length,
          constitutional: constitutional.length,
          firmKnowledge: firmKnowledge.length,
          patterns: formattedPatterns.length,
          intelligence: formattedIntelligence.length,
          exemplars: formattedExemplars.length,
          total: systemPrompt.length,
        },
      },
    };
  }
}
