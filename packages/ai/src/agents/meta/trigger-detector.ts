/**
 * Trigger Detector for Meta Agent
 *
 * Evaluates incoming events to determine whether a Meta Agent intervention
 * should be triggered. Checks configuration, thresholds, and contextual
 * conditions before firing.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface MetaTrigger {
  reason: 'tool_failure' | 'low_score' | 'max_retries' | 'contradiction' | 'agent_request_timeout';
  dealId?: string;
  agentType?: string;
  taskType?: string;
  details: Record<string, unknown>;
}

export interface TriggerEvent {
  type: 'agent_failure' | 'low_score' | 'max_retries' | 'contradiction' | 'agent_request';
  details: Record<string, unknown>;
}

/**
 * Minimum score threshold below which the Meta Agent is triggered.
 * Agents scoring below this are considered to have produced unreliable output.
 */
const LOW_SCORE_THRESHOLD = 0.4;

/**
 * Number of consecutive retries that triggers meta intervention.
 */
const MAX_RETRY_THRESHOLD = 3;

export class TriggerDetector {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Check whether a given event should trigger a Meta Agent intervention.
   * Returns a MetaTrigger if intervention is warranted, null otherwise.
   */
  async checkTrigger(event: TriggerEvent): Promise<MetaTrigger | null> {
    // First check if the meta agent is enabled at all
    const enabled = await this.isMetaEnabled();
    if (!enabled) {
      return null;
    }

    const { type, details } = event;

    switch (type) {
      case 'agent_failure':
        return this.checkAgentFailure(details);

      case 'low_score':
        return this.checkLowScore(details);

      case 'max_retries':
        return this.checkMaxRetries(details);

      case 'contradiction':
        return this.checkContradiction(details);

      case 'agent_request':
        return this.checkAgentRequestTimeout(details);

      default:
        return null;
    }
  }

