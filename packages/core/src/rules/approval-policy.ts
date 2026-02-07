import type { ProposedActionType } from '../types/events';

export interface ApprovalPolicyRule {
  action_type: ProposedActionType | '*';
  conditions?: Array<{ field: string; eq?: any; in?: any[]; gte?: number }>;
  tier: 1 | 2 | 3;
  description: string;
}

export interface ApprovalPolicy {
  id?: string;
  name: string;
  description: string;
  scope_type: 'default' | 'role' | 'user' | 'deal';
  scope_id?: string;
  rules: ApprovalPolicyRule[];
  is_active: boolean;
}

// Default partner approval policy — ref SPEC-V2-COMPLETE.md Section 6.2
export const DEFAULT_PARTNER_POLICY: ApprovalPolicy = {
  name: 'Default Partner Policy',
  description: 'Standard approval tiers for M&A deal operations',
  scope_type: 'default',
  is_active: true,
  rules: [
    // Tier 1: Auto-execute (no human approval needed)
    { action_type: 'notification', tier: 1, description: 'Notifications auto-send' },
    { action_type: 'status_update', tier: 1, description: 'Status updates auto-apply' },
    { action_type: 'checklist_status_update', tier: 1, description: 'Checklist status changes auto-apply' },
    { action_type: 'checklist_ball_with_update', tier: 1, description: 'Ball-with assignments auto-update' },
    { action_type: 'timeline_update', tier: 1, description: 'Timeline updates auto-apply' },
    { action_type: 'critical_path_update', tier: 1, description: 'Critical path recalculations auto-run' },
    { action_type: 'closing_checklist_update', tier: 1, description: 'Closing checklist updates auto-apply' },
    { action_type: 'analysis', tier: 1, description: 'Analysis tasks auto-execute' },
    { action_type: 'agent_evaluation', tier: 1, description: 'Agent evaluations auto-run' },

    // Tier 3: Partner review required (financial or client-facing)
    {
      action_type: 'document_edit',
      conditions: [{ field: 'financial_impact', eq: true }],
      tier: 3,
      description: 'Financial document edits require partner review',
    },
    {
      action_type: 'document_modification',
      conditions: [{ field: 'financial_impact', eq: true }],
      tier: 3,
      description: 'Financial document modifications require partner review',
    },
    { action_type: 'client_communication', tier: 3, description: 'Client communications require partner review' },
    { action_type: 'client_communication_draft', tier: 3, description: 'Client communication drafts require partner review' },
    { action_type: 'client_action_item_create', tier: 3, description: 'Client action items require partner review' },
    {
      action_type: 'negotiation_update',
      conditions: [{ field: 'strategic', eq: true }],
      tier: 3,
      description: 'Strategic negotiation updates require partner review',
    },

    // Tier 2: One-tap approval (everything else)
    { action_type: 'document_edit', tier: 2, description: 'Document edits need approval' },
    { action_type: 'document_generate', tier: 2, description: 'Document generation needs approval' },
    { action_type: 'document_modification', tier: 2, description: 'Document modifications need approval' },
    { action_type: 'document_review', tier: 2, description: 'Document reviews need approval' },
    { action_type: 'checklist_regeneration', tier: 2, description: 'Checklist regeneration needs approval' },
    { action_type: 'checklist_add_item', tier: 2, description: 'Adding checklist items needs approval' },
    { action_type: 'disclosure_schedule_entry', tier: 2, description: 'Disclosure entries need approval' },
    { action_type: 'disclosure_schedule_update', tier: 2, description: 'Disclosure updates need approval' },
    { action_type: 'disclosure_schedule_remove', tier: 2, description: 'Disclosure removals need approval' },
    { action_type: 'email_draft', tier: 2, description: 'Email drafts need approval' },
    { action_type: 'email_send', tier: 2, description: 'Email sends need approval' },
    { action_type: 'dd_finding_create', tier: 2, description: 'DD findings need approval' },
    { action_type: 'dd_request_create', tier: 2, description: 'DD requests need approval' },
    { action_type: 'negotiation_update', tier: 2, description: 'Negotiation updates need approval' },
    { action_type: 'negotiation_position_update', tier: 2, description: 'Position updates need approval' },
    { action_type: 'third_party_communication', tier: 2, description: 'Third party comms need approval' },
    { action_type: 'closing_readiness_check', tier: 2, description: 'Closing readiness checks need approval' },
    { action_type: 'agent_activation', tier: 2, description: 'Agent activations need approval' },

    // Catch-all: anything not matched defaults to Tier 2
    { action_type: '*', tier: 2, description: 'Default: one-tap approval' },
  ],
};

function evaluateConditions(
  conditions: ApprovalPolicyRule['conditions'],
  context: Record<string, any>
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((cond) => {
    const value = context[cond.field];
    if (cond.eq !== undefined) return value === cond.eq;
    if (cond.in !== undefined) return cond.in.includes(value);
    if (cond.gte !== undefined) return typeof value === 'number' && value >= cond.gte;
    return true;
  });
}

export function assignApprovalTier(
  actionType: string,
  context: Record<string, any> = {},
  policy: ApprovalPolicy = DEFAULT_PARTNER_POLICY
): 1 | 2 | 3 {
  for (const rule of policy.rules) {
    if (rule.action_type !== '*' && rule.action_type !== actionType) continue;
    if (!evaluateConditions(rule.conditions, context)) continue;
    return rule.tier;
  }
  // Fallback: Tier 2
  return 2;
}
