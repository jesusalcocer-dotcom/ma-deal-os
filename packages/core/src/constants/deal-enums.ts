export const TRANSACTION_STRUCTURES = [
  'STOCK_PURCHASE', 'ASSET_PURCHASE', 'FORWARD_MERGER',
  'REVERSE_MERGER', 'REVERSE_TRIANGULAR_MERGER',
] as const;

export const ENTITY_TYPES = [
  'CORPORATION', 'LLC', 'LP', 'C_CORP', 'S_CORP',
  'PE_FUND', 'INDIVIDUAL', 'CONSORTIUM',
] as const;

export const CONSIDERATION_TYPES = [
  'CASH', 'BUYER_STOCK', 'SELLER_NOTE', 'ASSUMED_DEBT', 'ROLLOVER_EQUITY',
] as const;

export const PRICE_ADJUSTMENTS = [
  'WORKING_CAPITAL_ADJ', 'NET_DEBT_ADJ', 'NET_CASH_ADJ',
  'EARNOUT', 'MILESTONE_PAYMENTS',
] as const;

export const INDEMNIFICATION_TYPES = [
  'TRADITIONAL', 'RW_INSURANCE_PRIMARY', 'RW_INSURANCE_SUPPLEMENTAL',
  'ESCROW_ONLY', 'COMBO_ESCROW_AND_RWI',
] as const;

export const REGULATORY_REQUIREMENTS = [
  'HSR_FILING', 'CFIUS', 'INDUSTRY_SPECIFIC',
  'FOREIGN_COMPETITION', 'STATE_REGULATORY',
] as const;

export const FINANCING_TYPES = [
  'CASH_ON_HAND', 'DEBT_FINANCED', 'EQUITY_COMMITMENT', 'COMBO',
] as const;

export const KEY_EMPLOYEE_TREATMENTS = [
  'EMPLOYMENT_AGREEMENTS', 'CONSULTING', 'RETENTION_BONUSES', 'NONE', 'COMBO',
] as const;

export const TSA_DIRECTIONS = [
  'SELLER_TO_BUYER', 'BUYER_TO_SELLER', 'BILATERAL',
] as const;

export const JURISDICTIONS = [
  'DELAWARE', 'NEW_YORK', 'CALIFORNIA', 'OTHER_US_STATE', 'FOREIGN',
] as const;

export const BUYER_TYPES = ['PE', 'STRATEGIC', 'CONSORTIUM'] as const;
export const DEAL_STATUSES = ['active', 'closing', 'closed', 'terminated'] as const;

export const CHECKLIST_STATUSES = [
  'identified', 'template_set', 'precedent_set', 'scrubbed', 'adapted',
  'attorney_reviewed', 'sent_to_counter', 'markup_received',
  'response_draft', 'final', 'executed', 'filed',
] as const;

export const DOCUMENT_CATEGORIES = [
  'primary_agreement', 'ancillary', 'regulatory', 'employment',
  'financing', 'third_party', 'closing', 'post_closing',
] as const;

export const TRANSACTION_STRUCTURE_LABELS: Record<string, string> = {
  STOCK_PURCHASE: 'Stock Purchase',
  ASSET_PURCHASE: 'Asset Purchase',
  FORWARD_MERGER: 'Forward Merger',
  REVERSE_MERGER: 'Reverse Merger',
  REVERSE_TRIANGULAR_MERGER: 'Reverse Triangular Merger',
};

export const CHECKLIST_STATUS_LABELS: Record<string, string> = {
  identified: 'Identified',
  template_set: 'Template Set',
  precedent_set: 'Precedent Set',
  scrubbed: 'Scrubbed',
  adapted: 'Adapted',
  attorney_reviewed: 'Attorney Reviewed',
  sent_to_counter: 'Sent to Counter',
  markup_received: 'Markup Received',
  response_draft: 'Response Draft',
  final: 'Final',
  executed: 'Executed',
  filed: 'Filed',
};