  /**
   * Check whether the Meta Agent is enabled in the learning configuration.
   * Defaults to false if the configuration table or key does not exist.
   */
  async isMetaEnabled(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('learning_configuration')
        .select('config_value')
        .eq('config_key', 'learning.meta_agent.enabled')
        .single();

      if (error || !data) {
        return false;
      }

      const configValue = data.config_value as Record<string, unknown> | null;
      return configValue?.enabled === true;
    } catch {
      // Table may not exist or query may fail -- default to disabled
      return false;
    }
  }

  /**
   * Agent failure: trigger if the agent has failed 3 or more times consecutively.
   */
  private checkAgentFailure(details: Record<string, unknown>): MetaTrigger | null {
    const retryCount = typeof details.retryCount === 'number' ? details.retryCount : 0;

    if (retryCount < MAX_RETRY_THRESHOLD) {
      return null;
    }

    return {
      reason: 'tool_failure',
      dealId: typeof details.dealId === 'string' ? details.dealId : undefined,
      agentType: typeof details.agentType === 'string' ? details.agentType : undefined,
      taskType: typeof details.taskType === 'string' ? details.taskType : undefined,
      details: {
        retryCount,
        lastError: details.lastError ?? null,
        failedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Low score: trigger if an agent's evaluation score falls below the threshold.
   */
  private checkLowScore(details: Record<string, unknown>): MetaTrigger | null {
    const score = typeof details.score === 'number' ? details.score : 1.0;

    if (score >= LOW_SCORE_THRESHOLD) {
      return null;
    }

    return {
      reason: 'low_score',
      dealId: typeof details.dealId === 'string' ? details.dealId : undefined,
      agentType: typeof details.agentType === 'string' ? details.agentType : undefined,
      taskType: typeof details.taskType === 'string' ? details.taskType : undefined,
      details: {
        score,
        threshold: LOW_SCORE_THRESHOLD,
        evaluationId: details.evaluationId ?? null,
        criteriaScores: details.criteriaScores ?? null,
      },
    };
  }

  /**
   * Max retries: always trigger -- this means all normal retry logic has been exhausted.
   */
  private checkMaxRetries(details: Record<string, unknown>): MetaTrigger {
    return {
      reason: 'max_retries',
      dealId: typeof details.dealId === 'string' ? details.dealId : undefined,
      agentType: typeof details.agentType === 'string' ? details.agentType : undefined,
      taskType: typeof details.taskType === 'string' ? details.taskType : undefined,
      details: {
        totalAttempts: details.totalAttempts ?? details.retryCount ?? 'unknown',
        lastError: details.lastError ?? null,
        failureHistory: details.failureHistory ?? [],
        exhaustedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Contradiction: trigger if severity is 'high' and the contradiction has not been resolved.
   */
  private async checkContradiction(details: Record<string, unknown>): Promise<MetaTrigger | null> {
    const severity = typeof details.severity === 'string' ? details.severity : 'low';
    const resolved = details.resolved === true;

    if (severity !== 'high' || resolved) {
      return null;
    }

    // Optionally verify the contradiction still exists in the database
    const contradictionId = typeof details.contradictionId === 'string' ? details.contradictionId : null;
    if (contradictionId) {
      try {
        const { data } = await this.supabase
          .from('consistency_checks')
          .select('id, severity, resolved_at')
          .eq('id', contradictionId)
          .single();

        // If the contradiction was resolved between event emission and now, skip
        if (data?.resolved_at) {
          return null;
        }
      } catch {
        // If we can't verify, proceed with the trigger -- better to over-intervene than miss
      }
    }

    return {
      reason: 'contradiction',
      dealId: typeof details.dealId === 'string' ? details.dealId : undefined,
      agentType: typeof details.agentType === 'string' ? details.agentType : undefined,
      taskType: typeof details.taskType === 'string' ? details.taskType : undefined,
      details: {
        contradictionId,
        severity,
        description: details.description ?? null,
        sourceAgent: details.sourceAgent ?? null,
        conflictingAgent: details.conflictingAgent ?? null,
      },
    };
  }

  /**
   * Agent request timeout: trigger if a pending agent request has expired
   * without being fulfilled.
   */
  private async checkAgentRequestTimeout(details: Record<string, unknown>): Promise<MetaTrigger | null> {
    const requestId = typeof details.requestId === 'string' ? details.requestId : null;

    if (!requestId) {
      // No request ID -- check if expired flag was set by caller
      if (details.expired === true) {
        return {
          reason: 'agent_request_timeout',
          dealId: typeof details.dealId === 'string' ? details.dealId : undefined,
          agentType: typeof details.targetAgent === 'string' ? details.targetAgent : undefined,
          taskType: typeof details.requestType === 'string' ? details.requestType : undefined,
          details: {
            requestingAgent: details.requestingAgent ?? null,
            targetAgent: details.targetAgent ?? null,
            requestType: details.requestType ?? null,
            expiredAt: new Date().toISOString(),
          },
        };
      }
      return null;
    }

    // Verify the request is actually expired in the database
    try {
      const { data } = await this.supabase
        .from('agent_requests')
        .select('id, status, requesting_agent, target_agent, request_type, deal_id, expires_at')
        .eq('id', requestId)
        .single();

      if (!data) {
        return null;
      }

      const isExpired = data.status === 'expired' ||
        (data.status === 'pending' && new Date(data.expires_at) < new Date());

      if (!isExpired) {
        return null;
      }

      return {
        reason: 'agent_request_timeout',
        dealId: typeof data.deal_id === 'string' ? data.deal_id : undefined,
        agentType: typeof data.target_agent === 'string' ? data.target_agent : undefined,
        taskType: typeof data.request_type === 'string' ? data.request_type : undefined,
        details: {
          requestId: data.id,
          requestingAgent: data.requesting_agent,
          targetAgent: data.target_agent,
          requestType: data.request_type,
          expiresAt: data.expires_at,
          detectedAt: new Date().toISOString(),
        },
      };
    } catch {
      // Table may not exist -- if the caller marked it expired, trust them
      if (details.expired === true) {
        return {
          reason: 'agent_request_timeout',
          dealId: typeof details.dealId === 'string' ? details.dealId : undefined,
          agentType: typeof details.targetAgent === 'string' ? details.targetAgent : undefined,
          taskType: typeof details.requestType === 'string' ? details.requestType : undefined,
          details: {
            requestId,
            requestingAgent: details.requestingAgent ?? null,
            targetAgent: details.targetAgent ?? null,
            expiredAt: new Date().toISOString(),
          },
        };
      }
      return null;
    }
  }
}
