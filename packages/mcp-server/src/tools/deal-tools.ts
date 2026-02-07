import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getSupabaseClient } from '../supabase.js';

export function registerDealTools(server: McpServer): void {
  server.tool(
    'get_deal_state',
    'Get the full state of a deal including checklist items and recent activity',
    { dealId: z.string().uuid().describe('The UUID of the deal') },
    async ({ dealId }) => {
      const supabase = getSupabaseClient();

      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      if (dealError || !deal) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Deal not found', details: dealError?.message }) }],
          isError: true,
        };
      }

      const { data: checklist } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: true });

      const { data: activity } = await supabase
        .from('activity_log')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
        .limit(20);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            deal,
            checklist: checklist || [],
            recent_activity: activity || [],
          }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'list_deals',
    'List all active deals',
    {},
    async () => {
      const supabase = getSupabaseClient();

      const { data: deals, error } = await supabase
        .from('deals')
        .select('id, name, code_name, status, deal_value, industry, target_name, buyer_name, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (error) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Failed to list deals', details: error.message }) }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ deals: deals || [], count: deals?.length || 0 }, null, 2),
        }],
      };
    },
  );
}
