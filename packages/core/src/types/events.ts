// Event Propagation System Types
// Ref: SPEC-V2-COMPLETE.md Sections 5.2, 5.3, 5.6

export type PropagationEventType =
  // Deal-level events
  | 'deal.created'
  | 'deal.parameters_updated'
  | 'deal.status_changed'
  | 'deal.timeline_updated'

  // Checklist events
  | 'checklist.generated'
  | 'checklist.item_status_changed'
  | 'checklist.item_assigned'
  | 'checklist.item_overdue'
  | 'checklist.dependency_resolved'

  // Document events
  | 'document.version_created'
  | 'document.markup_received'
  | 'document.markup_analyzed'
  | 'document.sent_to_counterparty'
  | 'document.attorney_reviewed'

  // DD events
  | 'dd.finding_created'
  | 'dd.finding_confirmed'
  | 'dd.finding_resolved'
  | 'dd.coverage_gap_identified'
  | 'dd.request_sent'
  | 'dd.response_received'

  // Email events
  | 'email.received'
  | 'email.classified'
  | 'email.position_extracted'
  | 'email.action_item_identified'
  | 'email.attachment_processed'

  // Negotiation events
  | 'negotiation.position_updated'
  | 'negotiation.concession_detected'
  | 'negotiation.impasse_detected'
  | 'negotiation.round_completed'

  // Disclosure schedule events
  | 'disclosure.schedule_updated'
  | 'disclosure.gap_identified'
  | 'disclosure.client_response_received'
  | 'disclosure.cross_reference_broken'

  // Third-party events
  | 'third_party.deliverable_received'
  | 'third_party.deliverable_overdue'
  | 'third_party.communication_received'

  // Client events
  | 'client.action_item_created'
  | 'client.action_item_completed'
  | 'client.communication_needed'
  | 'client.approval_requested'

  // Closing events
  | 'closing.condition_satisfied'
  | 'closing.condition_waived'
  | 'closing.deliverable_received'
  | 'closing.blocking_issue_identified'

  // System events
  | 'system.deadline_approaching'
  | 'system.critical_path_changed'
  | 'system.agent_activation_triggered';

export interface PropagationEvent {
  id: string;
  deal_id: string;
  event_type: PropagationEventType;
  source_entity_type: string;
  source_entity_id: string;
  payload: Record<string, any>;
  significance: 1 | 2 | 3 | 4 | 5;
  created_at: string;
  processed: boolean;
  processed_at?: string;
}

export type ProposedActionType =
  | 'document_edit'
  | 'document_generate'
  | 'document_modification'
  | 'checklist_status_update'
  | 'checklist_ball_with_update'
  | 'checklist_add_item'
  | 'checklist_regeneration'
  | 'disclosure_schedule_entry'
  | 'disclosure_schedule_remove'
  | 'disclosure_schedule_update'
  | 'email_draft'
  | 'email_send'
  | 'dd_finding_create'
  | 'dd_request_create'
  | 'negotiation_position_update'
  | 'negotiation_update'
  | 'client_action_item_create'
  | 'client_communication_draft'
  | 'client_communication'
  | 'third_party_communication'
  | 'closing_checklist_update'
  | 'closing_readiness_check'
  | 'notification'
  | 'agent_activation'
  | 'agent_evaluation'
  | 'status_update'
  | 'timeline_update'
  | 'critical_path_update'
  | 'document_review'
  | 'analysis';

export interface ProposedAction {
  id: string;
  chain_id: string;
  sequence_order: number;
  depends_on: string[];
  action_type: ProposedActionType;
  target_entity_type: string;
  target_entity_id?: string;
  payload: Record<string, any>;
  preview: {
    title: string;
    description: string;
    diff?: string;
    draft?: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  execution_result?: Record<string, any>;
  constitutional_violation?: boolean;
  created_at: string;
  executed_at?: string;
}

export interface ActionChain {
  id: string;
  deal_id: string;
  trigger_event_id: string;
  summary: string;
  significance: 1 | 2 | 3 | 4 | 5;
  approval_tier: 1 | 2 | 3;
  status: 'pending' | 'approved' | 'partially_approved' | 'rejected' | 'expired';
  actions: ProposedAction[];
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

export interface ConsequenceMapCondition {
  field: string;
  in?: any[];
  eq?: any;
  gte?: number;
}

export interface Consequence {
  type: ProposedActionType;
  target?: string;
  action: string;
  priority: 'immediate' | 'high' | 'normal' | 'low';
}

export interface ConsequenceMap {
  trigger: PropagationEventType;
  conditions?: ConsequenceMapCondition[];
  consequences: Consequence[];
}
