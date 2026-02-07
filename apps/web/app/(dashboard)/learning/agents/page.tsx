'use client';

import { useEffect, useState, useCallback } from 'react';

interface Evaluation {
  id: string;
  agent_type: string;
  overall_score: number;
  model_used: string;
  evaluated_at: string;
}

interface RoutingConfig {
  task_type: string;
  current_model: string;
  distillation_status: string;
  exemplar_count: number;
}

interface Pattern {
  id: string;
  agent_type: string | null;
  lifecycle_stage: string;
}

interface AgentSummary {
  agent_type: string;
  avg_quality_score: number;
  tasks_completed: number;
  current_model: string;
  active_patterns: number;
  distillation_status: string;
}

const AGENT_TYPE_LABELS: Record<string, string> = {
  term_sheet_parser: 'Term Sheet Parser',
  checklist_generator: 'Checklist Generator',
  document_drafter: 'Document Drafter',
  provision_segmenter: 'Provision Segmenter',
  dd_analyst: 'DD Analyst',
  negotiation_advisor: 'Negotiation Advisor',
  closing_coordinator: 'Closing Coordinator',
};

function scoreColor(score: number): string {
  if (score >= 0.8) return 'text-green-600';
  if (score >= 0.6) return 'text-yellow-600';
  return 'text-red-600';
}

function modelBadgeColor(model: string): string {
  if (model === 'opus') return 'bg-purple-100 text-purple-700 border-purple-300';
  if (model === 'sonnet') return 'bg-blue-100 text-blue-700 border-blue-300';
  return 'bg-gray-100 text-gray-600 border-gray-300';
}

function distillationLabel(status: string): string {
  switch (status) {
    case 'not_started':
      return 'Not Started';
    case 'collecting':
      return 'Collecting Exemplars';
    case 'testing':
      return 'Testing Handoff';
    case 'handed_off':
      return 'Handed Off';
    default:
      return status;
  }
}

function distillationColor(status: string): string {
  switch (status) {
    case 'not_started':
      return 'text-gray-500';
    case 'collecting':
      return 'text-yellow-600';
    case 'testing':
      return 'text-blue-600';
    case 'handed_off':
      return 'text-green-600';
    default:
      return 'text-gray-500';
  }
}

export default function AgentPerformancePage() {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch evaluations, routing config, and patterns in parallel
      const [evalRes, routingRes, patternsRes] = await Promise.all([
        fetch('/api/learning/signals/evaluations?limit=100'),
        fetch('/api/learning/routing'),
        fetch('/api/learning/patterns?limit=100'),
      ]);

      const evalData = evalRes.ok ? await evalRes.json() : { evaluations: [] };
      const routingData = routingRes.ok ? await routingRes.json() : [];
      const patternsData = patternsRes.ok ? await patternsRes.json() : { patterns: [] };

      const evaluations: Evaluation[] = evalData.evaluations || [];
      const routingConfigs: RoutingConfig[] = Array.isArray(routingData) ? routingData : [];
      const patterns: Pattern[] = patternsData.patterns || [];

      // Build agent summary map
      const agentMap = new Map<string, AgentSummary>();

      // Initialize from known agent types
      for (const agentType of Object.keys(AGENT_TYPE_LABELS)) {
        agentMap.set(agentType, {
          agent_type: agentType,
          avg_quality_score: 0,
          tasks_completed: 0,
          current_model: 'opus',
          active_patterns: 0,
          distillation_status: 'not_started',
        });
      }

      // Aggregate evaluations
      const scoresByAgent = new Map<string, number[]>();
      for (const ev of evaluations) {
        if (!scoresByAgent.has(ev.agent_type)) {
          scoresByAgent.set(ev.agent_type, []);
        }
        scoresByAgent.get(ev.agent_type)!.push(ev.overall_score);
      }

      for (const [agentType, scores] of scoresByAgent) {
        const existing = agentMap.get(agentType) || {
          agent_type: agentType,
          avg_quality_score: 0,
          tasks_completed: 0,
          current_model: 'opus',
          active_patterns: 0,
          distillation_status: 'not_started',
        };
        existing.avg_quality_score =
          scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        existing.tasks_completed = scores.length;
        agentMap.set(agentType, existing);
      }

      // Map routing config to agents (task_type often matches agent_type)
      for (const config of routingConfigs) {
        const agentType = config.task_type;
        const existing = agentMap.get(agentType);
        if (existing) {
          existing.current_model = config.current_model;
          existing.distillation_status = config.distillation_status || 'not_started';
        }
      }

      // Count active patterns per agent
      const activeStages = new Set(['proposed', 'confirmed', 'established', 'hard_rule']);
      for (const p of patterns) {
        if (activeStages.has(p.lifecycle_stage)) {
          if (p.agent_type) {
            const existing = agentMap.get(p.agent_type);
            if (existing) {
              existing.active_patterns += 1;
            }
          } else {
            // Pattern applies to all agents
            for (const agent of agentMap.values()) {
              agent.active_patterns += 1;
            }
          }
        }
      }

      // Sort by tasks_completed descending, then alphabetically
      const agentList = Array.from(agentMap.values()).sort((a, b) => {
        if (b.tasks_completed !== a.tasks_completed) return b.tasks_completed - a.tasks_completed;
        return a.agent_type.localeCompare(b.agent_type);
      });

      setAgents(agentList);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load agent data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Agent Performance</h1>
        <p className="text-muted-foreground">
          Quality metrics and model routing status for each agent type
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline hover:no-underline">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading agent data...</p>
      ) : agents.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground">No agent data available yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.agent_type} className="rounded-lg border p-5">
              {/* Agent name */}
              <h2 className="text-lg font-semibold mb-4">
                {AGENT_TYPE_LABELS[agent.agent_type] ||
                  agent.agent_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </h2>

              {/* Avg quality score */}
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-1">Avg Quality Score</p>
                <p className={`text-3xl font-bold font-mono ${scoreColor(agent.avg_quality_score)}`}>
                  {agent.tasks_completed > 0
                    ? (agent.avg_quality_score * 100).toFixed(1)
                    : '--'}
                  {agent.tasks_completed > 0 && (
                    <span className="text-base font-normal text-muted-foreground ml-0.5">%</span>
                  )}
                </p>
              </div>

              {/* Stats */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tasks Completed</span>
                  <span className="font-mono">{agent.tasks_completed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current Model</span>
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${modelBadgeColor(agent.current_model)}`}
                  >
                    {agent.current_model}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Patterns</span>
                  <span className="font-mono">{agent.active_patterns}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Distillation</span>
                  <span className={`text-xs font-medium ${distillationColor(agent.distillation_status)}`}>
                    {distillationLabel(agent.distillation_status)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
