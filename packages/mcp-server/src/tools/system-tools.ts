import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const REPO_ROOT = process.env.REPO_ROOT || process.cwd();

const ALLOWED_COMMANDS = [
  'git', 'pnpm', 'npm', 'npx', 'node', 'tsc', 'ls', 'cat', 'head', 'tail',
  'wc', 'grep', 'find', 'diff', 'echo', 'curl',
];

function sanitizePath(inputPath: string): string {
  const resolved = path.resolve(REPO_ROOT, inputPath);
  if (!resolved.startsWith(REPO_ROOT)) {
    throw new Error(`Path traversal detected: ${inputPath} resolves outside repo root`);
  }
  return resolved;
}

function isCommandAllowed(command: string): boolean {
  const firstWord = command.trim().split(/\s+/)[0];
  return ALLOWED_COMMANDS.includes(firstWord);
}

export function registerSystemTools(server: McpServer): void {
  server.tool(
    'read_file',
    'Read the contents of a file',
    { path: z.string().describe('File path relative to repo root') },
    async ({ path: filePath }) => {
      try {
        const safePath = sanitizePath(filePath);
        const content = await fs.readFile(safePath, 'utf-8');
        return {
          content: [{ type: 'text' as const, text: content }],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'write_file',
    'Write content to a file (creates or overwrites)',
    {
      path: z.string().describe('File path relative to repo root'),
      content: z.string().describe('Content to write'),
    },
    async ({ path: filePath, content }) => {
      try {
        const safePath = sanitizePath(filePath);
        await fs.mkdir(path.dirname(safePath), { recursive: true });
        await fs.writeFile(safePath, content, 'utf-8');
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ success: true, path: safePath }) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'list_directory',
    'List contents of a directory',
    { path: z.string().describe('Directory path relative to repo root') },
    async ({ path: dirPath }) => {
      try {
        const safePath = sanitizePath(dirPath);
        const entries = await fs.readdir(safePath, { withFileTypes: true });
        const result = entries.map((e) => ({
          name: e.name,
          type: e.isDirectory() ? 'directory' : 'file',
        }));
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'run_command',
    'Execute a shell command (restricted to safe commands)',
    {
      command: z.string().describe('Shell command to execute'),
      timeout: z.number().optional().describe('Timeout in milliseconds (default 30000)'),
    },
    async ({ command, timeout }) => {
      if (!isCommandAllowed(command)) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Command not allowed. Allowed: ${ALLOWED_COMMANDS.join(', ')}` }) }],
          isError: true,
        };
      }
      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: REPO_ROOT,
          timeout: timeout || 30000,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ stdout, stderr }) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message, stdout: err.stdout, stderr: err.stderr }) }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'git_status',
    'Get the current git status (porcelain format)',
    {},
    async () => {
      try {
        const { stdout } = await execAsync('git status --porcelain', { cwd: REPO_ROOT });
        return {
          content: [{ type: 'text' as const, text: stdout || '(clean working tree)' }],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'git_diff',
    'Get the current git diff',
    {},
    async () => {
      try {
        const { stdout } = await execAsync('git diff', { cwd: REPO_ROOT });
        return {
          content: [{ type: 'text' as const, text: stdout || '(no changes)' }],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }],
          isError: true,
        };
      }
    },
  );
}
