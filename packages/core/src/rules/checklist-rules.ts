import type { DealParameters } from '../types/deal';
import type { DocumentType, ChecklistCategory, ChecklistItem } from '../types/checklist';

export interface ChecklistRule {
  document_type: DocumentType;
  document_name: string;
  category: ChecklistCategory;
  trigger_rule: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  sort_order: number;
  condition: (params: DealParameters) => boolean;
}

export const CHECKLIST_RULES: ChecklistRule[] = [
  // PRIMARY AGREEMENT
  {
    document_type: 'SPA',
    document_name: 'Stock Purchase Agreement',
    category: 'primary_agreement',
    trigger_rule: 'transaction_structure === STOCK_PURCHASE',
    priority: 'critical',
    sort_order: 1,
    condition: (p) => p.transaction_structure === 'STOCK_PURCHASE',
  },
  {
    document_type: 'APA',
    document_name: 'Asset Purchase Agreement',
    category: 'primary_agreement',
    trigger_rule: 'transaction_structure === ASSET_PURCHASE',
    priority: 'critical',
    sort_order: 1,
    condition: (p) => p.transaction_structure === 'ASSET_PURCHASE',
  },
  {
    document_type: 'MERGER_AGREEMENT',
    document_name: 'Agreement and Plan of Merger',
    category: 'primary_agreement',
    trigger_rule: 'transaction_structure includes MERGER',
    priority: 'critical',
    sort_order: 1,
    condition: (p) =>
      p.transaction_structure === 'FORWARD_MERGER' ||
      p.transaction_structure === 'REVERSE_MERGER' ||
      p.transaction_structure === 'REVERSE_TRIANGULAR_MERGER',
  },

  // DISCLOSURE SCHEDULES - always required
  {
    document_type: 'DISCLOSURE_SCHEDULES',
    document_name: 'Disclosure Schedules',
    category: 'primary_agreement',
    trigger_rule: 'always required',
    priority: 'critical',
    sort_order: 2,
    condition: () => true,
  },

  // ESCROW
  {
    document_type: 'ESCROW_AGREEMENT',
    document_name: 'Escrow Agreement',
    category: 'ancillary',
    trigger_rule: 'escrow === true or indemnification includes ESCROW',
    priority: 'high',
    sort_order: 10,
    condition: (p) =>
      p.escrow === true ||
      p.indemnification === 'ESCROW_ONLY' ||
      p.indemnification === 'COMBO_ESCROW_AND_RWI',
  },

  // EMPLOYMENT
  {
    document_type: 'EMPLOYMENT_AGREEMENT',
    document_name: 'Employment Agreement(s)',
    category: 'employment',
    trigger_rule: 'key_employees.treatment includes EMPLOYMENT_AGREEMENTS or COMBO',
    priority: 'high',
    sort_order: 20,
    condition: (p) =>
      p.key_employees?.treatment === 'EMPLOYMENT_AGREEMENTS' ||
      p.key_employees?.treatment === 'COMBO',
  },
  {
    document_type: 'NON_COMPETE',
    document_name: 'Non-Competition Agreement(s)',
    category: 'employment',
    trigger_rule: 'key_employees.non_competes === true',
    priority: 'high',
    sort_order: 21,
    condition: (p) => p.key_employees?.non_competes === true,
  },
  {
    document_type: 'CONSULTING_AGREEMENT',
    document_name: 'Consulting Agreement(s)',
    category: 'employment',
    trigger_rule: 'key_employees.treatment === CONSULTING or COMBO',
    priority: 'normal',
    sort_order: 22,
    condition: (p) =>
      p.key_employees?.treatment === 'CONSULTING' ||
      p.key_employees?.treatment === 'COMBO',
  },

  // TRANSITION SERVICES
  {
    document_type: 'TSA',
    document_name: 'Transition Services Agreement',
    category: 'ancillary',
    trigger_rule: 'tsa.required === true',
    priority: 'high',
    sort_order: 30,
    condition: (p) => p.tsa?.required === true,
  },

  // FINANCING
  {
    document_type: 'FINANCING_COMMITMENT',
    document_name: 'Financing Commitment Letter',
    category: 'financing',
    trigger_rule: 'financing.type === DEBT_FINANCED or COMBO',
    priority: 'high',
    sort_order: 40,
    condition: (p) =>
      p.financing?.type === 'DEBT_FINANCED' || p.financing?.type === 'COMBO',
  },
  {
    document_type: 'GUARANTEE',
    document_name: 'Equity Commitment Letter / Guarantee',
    category: 'financing',
    trigger_rule: 'financing.type === EQUITY_COMMITMENT or COMBO',
    priority: 'high',
    sort_order: 41,
    condition: (p) =>
      p.financing?.type === 'EQUITY_COMMITMENT' || p.financing?.type === 'COMBO',
  },

  // CONSIDERATION-DRIVEN
  {
    document_type: 'SELLER_NOTE',
    document_name: 'Promissory Note (Seller Note)',
    category: 'ancillary',
    trigger_rule: 'consideration includes SELLER_NOTE',
    priority: 'high',
    sort_order: 50,
    condition: (p) => p.consideration?.includes('SELLER_NOTE') ?? false,
  },
  {
    document_type: 'ROLLOVER_AGREEMENT',
    document_name: 'Rollover Agreement',
    category: 'ancillary',
    trigger_rule: 'consideration includes ROLLOVER_EQUITY',
    priority: 'high',
    sort_order: 51,
    condition: (p) => p.consideration?.includes('ROLLOVER_EQUITY') ?? false,
  },
  {
    document_type: 'EARNOUT_AGREEMENT',
    document_name: 'Earnout Agreement',
    category: 'ancillary',
    trigger_rule: 'price_adjustments includes EARNOUT',
    priority: 'high',
    sort_order: 52,
    condition: (p) => p.price_adjustments?.includes('EARNOUT') ?? false,
  },
  {
    document_type: 'WORKING_CAPITAL_SCHEDULE',
    document_name: 'Working Capital Schedule / Methodology',
    category: 'ancillary',
    trigger_rule: 'price_adjustments includes WORKING_CAPITAL_ADJ',
    priority: 'normal',
    sort_order: 53,
    condition: (p) => p.price_adjustments?.includes('WORKING_CAPITAL_ADJ') ?? false,
  },

  // REGULATORY
  {
    document_type: 'HSR_FILING',
    document_name: 'HSR Filing',
    category: 'regulatory',
    trigger_rule: 'regulatory includes HSR_FILING',
    priority: 'critical',
    sort_order: 60,
    condition: (p) => p.regulatory?.includes('HSR_FILING') ?? false,
  },
  {
    document_type: 'CFIUS_FILING',
    document_name: 'CFIUS Filing',
    category: 'regulatory',
    trigger_rule: 'regulatory includes CFIUS',
    priority: 'critical',
    sort_order: 61,
    condition: (p) => p.regulatory?.includes('CFIUS') ?? false,
  },
  {
    document_type: 'REGULATORY_FILING',
    document_name: 'Industry-Specific Regulatory Filing',
    category: 'regulatory',
    trigger_rule: 'regulatory includes INDUSTRY_SPECIFIC',
    priority: 'high',
    sort_order: 62,
    condition: (p) => p.regulatory?.includes('INDUSTRY_SPECIFIC') ?? false,
  },

  // R&W INSURANCE
  {
    document_type: 'RW_INSURANCE_POLICY',
    document_name: 'Representations & Warranties Insurance Policy',
    category: 'ancillary',
    trigger_rule: 'indemnification includes RW_INSURANCE',
    priority: 'high',
    sort_order: 70,
    condition: (p) =>
      p.indemnification === 'RW_INSURANCE_PRIMARY' ||
      p.indemnification === 'RW_INSURANCE_SUPPLEMENTAL' ||
      p.indemnification === 'COMBO_ESCROW_AND_RWI',
  },

  // MERGER-SPECIFIC
  {
    document_type: 'CERTIFICATE_OF_MERGER',
    document_name: 'Certificate of Merger',
    category: 'closing',
    trigger_rule: 'transaction_structure includes MERGER',
    priority: 'critical',
    sort_order: 75,
    condition: (p) =>
      p.transaction_structure === 'FORWARD_MERGER' ||
      p.transaction_structure === 'REVERSE_MERGER' ||
      p.transaction_structure === 'REVERSE_TRIANGULAR_MERGER',
  },
  {
    document_type: 'VOTING_AGREEMENT',
    document_name: 'Voting and Support Agreement(s)',
    category: 'ancillary',
    trigger_rule: 'transaction_structure includes MERGER',
    priority: 'high',
    sort_order: 76,
    condition: (p) =>
      p.transaction_structure === 'FORWARD_MERGER' ||
      p.transaction_structure === 'REVERSE_MERGER' ||
      p.transaction_structure === 'REVERSE_TRIANGULAR_MERGER',
  },

  // STOCK CONSIDERATION
  {
    document_type: 'STOCKHOLDER_AGREEMENT',
    document_name: 'Stockholder Agreement',
    category: 'ancillary',
    trigger_rule: 'consideration includes BUYER_STOCK',
    priority: 'high',
    sort_order: 54,
    condition: (p) => p.consideration?.includes('BUYER_STOCK') ?? false,
  },
  {
    document_type: 'REGISTRATION_RIGHTS',
    document_name: 'Registration Rights Agreement',
    category: 'ancillary',
    trigger_rule: 'consideration includes BUYER_STOCK',
    priority: 'normal',
    sort_order: 55,
    condition: (p) => p.consideration?.includes('BUYER_STOCK') ?? false,
  },

  // CARVEOUT-SPECIFIC
  {
    document_type: 'IP_LICENSE',
    document_name: 'IP License Agreement',
    category: 'ancillary',
    trigger_rule: 'is_carveout === true and transaction_structure === ASSET_PURCHASE',
    priority: 'high',
    sort_order: 83,
    condition: (p) => p.is_carveout === true && p.transaction_structure === 'ASSET_PURCHASE',
  },
  {
    document_type: 'SUBLEASE_AGREEMENT',
    document_name: 'Sublease Agreement',
    category: 'ancillary',
    trigger_rule: 'is_carveout === true and tsa.required === true',
    priority: 'normal',
    sort_order: 84,
    condition: (p) => p.is_carveout === true && p.tsa?.required === true,
  },

  // RETENTION
  {
    document_type: 'RETENTION_AGREEMENT',
    document_name: 'Employee Retention Agreement(s)',
    category: 'employment',
    trigger_rule: 'key_employees.treatment includes RETENTION_BONUSES or COMBO',
    priority: 'normal',
    sort_order: 23,
    condition: (p) =>
      p.key_employees?.treatment === 'RETENTION_BONUSES' ||
      p.key_employees?.treatment === 'COMBO',
  },

  // ASSET PURCHASE SPECIFIC
  {
    document_type: 'BILL_OF_SALE',
    document_name: 'Bill of Sale',
    category: 'closing',
    trigger_rule: 'transaction_structure === ASSET_PURCHASE',
    priority: 'high',
    sort_order: 80,
    condition: (p) => p.transaction_structure === 'ASSET_PURCHASE',
  },
  {
    document_type: 'ASSIGNMENT_AND_ASSUMPTION',
    document_name: 'Assignment and Assumption Agreement',
    category: 'closing',
    trigger_rule: 'transaction_structure === ASSET_PURCHASE',
    priority: 'high',
    sort_order: 81,
    condition: (p) => p.transaction_structure === 'ASSET_PURCHASE',
  },
  {
    document_type: 'IP_ASSIGNMENT',
    document_name: 'IP Assignment Agreement',
    category: 'ancillary',
    trigger_rule: 'transaction_structure === ASSET_PURCHASE',
    priority: 'normal',
    sort_order: 82,
    condition: (p) => p.transaction_structure === 'ASSET_PURCHASE',
  },

  // CLOSING DOCUMENTS - always required
  {
    document_type: 'OFFICER_CERTIFICATE',
    document_name: "Officer's Certificate (Seller)",
    category: 'closing',
    trigger_rule: 'always required',
    priority: 'normal',
    sort_order: 90,
    condition: () => true,
  },
  {
    document_type: 'OFFICER_CERTIFICATE',
    document_name: "Officer's Certificate (Buyer)",
    category: 'closing',
    trigger_rule: 'always required',
    priority: 'normal',
    sort_order: 91,
    condition: () => true,
  },
  {
    document_type: 'SECRETARY_CERTIFICATE',
    document_name: "Secretary's Certificate (Seller)",
    category: 'closing',
    trigger_rule: 'always required',
    priority: 'normal',
    sort_order: 92,
    condition: () => true,
  },
  {
    document_type: 'SECRETARY_CERTIFICATE',
    document_name: "Secretary's Certificate (Buyer)",
    category: 'closing',
    trigger_rule: 'always required',
    priority: 'normal',
    sort_order: 93,
    condition: () => true,
  },
  {
    document_type: 'LEGAL_OPINION',
    document_name: "Legal Opinion (Seller's Counsel)",
    category: 'closing',
    trigger_rule: 'always required',
    priority: 'normal',
    sort_order: 94,
    condition: () => true,
  },
  {
    document_type: 'BRING_DOWN_CERTIFICATE',
    document_name: 'Bring-Down Certificate',
    category: 'closing',
    trigger_rule: 'always required',
    priority: 'normal',
    sort_order: 95,
    condition: () => true,
  },
  {
    document_type: 'FUNDS_FLOW_MEMO',
    document_name: 'Funds Flow Memorandum',
    category: 'closing',
    trigger_rule: 'always required',
    priority: 'high',
    sort_order: 96,
    condition: () => true,
  },
  {
    document_type: 'CLOSING_STATEMENT',
    document_name: 'Closing Statement',
    category: 'closing',
    trigger_rule: 'always required',
    priority: 'high',
    sort_order: 97,
    condition: () => true,
  },
  {
    document_type: 'PAYOFF_LETTER',
    document_name: 'Payoff Letter(s)',
    category: 'closing',
    trigger_rule: 'always required for funded deals',
    priority: 'normal',
    sort_order: 98,
    condition: () => true,
  },
];

/**
 * Generate a checklist from deal parameters using deterministic rules.
 */
export function generateChecklistFromRules(
  dealId: string,
  params: DealParameters
): Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at'>[] {
  return CHECKLIST_RULES.filter((rule) => rule.condition(params)).map((rule) => ({
    deal_id: dealId,
    document_type: rule.document_type,
    document_name: rule.document_name,
    category: rule.category,
    trigger_rule: rule.trigger_rule,
    trigger_source: 'deterministic' as const,
    status: 'identified' as const,
    ball_with: 'us' as const,
    assigned_to: null,
    due_date: null,
    priority: rule.priority,
    depends_on: null,
    blocks: null,
    current_document_version_id: null,
    drive_file_id: null,
    notes: null,
    sort_order: rule.sort_order,
  }));
}
