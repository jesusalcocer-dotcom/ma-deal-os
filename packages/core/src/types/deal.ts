export type TransactionStructure =
  | 'STOCK_PURCHASE'
  | 'ASSET_PURCHASE'
  | 'FORWARD_MERGER'
  | 'REVERSE_MERGER'
  | 'REVERSE_TRIANGULAR_MERGER';

export type EntityType =
  | 'CORPORATION'
  | 'LLC'
  | 'LP'
  | 'C_CORP'
  | 'S_CORP'
  | 'PE_FUND'
  | 'INDIVIDUAL'
  | 'CONSORTIUM';

export type BuyerFormation = 'EXISTING' | 'NEWCO';

export type ConsiderationType =
  | 'CASH'
  | 'BUYER_STOCK'
  | 'SELLER_NOTE'
  | 'ASSUMED_DEBT'
  | 'ROLLOVER_EQUITY';

export type PriceAdjustment =
  | 'WORKING_CAPITAL_ADJ'
  | 'NET_DEBT_ADJ'
  | 'NET_CASH_ADJ'
  | 'EARNOUT'
  | 'MILESTONE_PAYMENTS';

export type IndemnificationType =
  | 'TRADITIONAL'
  | 'RW_INSURANCE_PRIMARY'
  | 'RW_INSURANCE_SUPPLEMENTAL'
  | 'ESCROW_ONLY'
  | 'COMBO_ESCROW_AND_RWI';

export type RegulatoryRequirement =
  | 'HSR_FILING'
  | 'CFIUS'
  | 'INDUSTRY_SPECIFIC'
  | 'FOREIGN_COMPETITION'
  | 'STATE_REGULATORY';

export type FinancingType =
  | 'CASH_ON_HAND'
  | 'DEBT_FINANCED'
  | 'EQUITY_COMMITMENT'
  | 'COMBO';

export type KeyEmployeeTreatment =
  | 'EMPLOYMENT_AGREEMENTS'
  | 'CONSULTING'
  | 'RETENTION_BONUSES'
  | 'NONE'
  | 'COMBO';

export type TSADirection =
  | 'SELLER_TO_BUYER'
  | 'BUYER_TO_SELLER'
  | 'BILATERAL';

export type Jurisdiction =
  | 'DELAWARE'
  | 'NEW_YORK'
  | 'CALIFORNIA'
  | 'OTHER_US_STATE'
  | 'FOREIGN';

export type BuyerType = 'PE' | 'STRATEGIC' | 'CONSORTIUM';
export type DealStatus = 'active' | 'closing' | 'closed' | 'terminated';

export interface DealParameters {
  transaction_structure?: TransactionStructure;
  entity_types?: {
    seller?: EntityType;
    target?: EntityType;
    buyer?: EntityType;
  };
  buyer_formation?: BuyerFormation;
  consideration?: ConsiderationType[];
  price_adjustments?: PriceAdjustment[];
  indemnification?: IndemnificationType;
  escrow?: boolean;
  holdback?: boolean;
  regulatory?: RegulatoryRequirement[];
  financing?: {
    type?: FinancingType;
    financing_condition?: boolean;
  };
  key_employees?: {
    treatment?: KeyEmployeeTreatment;
    non_competes?: boolean;
  };
  tsa?: {
    required?: boolean;
    direction?: TSADirection;
  };
  is_carveout?: boolean;
  jurisdiction?: Jurisdiction;
}

export interface DealParameterExtraction {
  value: unknown;
  confidence: number;
  source_text?: string;
}

export interface Deal {
  id: string;
  name: string;
  code_name?: string | null;
  status: DealStatus;
  parameters: DealParameters;
  deal_value?: number | null;
  industry?: string | null;
  buyer_type?: BuyerType | null;
  target_name?: string | null;
  buyer_name?: string | null;
  seller_name?: string | null;
  drive_folder_id?: string | null;
  drive_folder_url?: string | null;
  expected_signing_date?: string | null;
  expected_closing_date?: string | null;
  lead_attorney_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}
