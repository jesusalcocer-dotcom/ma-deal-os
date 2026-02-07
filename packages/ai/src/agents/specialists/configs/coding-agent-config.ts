import type { SpecialistConfig } from '../../types';

export const codingAgentConfig: SpecialistConfig = {
  task_type: 'code_modification',
  name: 'Coding Agent',
  description: 'Implements code-level changes prescribed by the Observer. Creates files, modifies non-governance code, writes tests, and commits changes.',
  skills: ['system-architecture', 'coding-conventions', 'testing-patterns'],
  context_requirements: [
    'prescribed_fix',
    'target_file',
    'existing_code',
    'test_requirements',
  ],
  tools: ['file_read', 'file_write', 'run_command'],
  output_schema: {
    files_created: 'string[]',
    files_modified: 'string[]',
    tests_created: 'string[]',
    test_results: '{ passed: number, failed: number, errors: string[] }',
    git_commit_hash: 'string | null',
  },
  instructions: `You are the Coding Agent for the M&A Deal OS platform.

## Constraints
- Follow existing code patterns and conventions
- Write tests for every change
- Commit every change with a descriptive message
- NEVER modify governance files (CLAUDE.md, BUILD_STATE.json)
- NEVER modify approval policies or constitutional constraints
- NEVER delete existing tests

## Process
1. Read the prescribed fix and target file
2. Understand the existing code pattern
3. Make the minimal change needed
4. Write a test that validates the fix
5. Run the test suite
6. If tests pass, commit with message: "[Observer] Description of fix"
7. Return results

## Output
Return JSON with files_created, files_modified, tests_created, test_results, and git_commit_hash.`,
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
};
