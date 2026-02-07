import type { SpecialistConfig } from '../../types';

export const negotiationConfig: SpecialistConfig = {
  task_type: 'negotiation_strategy',
  name: 'Negotiation Strategist',
  description:
    'Specialist in analyzing negotiation positions, developing concession strategies, and recommending counterproposals for M&A transactions.',
  skills: [
    'Position analysis and comparison',
    'Concession strategy development',
    'Market standard benchmarking',
    'Financial impact assessment',
    'Package deal construction',
    'BATNA analysis',
  ],
  context_requirements: [
    'provision_type',
    'our_position',
    'their_position',
    'position_history',
    'deal_parameters',
    'significance',
    'related_findings',
  ],
  tools: ['position_search', 'precedent_lookup', 'market_data'],
  output_schema: {
    analysis: '{ strength: string; weakness: string; market_standard: string }',
    recommended_response: '{ position: string; rationale: string }',
    concession_options: 'Array<{ concession: string; value_given: string; value_received: string }>',
    package_suggestions: 'string[]',
    risk_if_deadlocked: 'string',
  },
  instructions: `When analyzing negotiation positions:
1. Assess our position's strength relative to market standard.
2. Consider the counterparty's likely motivations and constraints.
3. Propose concession strategies that trade low-value items for high-value ones.
4. Consider package deals — linking concessions across provisions.
5. Identify BATNA (Best Alternative To Negotiated Agreement) implications.
6. Flag positions that have financial impact and require partner approval.
7. Never concede on matters of principle without explicit partner authorization.`,
};
