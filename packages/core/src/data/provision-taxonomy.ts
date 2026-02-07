/**
 * Top 50 provision types for Stock Purchase Agreements (SPAs)
 * and related M&A transaction documents.
 */
export interface ProvisionTypeSeed {
  code: string;
  name: string;
  category: string;
  parent_code?: string;
  description: string;
  applicable_doc_types: string[];
  sort_order: number;
}

export const SPA_PROVISION_TAXONOMY: ProvisionTypeSeed[] = [
  // === PURCHASE PRICE & CONSIDERATION ===
  { code: 'purchase_price.base', name: 'Base Purchase Price', category: 'purchase_price', description: 'Definition and calculation of base purchase price', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 1 },
  { code: 'purchase_price.adjustment.working_capital', name: 'Working Capital Adjustment', category: 'purchase_price', parent_code: 'purchase_price.base', description: 'Mechanism for adjusting purchase price based on working capital at closing', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 2 },
  { code: 'purchase_price.adjustment.net_debt', name: 'Net Debt Adjustment', category: 'purchase_price', parent_code: 'purchase_price.base', description: 'Purchase price adjustment for target net debt', applicable_doc_types: ['SPA', 'MERGER_AGREEMENT'], sort_order: 3 },
  { code: 'purchase_price.earnout', name: 'Earnout Provisions', category: 'purchase_price', description: 'Contingent consideration based on post-closing performance', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 4 },
  { code: 'purchase_price.escrow', name: 'Escrow Provisions', category: 'purchase_price', description: 'Escrow arrangements for indemnification or purchase price adjustments', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 5 },
  { code: 'purchase_price.holdback', name: 'Holdback Provisions', category: 'purchase_price', description: 'Portion of purchase price held back pending satisfaction of conditions', applicable_doc_types: ['SPA', 'APA'], sort_order: 6 },

  // === REPRESENTATIONS & WARRANTIES ===
  { code: 'reps.seller.organization', name: 'Organization & Authority', category: 'representations', description: 'Seller representations regarding corporate organization and authority', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 10 },
  { code: 'reps.seller.financial_statements', name: 'Financial Statements', category: 'representations', description: 'Representations regarding accuracy of financial statements', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 11 },
  { code: 'reps.seller.no_undisclosed_liabilities', name: 'No Undisclosed Liabilities', category: 'representations', description: 'No material undisclosed liabilities beyond those in financial statements', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 12 },
  { code: 'reps.seller.material_contracts', name: 'Material Contracts', category: 'representations', description: 'Disclosure and status of material contracts', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 13 },
  { code: 'reps.seller.ip', name: 'Intellectual Property', category: 'representations', description: 'Ownership and protection of intellectual property', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 14 },
  { code: 'reps.seller.compliance', name: 'Legal Compliance', category: 'representations', description: 'Compliance with applicable laws and regulations', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 15 },
  { code: 'reps.seller.litigation', name: 'Litigation', category: 'representations', description: 'Pending or threatened litigation or proceedings', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 16 },
  { code: 'reps.seller.tax', name: 'Tax Matters', category: 'representations', description: 'Tax returns, payments, and compliance', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 17 },
  { code: 'reps.seller.employees', name: 'Employee Matters', category: 'representations', description: 'Employee benefit plans, labor relations, employment agreements', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 18 },
  { code: 'reps.seller.environmental', name: 'Environmental Matters', category: 'representations', description: 'Environmental compliance and liabilities', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 19 },
  { code: 'reps.seller.real_property', name: 'Real Property', category: 'representations', description: 'Owned and leased real property', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 20 },
  { code: 'reps.seller.insurance', name: 'Insurance', category: 'representations', description: 'Insurance coverage and claims history', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 21 },
  { code: 'reps.buyer.organization', name: 'Buyer Organization & Authority', category: 'representations', description: 'Buyer representations regarding organization and authority', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 22 },
  { code: 'reps.buyer.financing', name: 'Buyer Financing', category: 'representations', description: 'Buyer has sufficient funds or committed financing', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 23 },

  // === INDEMNIFICATION ===
  { code: 'indemnification.basket.type', name: 'Indemnification Basket Type', category: 'indemnification', description: 'Tipping basket vs. true deductible vs. mini-basket', applicable_doc_types: ['SPA', 'APA'], sort_order: 30 },
  { code: 'indemnification.basket.amount', name: 'Basket Amount', category: 'indemnification', parent_code: 'indemnification.basket.type', description: 'Dollar threshold for indemnification claims', applicable_doc_types: ['SPA', 'APA'], sort_order: 31 },
  { code: 'indemnification.cap', name: 'Indemnification Cap', category: 'indemnification', description: 'Maximum aggregate indemnification liability', applicable_doc_types: ['SPA', 'APA'], sort_order: 32 },
  { code: 'indemnification.survival', name: 'Survival Periods', category: 'indemnification', description: 'Duration for which representations survive closing', applicable_doc_types: ['SPA', 'APA'], sort_order: 33 },
  { code: 'indemnification.special_indemnities', name: 'Special Indemnities', category: 'indemnification', description: 'Carve-outs from general indemnification limits (tax, fraud, fundamental reps)', applicable_doc_types: ['SPA', 'APA'], sort_order: 34 },
  { code: 'indemnification.rw_insurance', name: 'R&W Insurance', category: 'indemnification', description: 'Representations and warranties insurance policy provisions', applicable_doc_types: ['SPA', 'MERGER_AGREEMENT'], sort_order: 35 },
  { code: 'indemnification.exclusive_remedy', name: 'Exclusive Remedy', category: 'indemnification', description: 'Indemnification as sole and exclusive remedy post-closing', applicable_doc_types: ['SPA', 'APA'], sort_order: 36 },

  // === COVENANTS ===
  { code: 'covenants.interim.ordinary_course', name: 'Ordinary Course Covenant', category: 'covenants', description: 'Obligation to operate business in ordinary course between signing and closing', applicable_doc_types: ['SPA', 'MERGER_AGREEMENT'], sort_order: 40 },
  { code: 'covenants.interim.negative', name: 'Negative Covenants', category: 'covenants', description: 'Actions prohibited without buyer consent during interim period', applicable_doc_types: ['SPA', 'MERGER_AGREEMENT'], sort_order: 41 },
  { code: 'covenants.non_compete', name: 'Non-Competition', category: 'covenants', description: 'Post-closing non-competition restrictions on seller', applicable_doc_types: ['SPA', 'APA'], sort_order: 42 },
  { code: 'covenants.non_solicit', name: 'Non-Solicitation', category: 'covenants', description: 'Non-solicitation of employees and customers', applicable_doc_types: ['SPA', 'APA'], sort_order: 43 },
  { code: 'covenants.confidentiality', name: 'Confidentiality', category: 'covenants', description: 'Post-closing confidentiality obligations', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 44 },
  { code: 'covenants.regulatory', name: 'Regulatory Covenants', category: 'covenants', description: 'Obligations to obtain regulatory approvals (HSR, CFIUS, etc.)', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 45 },

  // === CLOSING CONDITIONS ===
  { code: 'closing.conditions.reps_true', name: 'Accuracy of Representations', category: 'closing_conditions', description: 'Closing condition that representations are true at closing', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 50 },
  { code: 'closing.conditions.covenants_performed', name: 'Performance of Covenants', category: 'closing_conditions', description: 'Closing condition that covenants have been performed', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 51 },
  { code: 'closing.conditions.no_mac', name: 'No Material Adverse Change', category: 'closing_conditions', description: 'No MAC/MAE has occurred since signing', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 52 },
  { code: 'closing.conditions.regulatory_approval', name: 'Regulatory Approvals', category: 'closing_conditions', description: 'Receipt of required regulatory approvals', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 53 },
  { code: 'closing.conditions.third_party_consents', name: 'Third-Party Consents', category: 'closing_conditions', description: 'Receipt of required third-party consents', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 54 },
  { code: 'closing.conditions.financing', name: 'Financing Condition', category: 'closing_conditions', description: 'Buyer financing condition (if applicable)', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 55 },

  // === TERMINATION ===
  { code: 'termination.mutual', name: 'Mutual Termination', category: 'termination', description: 'Right of either party to terminate by mutual agreement', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 60 },
  { code: 'termination.outside_date', name: 'Outside Date', category: 'termination', description: 'Termination if closing has not occurred by specified date', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 61 },
  { code: 'termination.breach', name: 'Termination for Breach', category: 'termination', description: 'Termination right upon material breach by other party', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 62 },
  { code: 'termination.fee', name: 'Termination Fee', category: 'termination', description: 'Break-up fee or reverse termination fee provisions', applicable_doc_types: ['MERGER_AGREEMENT'], sort_order: 63 },

  // === MAC / MAE DEFINITION ===
  { code: 'mac.definition', name: 'MAC Definition', category: 'mac', description: 'Definition of Material Adverse Change / Material Adverse Effect', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 70 },
  { code: 'mac.carveouts', name: 'MAC Carve-outs', category: 'mac', parent_code: 'mac.definition', description: 'Exceptions to the MAC definition (industry-wide changes, economy, etc.)', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 71 },

  // === MISCELLANEOUS ===
  { code: 'misc.governing_law', name: 'Governing Law', category: 'miscellaneous', description: 'Choice of law provision', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 80 },
  { code: 'misc.dispute_resolution', name: 'Dispute Resolution', category: 'miscellaneous', description: 'Arbitration vs. litigation, forum selection', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 81 },
  { code: 'misc.assignment', name: 'Assignment', category: 'miscellaneous', description: 'Restrictions on assignment of agreement', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 82 },
  { code: 'misc.expenses', name: 'Expenses', category: 'miscellaneous', description: 'Allocation of transaction expenses', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 83 },
  { code: 'misc.specific_performance', name: 'Specific Performance', category: 'miscellaneous', description: 'Right to seek specific performance in addition to other remedies', applicable_doc_types: ['SPA', 'APA', 'MERGER_AGREEMENT'], sort_order: 84 },
];
