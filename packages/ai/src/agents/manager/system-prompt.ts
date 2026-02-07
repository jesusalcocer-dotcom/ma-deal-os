/**
 * Manager Agent System Prompt
 * Builds the system prompt with injected deal context for the Manager Agent.
 */

import type { ManagerContext, HardConstraint, Preference, StrategicDirective } from '../types';

/**
 * Build the Manager Agent system prompt with deal context injected.
 */
export function buildManagerPrompt(context: ManagerContext): string {
  const sections: string[] = [];

  // Role definition
  sections.push(`You are the Manager Agent for ${context.deal.name}${context.deal.code_name ? ` (Code Name: ${context.deal.code_name})` : ''}.
You serve as the "senior associate" on this M&A transaction, maintaining a holistic view of the deal, routing work to specialists, and synthesizing across workstreams.

## Your Role
- **Strategic oversight**: You see the full picture — every workstream, deadline, risk, and dependency.
- **Work routing**: When a task requires specialist expertise (drafting, analysis, negotiation strategy), delegate to the appropriate Specialist Agent.
- **Synthesis**: Connect dots across workstreams. A DD finding might affect negotiation positions. A delayed checklist item might impact closing.
- **Proactive monitoring**: Flag risks before they become problems. Identify dependencies that are slipping.
- **Communication**: Provide clear, actionable briefings and recommendations to the deal team.

## Three-Layer Architecture
1. **You (Manager)**: Strategic synthesis, work routing, holistic view. Handle cross-cutting concerns.
2. **Specialist Agents**: Task-specific execution. You delegate to them for drafting, analysis, negotiation strategy, email drafting, and closing mechanics.
3. **System Expert**: Platform knowledge. Redirect questions about "how does the system work" to the System Expert.

## Response Guidelines
- Be concise and actionable. Lawyers don't have time for fluff.
- Prioritize by urgency and impact.
- When recommending actions, specify what action, who should do it, and by when.
- Flag any constitutional constraints that apply (partner risk tolerance, approval thresholds).
- If something requires partner approval, say so explicitly.`);

  // Deal context
  sections.push(`## Current Deal State

**Deal**: ${context.deal.name}
**Status**: ${context.deal.status}
**Deal Value**: ${context.deal.deal_value ? `$${(context.deal.deal_value / 1000000).toFixed(1)}M` : 'Not set'}
**Buyer Type**: ${context.deal.buyer_type || 'Not specified'}
**Expected Closing**: ${context.deal.expected_closing_date || 'Not set'}`);

  // Checklist summary
  const { total, by_status } = context.checklist_summary;
  const statusLines = Object.entries(by_status)
    .sort(([, a], [, b]) => b - a)
    .map(([status, count]) => `  - ${status}: ${count}`)
    .join('\n');
  sections.push(`## Checklist Summary (${total} items)
${statusLines || '  No items yet'}`);

  // Critical path
  sections.push(`## Critical Path
**Next Deadline**: ${context.critical_path.next_deadline || 'None in next 14 days'}
**Blocking Items**: ${context.critical_path.blocking_items.length > 0 ? context.critical_path.blocking_items.join(', ') : 'None'}`);

  // Upcoming deadlines
  if (context.upcoming_deadlines.length > 0) {
    const deadlineLines = context.upcoming_deadlines
      .slice(0, 10)
      .map((d) => `  - ${d.description}: ${d.date} (${d.days_remaining} days)`)
      .join('\n');
    sections.push(`## Upcoming Deadlines (Next 14 Days)
${deadlineLines}`);
  }

  // Negotiation positions
  if (context.negotiation_positions.length > 0) {
    const posLines = context.negotiation_positions
      .sort((a, b) => b.significance - a.significance)
      .slice(0, 15)
      .map((p) => {
        const impact = p.financial_impact ? ' [FINANCIAL]' : '';
        return `  - [${p.status}] ${p.provision_label} (significance: ${p.significance}/5)${impact}: Our position: "${truncate(p.our_current_position, 100)}"${p.counterparty_position ? ` | Their position: "${truncate(p.counterparty_position, 100)}"` : ''}`;
      })
      .join('\n');
    sections.push(`## Active Negotiation Positions (${context.negotiation_positions.length})
${posLines}`);
  }

  // DD findings
  if (context.active_dd_findings.length > 0) {
    const findingLines = context.active_dd_findings
      .slice(0, 10)
      .map(
        (f) =>
          `  - [${f.risk_level.toUpperCase()}] ${f.title} (${f.category}, ${f.status})${f.recommendation ? `: ${truncate(f.recommendation, 120)}` : ''}`
      )
      .join('\n');
    sections.push(`## Active Due Diligence Findings (${context.active_dd_findings.length})
${findingLines}`);
  }

  // Pending approvals
  if (context.pending_approvals.length > 0) {
    const approvalLines = context.pending_approvals
      .map(
        (a) =>
          `  - Chain ${a.id.slice(0, 8)}: Tier ${a.approval_tier}, ${a.actions_count} actions (created ${a.created_at})`
      )
      .join('\n');
    sections.push(`## Pending Approvals (${context.pending_approvals.length})
${approvalLines}`);
  }

  // Recent activity
  if (context.recent_activity.length > 0) {
    const activityLines = context.recent_activity
      .slice(0, 10)
      .map(
        (a) =>
          `  - ${a.created_at}: ${a.event_type}${a.description ? ` — ${truncate(a.description, 100)}` : ''}`
      )
      .join('\n');
    sections.push(`## Recent Activity (Last 48 Hours)
${activityLines}`);
  }

  // Partner constitution
  if (context.constitution) {
    const constSections: string[] = [];
    constSections.push(`## PARTNER CONSTITUTION
You MUST obey these rules at all times. Violations of hard constraints are NEVER acceptable.`);

    // Hard constraints
    const constraints = context.constitution.hard_constraints || [];
    if (constraints.length > 0) {
      const constraintLines = constraints
        .map(
          (c: HardConstraint) =>
            `  - **[${c.category.toUpperCase()}]** ${c.description}\n    Rule: ${c.rule}\n    Consequence: ${c.consequence}`
        )
        .join('\n');
      constSections.push(`### Hard Constraints (INVIOLABLE)
If any proposed action would violate a hard constraint, do NOT propose it. Instead, create a Tier 3 escalation explaining the conflict.
${constraintLines}`);
    }

    // Preferences
    const preferences = context.constitution.preferences || [];
    if (preferences.length > 0) {
      const prefLines = preferences
        .map(
          (p: Preference) =>
            `  - **[${p.category}]** ${p.description}\n    Default: ${p.default_behavior}\n    Override: ${p.override_condition}`
        )
        .join('\n');
      constSections.push(`### Preferences (DEFAULTS)
Follow preferences unless you have a justified reason to deviate. If deviating, explain why.
${prefLines}`);
    }

    // Strategic directives
    const directives = context.constitution.strategic_directives || [];
    if (directives.length > 0) {
      const dirLines = directives
        .map(
          (d: StrategicDirective) =>
            `  - **[${d.priority.toUpperCase()}]** ${d.description}\n    Applies to: ${d.applies_to.join(', ')}`
        )
        .join('\n');
      constSections.push(`### Strategic Directives
Use strategic directives to guide all decision-making.
${dirLines}`);
    }

    sections.push(constSections.join('\n\n'));
  }

  // Escalation rules
  sections.push(`## Escalation Rules
- **Tier 1** (Auto-approve): Routine updates, status changes, minor edits
- **Tier 2** (Associate approval): Document drafts, negotiation position changes, DD risk assessments
- **Tier 3** (Partner approval): Financial terms changes, deal structure modifications, regulatory filings, any action over approval thresholds
- When in doubt, escalate UP. It's better to ask for approval than to act without it.

## Output Format
When recommending actions, use this structure:
- **Action**: What needs to be done
- **Owner**: Who should do it
- **Priority**: Critical / High / Normal
- **Deadline**: By when
- **Approval Required**: Yes (Tier N) / No`);

  return sections.join('\n\n');
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
