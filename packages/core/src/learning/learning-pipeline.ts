/**
 * Learning Pipeline
 * Main orchestrator for the knowledge capture and learning system.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { processQualityFeedback, type FeedbackEvent } from './precedent-quality-updater';
import { detectPatterns, generateSkillContent } from './adaptive-skill-generator';
import { generateTestCases } from './test-case-generator';

export interface LearningPipelineResult {
  qualityUpdates: { updated: number; created: number };
  patternsDetected: number;
  testCasesGenerated: number;
  skillsGenerated: string[];
}

/**
 * Run the full learning pipeline for a feedback event.
 */
export async function processFeedbackEvent(
  supabase: SupabaseClient,
  event: FeedbackEvent
): Promise<LearningPipelineResult> {
  // Step 1: Update precedent quality scores
  const qualityUpdates = await processQualityFeedback(supabase, event);

  // Step 2: Check for new patterns
  const patterns = await detectPatterns(supabase, event.deal_id);
  const skillsGenerated: string[] = [];

  for (const pattern of patterns) {
    const skillContent = generateSkillContent(pattern);
    // Store as deal_knowledge entry
    try {
      await supabase.from('deal_knowledge').insert({
        deal_id: event.deal_id,
        knowledge_type: 'attorney_preference',
        content: {
          pattern_id: pattern.id,
          skill_content: skillContent,
          target_type: pattern.target_type,
          modification_type: pattern.modification_type,
          confidence: pattern.confidence,
        },
        confidence: pattern.confidence.toString(),
        sample_size: pattern.occurrences,
        source_feedback_ids: pattern.examples.map((e) => e.feedback_event_id),
      });
      skillsGenerated.push(pattern.id);
    } catch {
      // Table may not exist
    }
  }

  // Step 3: Generate test cases from modified/rejected events
  let testCasesGenerated = 0;
  if (event.event_type === 'modified' || event.event_type === 'rejected') {
    const testCases = await generateTestCases(supabase, {
      dealId: event.deal_id,
      limit: 5,
    });
    testCasesGenerated = testCases.length;
  }

  return {
    qualityUpdates,
    patternsDetected: patterns.length,
    testCasesGenerated,
    skillsGenerated,
  };
}
