export type DocumentType =
  | 'SPA' | 'APA' | 'MERGER_AGREEMENT' | 'ESCROW_AGREEMENT'
  | 'DISCLOSURE_SCHEDULES' | 'EMPLOYMENT_AGREEMENT' | 'NON_COMPETE'
  | 'CONSULTING_AGREEMENT' | 'TSA' | 'IP_ASSIGNMENT' | 'IP_LICENSE'
  | 'LEASE_ASSIGNMENT' | 'LEASE_CONSENT' | 'THIRD_PARTY_CONSENT'
  | 'REGULATORY_FILING' | 'HSR_FILING' | 'CFIUS_FILING'
  | 'OFFICER_CERTIFICATE' | 'SECRETARY_CERTIFICATE' | 'LEGAL_OPINION'
  | 'BRING_DOWN_CERTIFICATE' | 'PAYOFF_LETTER' | 'FUNDS_FLOW_MEMO'
  | 'CLOSING_STATEMENT' | 'BILL_OF_SALE' | 'ASSIGNMENT_AND_ASSUMPTION'
  | 'SELLER_NOTE' | 'GUARANTEE' | 'ROLLOVER_AGREEMENT'
  | 'RW_INSURANCE_POLICY' | 'FINANCING_COMMITMENT'
  | 'WORKING_CAPITAL_SCHEDULE' | 'EARNOUT_AGREEMENT'
  | 'TRANSITION_SERVICES_AGREEMENT'
  | 'CERTIFICATE_OF_MERGER' | 'VOTING_AGREEMENT'
  | 'STOCKHOLDER_AGREEMENT' | 'REGISTRATION_RIGHTS'
  | 'SUBLEASE_AGREEMENT' | 'RETENTION_AGREEMENT'
  | 'OTHER';

export type ChecklistCategory =
  | 'primary_agreement' | 'ancillary' | 'regulatory' | 'employment'
  | 'financing' | 'third_party' | 'closing' | 'post_closing';

export type ChecklistStatus =
  | 'identified' | 'template_set' | 'precedent_set' | 'scrubbed'
  | 'adapted' | 'attorney_reviewed' | 'sent_to_counter'
  | 'markup_received' | 'response_draft' | 'final' | 'executed' | 'filed';

export type TriggerSource =
  | 'deterministic' | 'cim_enrichment' | 'dd_driven' | 'third_party' | 'manual';

export type BallWith = 'us' | 'counterparty' | 'third_party' | 'client';
export type Priority = 'critical' | 'high' | 'normal' | 'low';

export interface ChecklistItem {
  id: string;
  deal_id: string;
  document_type: DocumentType;
  document_name: string;
  category?: ChecklistCategory | null;
  trigger_rule?: string | null;
  trigger_source: TriggerSource;
  status: ChecklistStatus;
  ball_with?: BallWith | null;
  assigned_to?: string | null;
  due_date?: string | null;
  priority: Priority;
  depends_on?: string[] | null;
  blocks?: string[] | null;
  current_document_version_id?: string | null;
  drive_file_id?: string | null;
  notes?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
