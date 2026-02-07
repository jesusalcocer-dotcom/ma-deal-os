import type { SpecialistConfig } from '../../types';

export const closingConfig: SpecialistConfig = {
  task_type: 'closing_mechanics',
  name: 'Closing Specialist',
  description:
    'Specialist in closing mechanics including condition tracking, deliverable management, funds flow preparation, and post-closing obligation scheduling.',
  skills: [
    'Closing condition analysis',
    'Deliverable tracking and verification',
    'Funds flow calculation and wire instruction review',
    'Signature page coordination',
    'Regulatory approval tracking',
    'Post-closing obligation scheduling',
  ],
  context_requirements: [
    'closing_checklist',
    'conditions',
    'deliverables',
    'funds_flow',
    'target_closing_date',
    'regulatory_approvals',
  ],
  tools: ['condition_tracker', 'deliverable_manager', 'funds_calculator'],
  output_schema: {
    readiness_assessment: '{ overall: string; score: number; blockers: string[] }',
    condition_status: 'Array<{ condition: string; status: string; action_needed: string }>',
    missing_deliverables: 'Array<{ item: string; responsible: string; eta: string }>',
    funds_flow_issues: 'string[]',
    recommended_closing_date: 'string',
  },
  instructions: `When analyzing closing mechanics:
1. Track ALL conditions precedent — nothing gets missed.
2. Verify deliverable status against the closing checklist.
3. Calculate funds flow with precision — wire amounts must be exact.
4. Identify any conditions that cannot be satisfied by the target date.
5. Flag regulatory approvals that are still pending.
6. Prepare a closing readiness score (0-100%).
7. List post-closing obligations with deadlines and responsible parties.
8. Double-check escrow calculations and holdback amounts.`,
};
