export interface ProvisionType {
  id: string;
  code: string;
  name: string;
  category: string;
  parent_code?: string | null;
  description?: string | null;
  applicable_doc_types?: string[];
  sort_order: number;
}

export interface ProvisionVariant {
  id: string;
  provision_type_id: string;
  code: string;
  name: string;
  description?: string | null;
  buyer_favorability?: number | null;
  market_frequency?: number | null;
  metadata?: Record<string, unknown>;
}

export interface ProvisionFormulation {
  id: string;
  provision_type_id: string;
  variant_id?: string | null;
  text: string;
  source_deal_id?: string | null;
  source_document_type?: string | null;
  source_firm?: string | null;
  favorability_score?: number | null;
  negotiation_outcome?: string | null;
  deal_size_range?: string | null;
  industry?: string | null;
  year?: number | null;
  created_at: string;
}
