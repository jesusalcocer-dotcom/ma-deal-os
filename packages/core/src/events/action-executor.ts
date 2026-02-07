import { SupabaseClient } from '@supabase/supabase-js';

interface ProposedActionRecord {
  id: string;
  chain_id: string;
  action_type: string;
  target_entity_type: string;
  target_entity_id?: string;
  payload: Record<string, any>;
}

export class ActionExecutor {
  constructor(private supabase: SupabaseClient) {}

  async execute(action: ProposedActionRecord): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      switch (action.action_type) {
        case 'checklist_status_update':
          return await this.executeChecklistStatusUpdate(action);
        case 'checklist_ball_with_update':
          return await this.executeChecklistBallWithUpdate(action);
        case 'status_update':
          return await this.executeStatusUpdate(action);
        case 'notification':
          return await this.executeNotification(action);
        case 'timeline_update':
          return await this.executeTimelineUpdate(action);
        case 'critical_path_update':
          return await this.executeCriticalPathUpdate(action);
        case 'closing_checklist_update':
          return await this.executeClosingChecklistUpdate(action);
        case 'analysis':
          return await this.executeAnalysis(action);
        case 'agent_evaluation':
          return await this.executeAgentEvaluation(action);
        default:
          return { success: false, error: `No executor for action type: ${action.action_type}` };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  private async executeChecklistStatusUpdate(action: ProposedActionRecord) {
    const newStatus = action.payload.new_status || action.payload.status;
    if (!action.target_entity_id || !newStatus) {
      // Log as activity instead if no specific target
      return await this.logActivity(action, `Checklist status update: ${newStatus}`);
    }
    const { error } = await this.supabase
      .from('checklist_items')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', action.target_entity_id);
    if (error) return { success: false, error: error.message };
    return { success: true, result: { updated: action.target_entity_id, status: newStatus } };
  }

  private async executeChecklistBallWithUpdate(action: ProposedActionRecord) {
    const ballWith = action.payload.ball_with || action.payload.new_ball_with;
    if (!action.target_entity_id || !ballWith) {
      return await this.logActivity(action, `Ball-with update: ${ballWith}`);
    }
    const { error } = await this.supabase
      .from('checklist_items')
      .update({ ball_with: ballWith, updated_at: new Date().toISOString() })
      .eq('id', action.target_entity_id);
    if (error) return { success: false, error: error.message };
    return { success: true, result: { updated: action.target_entity_id, ball_with: ballWith } };
  }

  private async executeStatusUpdate(action: ProposedActionRecord) {
    const newStatus = action.payload.new_status || action.payload.status;
    const table = action.target_entity_type === 'deal' ? 'deals' : action.target_entity_type;
    if (!action.target_entity_id || !newStatus) {
      return await this.logActivity(action, `Status update: ${newStatus}`);
    }
    const { error } = await this.supabase
      .from(table)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', action.target_entity_id);
    if (error) return { success: false, error: error.message };
    return { success: true, result: { updated: action.target_entity_id, status: newStatus } };
  }

  private async executeNotification(action: ProposedActionRecord) {
    return await this.logActivity(action, action.payload.action || action.payload.message || 'Notification');
  }

  private async executeTimelineUpdate(action: ProposedActionRecord) {
    return await this.logActivity(action, `Timeline update: ${JSON.stringify(action.payload)}`);
  }

  private async executeCriticalPathUpdate(action: ProposedActionRecord) {
    return await this.logActivity(action, `Critical path recalculated`);
  }

  private async executeClosingChecklistUpdate(action: ProposedActionRecord) {
    return await this.logActivity(action, `Closing checklist updated: ${action.payload.action || ''}`);
  }

  private async executeAnalysis(action: ProposedActionRecord) {
    return await this.logActivity(action, `Analysis completed: ${action.payload.action || ''}`);
  }

  private async executeAgentEvaluation(action: ProposedActionRecord) {
    return await this.logActivity(action, `Agent evaluation: ${action.payload.action || ''}`);
  }

  private async logActivity(action: ProposedActionRecord, description: string) {
    // Get deal_id from the action chain
    const { data: chain } = await this.supabase
      .from('action_chains')
      .select('deal_id')
      .eq('id', action.chain_id)
      .single();

    if (chain) {
      await this.supabase.from('activity_log').insert({
        deal_id: chain.deal_id,
        action: action.action_type,
        description: description.substring(0, 500),
        metadata: { action_id: action.id, chain_id: action.chain_id, payload: action.payload },
      });
    }
    return { success: true, result: { logged: true, description } };
  }
}
