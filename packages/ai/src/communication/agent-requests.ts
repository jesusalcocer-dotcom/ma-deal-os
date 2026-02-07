/**
 * Agent-to-Agent Request System — manages inter-agent work delegation
 * with deadlock prevention and chain depth limits.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AgentRequest {
  id: string;
  deal_id: string;
  requesting_agent: string;
  target_agent: string;
  request_type: 'information_needed' | 'review_requested' | 'action_needed';
  description: string;
  context: unknown;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';
  response: unknown | null;
  chain_depth: number;
  expires_at: string;
  created_at: string;
}

const MAX_CHAIN_DEPTH = 3;

export class AgentRequestService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Create a new agent-to-agent request with deadlock prevention.
   */
  async createRequest(params: {
    dealId: string;
    requestingAgent: string;
    targetAgent: string;
    requestType: 'information_needed' | 'review_requested' | 'action_needed';
    description: string;
    context?: unknown;
  }): Promise<AgentRequest | null> {
    // Deadlock check: chain depth
    const chain = await this.getRequestChain(params.dealId, params.requestingAgent);
    if (chain.length >= MAX_CHAIN_DEPTH) {
      console.warn(`Request chain depth (${chain.length}) exceeds max (${MAX_CHAIN_DEPTH})`);
      return null;
    }

    // Deadlock check: circular requests
    const reverseRequest = await this.findPendingRequest(
      params.dealId,
      params.targetAgent,
      params.requestingAgent
    );
    if (reverseRequest) {
      console.warn(`Circular request detected: ${params.targetAgent} already has pending request to ${params.requestingAgent}`);
      return null;
    }

    try {
      const { data, error } = await this.supabase.from('agent_requests').insert({
        deal_id: params.dealId,
        requesting_agent: params.requestingAgent,
        target_agent: params.targetAgent,
        request_type: params.requestType,
        description: params.description,
        context: params.context || null,
        status: 'pending',
        chain_depth: chain.length + 1,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      }).select().single();

      if (error) {
        console.warn('Failed to create agent request:', error.message);
        return null;
      }

      // Audit log
      await this.auditLog('agent_request_created', {
        requestId: data.id,
        dealId: params.dealId,
        from: params.requestingAgent,
        to: params.targetAgent,
        type: params.requestType,
        chainDepth: chain.length + 1,
      });

      return data as unknown as AgentRequest;
    } catch {
      return null;
    }
  }

  /**
   * Respond to an agent request.
   */
  async respondToRequest(requestId: string, response: unknown): Promise<void> {
    try {
      await this.supabase.from('agent_requests').update({
        status: 'completed',
        response,
      }).eq('id', requestId);

      await this.auditLog('agent_request_completed', { requestId });
    } catch {
      // Non-critical
    }
  }

  /**
   * Mark a request as failed.
   */
  async failRequest(requestId: string, reason: string): Promise<void> {
    try {
      await this.supabase.from('agent_requests').update({
        status: 'failed',
        response: { error: reason },
      }).eq('id', requestId);
    } catch {
      // Non-critical
    }
  }

  /**
   * Get pending requests for a target agent.
   */
  async getPendingRequests(dealId: string, targetAgent: string): Promise<AgentRequest[]> {
    try {
      const { data } = await this.supabase
        .from('agent_requests')
        .select('*')
        .eq('deal_id', dealId)
        .eq('target_agent', targetAgent)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      return (data || []) as unknown as AgentRequest[];
    } catch {
      return [];
    }
  }

  /**
   * Get all requests for a deal.
   */
  async getDealRequests(dealId: string): Promise<AgentRequest[]> {
    try {
      const { data } = await this.supabase
        .from('agent_requests')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
        .limit(50);

      return (data || []) as unknown as AgentRequest[];
    } catch {
      return [];
    }
  }

  /**
   * Expire stale pending requests.
   */
  async expireStaleRequests(): Promise<number> {
    try {
      const now = new Date().toISOString();
      const { data } = await this.supabase
        .from('agent_requests')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', now)
        .select('id');

      return data?.length || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get the request chain depth for an agent on a deal.
   */
  private async getRequestChain(dealId: string, agent: string): Promise<AgentRequest[]> {
    try {
      const { data } = await this.supabase
        .from('agent_requests')
        .select('*')
        .eq('deal_id', dealId)
        .eq('requesting_agent', agent)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false });

      return (data || []) as unknown as AgentRequest[];
    } catch {
      return [];
    }
  }

  /**
   * Find a pending request from one agent to another.
   */
  private async findPendingRequest(
    dealId: string,
    fromAgent: string,
    toAgent: string
  ): Promise<AgentRequest | null> {
    try {
      const { data } = await this.supabase
        .from('agent_requests')
        .select('*')
        .eq('deal_id', dealId)
        .eq('requesting_agent', fromAgent)
        .eq('target_agent', toAgent)
        .eq('status', 'pending')
        .limit(1);

      if (data && data.length > 0) {
        return data[0] as unknown as AgentRequest;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async auditLog(action: string, details: Record<string, unknown>): Promise<void> {
    try {
      await this.supabase.from('learning_audit_log').insert({
        action,
        component: 'agent_requests',
        details,
      });
    } catch {
      // Non-critical
    }
  }
}
