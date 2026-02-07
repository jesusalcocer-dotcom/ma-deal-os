/**
 * Agent Layer Type Definitions
 * Defines interfaces for the Manager, Specialist, and System Expert agents.
 */

// ========================================
// Manager Context
// ========================================

export interface ManagerContext {
  deal: {
    id: string;
    name: string;
    code_name?: string;
    status: string;
    deal_value?: number;
    buyer_type?: string;
    expected_closing_date?: string;
    parameters?: Record<string, any>;
  };
  checklist_summary: {
    total: number;
    by_status: Record<string, number>;
  };
  negotiation_positions: NegotiationPositionSummary[];
  active_dd_findings: DDFindingSummary[];
  recent_activity: ActivityEntry[];
  pending_approvals: PendingApproval[];
  constitution?: PartnerConstitution;
  critical_path: {
    next_deadline: string | null;
    blocking_items: string[];
  };
  upcoming_deadlines: Deadline[];
}

export interface NegotiationPositionSummary {
  id: string;
  provision_type: string;
  provision_label: string;
  our_current_position: string;
  counterparty_position?: string;
  status: string;
  significance: number;
  financial_impact: boolean;
  category: string;
}

export interface DDFindingSummary {
  id: string;
  title: string;
  risk_level: string;
  category: string;
  status: string;
  recommendation?: string;
}

export interface ActivityEntry {
  id: string;
  event_type: string;
  description?: string;
  created_at: string;
}

export interface PendingApproval {
  id: string;
  approval_tier: number;
  status: string;
  actions_count: number;
  created_at: string;
}

export interface PartnerConstitution {
  risk_tolerance: string;
  communication_preferences: string;
  approval_thresholds: Record<string, any>;
}

export interface Deadline {
  description: string;
  date: string;
  days_remaining: number;
}

// ========================================
// Agent Messages
// ========================================

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agent_type?: AgentType;
  metadata?: Record<string, any>;
}

export type AgentType = 'manager' | 'system_expert' | 'specialist';

// ========================================
// Agent Activation
// ========================================

export type TriggerType = 'chat' | 'event' | 'scheduled' | 'manual';

export interface AgentActivationRecord {
  deal_id: string;
  agent_type: string;
  trigger_type: TriggerType;
  trigger_source: string;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
  model_used: string;
  steps: number;
  tool_calls: number;
  specialist_invocations: number;
  duration_ms: number;
  response_summary?: string;
}

// ========================================
// Specialist Configuration
// ========================================

export interface SpecialistConfig {
  task_type: string;
  name: string;
  description: string;
  skills: string[];
  context_requirements: string[];
  tools: string[];
  output_schema: Record<string, any>;
  instructions: string;
  model?: string;
  max_tokens?: number;
}

export interface SpecialistResult {
  task_type: string;
  output: Record<string, any>;
  recommendations: string[];
  action_items: Array<{
    description: string;
    priority: string;
    suggested_action_type: string;
  }>;
  metadata: {
    model: string;
    tokens_used: number;
    cost_usd: number;
    duration_ms: number;
  };
}

export type SpecialistRunner = (
  dealId: string,
  taskInput: Record<string, any>
) => Promise<SpecialistResult>;

// ========================================
// Briefing
// ========================================

export interface Briefing {
  summary: string;
  overnight_activity: string[];
  pending_approvals: number;
  critical_deadlines: Array<{
    item: string;
    date: string;
    status: string;
  }>;
  recommended_priorities: string[];
  risk_flags: string[];
  metadata: {
    generated_at: string;
    model: string;
    tokens_used: number;
  };
}

// ========================================
// Chat
// ========================================

export interface ChatRequest {
  message: string;
  agent_type: 'manager' | 'system_expert';
  conversation_history?: AgentMessage[];
}

export interface ChatResponse {
  response: string;
  agent_type: string;
  suggested_actions?: Array<{
    description: string;
    action_type: string;
    requires_approval: boolean;
  }>;
  tokens_used: number;
  cost_usd: number;
}
