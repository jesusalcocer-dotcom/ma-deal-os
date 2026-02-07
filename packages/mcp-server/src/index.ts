import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerDealTools } from './tools/deal-tools.js';
import { registerChecklistTools } from './tools/checklist-tools.js';
import { registerDocumentTools } from './tools/document-tools.js';
import { registerPrecedentTools } from './tools/precedent-tools.js';
import { registerSystemTools } from './tools/system-tools.js';

export const MCP_SERVER_VERSION = '0.1.0';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'ma-deal-os',
    version: MCP_SERVER_VERSION,
  });

  registerDealTools(server);
  registerChecklistTools(server);
  registerDocumentTools(server);
  registerPrecedentTools(server);
  registerSystemTools(server);

  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Only run main if this is the entry point (not imported as a module)
const isMain = typeof require !== 'undefined' && require.main === module;
if (isMain) {
  main().catch((err) => {
    console.error('MCP Server failed to start:', err);
    process.exit(1);
  });
}
