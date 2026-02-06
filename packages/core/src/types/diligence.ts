export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export type RiskType =
  | 'deal_breaker' | 'price_adjustment' | 'indemnification_item'
  | 'post_closing_fix' | 'disclosure_item' | 'monitor' | 'no_action';

export type DDFindingStatus = 'draft' | 'confirmed' | 'resolved' | 'not_applicable';

export interface DDTopic {
  id: string;
  code: string;
  name: string;
  workstream: string;
  parent_code?: string | null;
  description?: string | null;
  sort_order: number;
}

export interface DDFinding {
  id: string;
  deal_id: string;
  topic_id?: string | null;
  summary: string;
  detail?: string | null;
  risk_level: RiskLevel;
  risk_type?: RiskType | null;
  exposure_low?: number | null;
  exposure_mid?: number | null;
  exposure_high?: number | null;
  exposure_basis?: string | null;
  status: DDFindingStatus;
  created_at: string;
  updated_at: string;
}
