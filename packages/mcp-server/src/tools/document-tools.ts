import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getSupabaseClient } from '../supabase.js';

export function registerDocumentTools(server: McpServer): void {
  server.tool(
    'get_documents',
    'Get all document versions for a deal with metadata',
    { dealId: z.string().uuid().describe('The UUID of the deal') },
    async ({ dealId }) => {
      const supabase = getSupabaseClient();

      const { data: versions, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Failed to fetch documents', details: error.message }) }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            deal_id: dealId,
            versions: versions || [],
            total: versions?.length || 0,
          }, null, 2),
        }],
      };
    },
  );
}
