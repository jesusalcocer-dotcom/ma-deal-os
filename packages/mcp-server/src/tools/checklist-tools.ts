import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getSupabaseClient } from '../supabase.js';

export function registerChecklistTools(server: McpServer): void {
  server.tool(
    'get_checklist',
    'Get all checklist items for a deal with their statuses',
    { dealId: z.string().uuid().describe('The UUID of the deal') },
    async ({ dealId }) => {
      const supabase = getSupabaseClient();

      const { data: items, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: true });

      if (error) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Failed to fetch checklist', details: error.message }) }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            deal_id: dealId,
            items: items || [],
            total: items?.length || 0,
          }, null, 2),
        }],
      };
    },
  );
}
