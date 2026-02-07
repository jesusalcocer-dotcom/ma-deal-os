import type { ConsequenceMap, Consequence, PropagationEvent } from '../types/events';

export const consequenceMaps: ConsequenceMap[] = [
  // 1. DD finding confirmed → document modification + disclosure schedule update + notification + client communication
  {
    trigger: 'dd.finding_confirmed',
    consequences: [
      {
        type: 'document_modification',
        target: 'document',
        action: 'Update relevant document sections based on DD finding',
        priority: 'high',
      },
      {
        type: 'disclosure_schedule_update',
        target: 'disclosure_schedule',
        action: 'Add or update disclosure schedule entry for confirmed finding',
        priority: 'high',
      },
      {
        type: 'notification',
        target: 'deal_team',
        action: 'Notify deal team of confirmed DD finding',
        priority: 'immediate',
      },
      {
        type: 'client_communication',
        target: 'client',
        action: 'Draft client communication regarding DD finding impact',
        priority: 'high',
      },
    ],
  },

  // 2. Document markup received → analysis + negotiation update + checklist status update + checklist ball-with update
  {
    trigger: 'document.markup_received',
    consequences: [
      {
        type: 'analysis',
        target: 'document',
        action: 'Analyze markup changes and identify key modifications',
        priority: 'immediate',
      },
      {
        type: 'negotiation_update',
        target: 'negotiation',
        action: 'Update negotiation positions based on markup',
        priority: 'high',
      },
      {
        type: 'checklist_status_update',
        target: 'checklist_item',
        action: 'Update checklist item status based on markup receipt',
        priority: 'normal',
      },
      {
        type: 'checklist_ball_with_update',
        target: 'checklist_item',
        action: 'Update ball-with assignment after markup received',
        priority: 'normal',
      },
    ],
  },

  // 3. Email position extracted → negotiation update + agent evaluation
  {
    trigger: 'email.position_extracted',
    consequences: [
      {
        type: 'negotiation_update',
        target: 'negotiation',
        action: 'Update negotiation tracker with extracted position',
        priority: 'high',
      },
      {
        type: 'agent_evaluation',
        target: 'agent',
        action: 'Evaluate strategic implications of extracted position',
        priority: 'normal',
      },
    ],
  },

  // 4. Checklist item overdue → notification + critical path update
  {
    trigger: 'checklist.item_overdue',
    consequences: [
      {
        type: 'notification',
        target: 'deal_team',
        action: 'Send overdue notification to responsible party',
        priority: 'immediate',
      },
      {
        type: 'critical_path_update',
        target: 'deal',
        action: 'Recalculate critical path considering overdue item',
        priority: 'high',
      },
    ],
  },

  // 5. Deal parameters updated → checklist regeneration + document review
  {
    trigger: 'deal.parameters_updated',
    consequences: [
      {
        type: 'checklist_regeneration',
        target: 'checklist',
        action: 'Regenerate checklist items based on updated parameters',
        priority: 'high',
      },
      {
        type: 'document_review',
        target: 'document',
        action: 'Flag documents that may need revision based on parameter changes',
        priority: 'normal',
      },
    ],
  },

  // 6. Closing condition satisfied → closing checklist update + closing readiness check
  {
    trigger: 'closing.condition_satisfied',
    consequences: [
      {
        type: 'closing_checklist_update',
        target: 'closing_checklist',
        action: 'Mark closing condition as satisfied in closing checklist',
        priority: 'immediate',
      },
      {
        type: 'closing_readiness_check',
        target: 'deal',
        action: 'Evaluate overall closing readiness after condition satisfied',
        priority: 'high',
      },
    ],
  },
];

function evaluateConditions(
  conditions: ConsequenceMap['conditions'],
  payload: Record<string, any>
): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every((condition) => {
    const value = payload[condition.field];
    if (condition.eq !== undefined) return value === condition.eq;
    if (condition.in !== undefined) return condition.in.includes(value);
    if (condition.gte !== undefined) return typeof value === 'number' && value >= condition.gte;
    return true;
  });
}

export function resolveConsequences(
  event: Pick<PropagationEvent, 'event_type' | 'payload' | 'significance'>
): Consequence[] {
  const results: Consequence[] = [];

  for (const map of consequenceMaps) {
    if (map.trigger !== event.event_type) continue;
    if (!evaluateConditions(map.conditions, event.payload)) continue;
    results.push(...map.consequences);
  }

  return results;
}
