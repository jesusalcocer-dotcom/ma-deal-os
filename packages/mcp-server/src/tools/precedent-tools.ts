import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getSupabaseClient } from '../supabase.js';

export function registerPrecedentTools(server: McpServer): void {
  server.tool(
    'search_precedent',
    'Search precedent provision formulations by provision type and optional text query',
    {
      provisionType: z.string().describe('The provision type code to search for (e.g. "rep-financial-statements")'),
      query: z.string().optional().describe('Optional text search query to filter results'),
    },
    async ({ provisionType, query }) => {
      const supabase = getSupabaseClient();

      // Find the provision type by code
      const { data: provType } = await supabase
        .from('provision_types')
        .select('id, code, name, category')
        .eq('code', provisionType)
        .single();

      if (!provType) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Provision type not found', provision_type: provisionType }) }],
          isError: true,
        };
      }

      // Build formulations query
      let formQuery = supabase
        .from('provision_formulations')
        .select('id, text, source_firm, source_document_type, favorability_score, industry, year, deal_size_range, negotiation_outcome')
        .eq('provision_type_id', provType.id)
        .order('favorability_score', { ascending: false })
        .limit(20);

      if (query) {
        formQuery = formQuery.ilike('text', `%${query}%`);
      }

      const { data: formulations, error } = await formQuery;

      if (error) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Search failed', details: error.message }) }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            provision_type: provType,
            formulations: formulations || [],
            total: formulations?.length || 0,
          }, null, 2),
        }],
      };
    },
  );
}
