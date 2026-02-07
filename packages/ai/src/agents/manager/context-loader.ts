/**
 * Manager Agent Context Loader
 * Loads the full deal context needed by the Manager Agent from Supabase.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ManagerContext,
  NegotiationPositionSummary,
  DDFindingSummary,
  ActivityEntry,
  PendingApproval,
  Deadline,
} from '../types';

/**
 * Load the complete deal context for Manager Agent activation.
 * Queries Supabase for all relevant deal data and returns a structured ManagerContext.
 */
export async function loadManagerContext(
  supabase: SupabaseClient,
  dealId: string
): Promise<ManagerContext> {
  // Run all queries in parallel for performance
  const [
    dealResult,
    checklistResult,
    positionsResult,
    findingsResult,
    activityResult,
    chainsResult,
  ] = await Promise.all([
    // 1. Deal record
    supabase.from('deals').select('*').eq('id', dealId).single(),

    // 2. Checklist items (status counts + upcoming deadlines)
    supabase
      .from('checklist_items')
      .select('id, status, document_name, due_date, priority, category')
      .eq('deal_id', dealId),

    // 3. Negotiation positions (non-closed)
    supabase
      .from('negotiation_positions')
      .select(
        'id, provision_type, provision_label, our_current_position, their_current_position, status, significance, financial_impact, category'
      )
      .eq('deal_id', dealId)
      .neq('status', 'dead'),

    // 4. DD findings (active, ordered by risk)
    supabase
      .from('dd_findings')
      .select('id, summary, risk_level, risk_type, status, detail')
      .eq('deal_id', dealId)
      .in('status', ['draft', 'confirmed'])
      .order('risk_level', { ascending: true }),

    // 5. Activity log (last 48 hours)
    supabase
      .from('activity_log')
      .select('id, action, entity_type, details, created_at')
      .eq('deal_id', dealId)
      .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50),

    // 6. Pending action chains
    supabase
      .from('action_chains')
      .select('id, approval_tier, status, summary, created_at')
      .eq('deal_id', dealId)
      .eq('status', 'pending'),
  ]);

  // Build deal object
  const deal = dealResult.data;
  if (!deal) {
    throw new Error(`Deal not found: ${dealId}`);
  }

  // Build checklist summary
  const checklistItems = checklistResult.data || [];
  const byStatus: Record<string, number> = {};
  checklistItems.forEach((item) => {
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
  });

  // Build upcoming deadlines from checklist items with due dates in next 14 days
  const now = new Date();
  const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const deadlines: Deadline[] = checklistItems
    .filter((item) => {
      if (!item.due_date) return false;
      const dueDate = new Date(item.due_date);
      return dueDate >= now && dueDate <= fourteenDaysFromNow;
    })
    .map((item) => {
      const dueDate = new Date(item.due_date);
      const daysRemaining = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      return {
        description: item.document_name || item.category || 'Checklist item',
        date: item.due_date,
        days_remaining: daysRemaining,
      };
    })
    .sort((a, b) => a.days_remaining - b.days_remaining);

  // Build critical path
  const nextDeadline = deadlines.length > 0 ? deadlines[0].date : null;
  const blockingItems = checklistItems
    .filter((item) => item.priority === 'critical' && item.status !== 'executed')
    .map((item) => item.document_name || item.category || 'Critical item');

  // Map negotiation positions
  const positions: NegotiationPositionSummary[] = (positionsResult.data || []).map(
    (p) => ({
      id: p.id,
      provision_type: p.provision_type,
      provision_label: p.provision_label,
      our_current_position: p.our_current_position || '',
      counterparty_position: p.their_current_position,
      status: p.status,
      significance: p.significance || 3,
      financial_impact: p.financial_impact || false,
      category: p.category || 'general',
    })
  );

  // Map DD findings
  const findings: DDFindingSummary[] = (findingsResult.data || []).map((f) => ({
    id: f.id,
    title: f.summary,
    risk_level: f.risk_level,
    category: f.risk_type || 'general',
    status: f.status,
    recommendation: f.detail
      ? f.detail.substring(0, 200) + (f.detail.length > 200 ? '...' : '')
      : undefined,
  }));

  // Map activity entries
  const activity: ActivityEntry[] = (activityResult.data || []).map((a) => ({
    id: a.id,
    event_type: a.action,
    description: a.details?.description || `${a.action} on ${a.entity_type}`,
    created_at: a.created_at,
  }));

  // Map pending approvals
  const approvals: PendingApproval[] = (chainsResult.data || []).map((c) => ({
    id: c.id,
    approval_tier: c.approval_tier || 1,
    status: c.status,
    actions_count: 0, // Would need a join to count proposed_actions
    created_at: c.created_at,
  }));

  // Load partner constitution directly from deal record
  const constitution = deal.constitution || undefined;

  return {
    deal: {
      id: deal.id,
      name: deal.name,
      code_name: deal.code_name,
      status: deal.status,
      deal_value: deal.deal_value,
      buyer_type: deal.buyer_type,
      expected_closing_date: deal.expected_closing_date,
      parameters: deal.parameters,
    },
    checklist_summary: {
      total: checklistItems.length,
      by_status: byStatus,
    },
    negotiation_positions: positions,
    active_dd_findings: findings,
    recent_activity: activity,
    pending_approvals: approvals,
    constitution,
    critical_path: {
      next_deadline: nextDeadline,
      blocking_items: blockingItems,
    },
    upcoming_deadlines: deadlines,
  };
}
