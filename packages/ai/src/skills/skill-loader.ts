/**
 * Skill Loader
 * Reads skill markdown files from the filesystem and concatenates their content
 * for injection into specialist prompts.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Resolve the skills root directory relative to the project root
function getSkillsRoot(): string {
  // Walk up from this file to find the repo root (where skills/ lives)
  // packages/ai/src/skills/skill-loader.ts → 4 levels up
  const candidates = [
    join(__dirname, '..', '..', '..', '..', 'skills'),
    join(__dirname, '..', '..', '..', '..', '..', 'skills'),
    join(process.cwd(), 'skills'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to cwd
  return join(process.cwd(), 'skills');
}

/**
 * Resolve a skill ID to its filesystem path.
 * Skill IDs use the format "type/name" → "skills/static/type/name.md"
 */
function resolveSkillPath(skillId: string): string {
  const skillsRoot = getSkillsRoot();

  // Try static first, then adaptive, then dynamic
  const prefixes = ['static', 'adaptive', 'dynamic/generated', 'dynamic/pending-review'];

  for (const prefix of prefixes) {
    const fullPath = join(skillsRoot, prefix, `${skillId.replace('/', '/')}.md`);
    // The skillId already contains the type folder, e.g., "domain/markup-analysis"
    // So we need: skills/static/domain/markup-analysis.md
    const pathWithType = join(skillsRoot, prefix.split('/')[0], skillId + '.md');
    if (existsSync(fullPath)) return fullPath;
    if (existsSync(pathWithType)) return pathWithType;
  }

  // Direct path under skills/static/
  const directPath = join(skillsRoot, 'static', skillId + '.md');
  return directPath;
}

/**
 * Load skill files by their IDs and concatenate their content.
 * Returns a single string suitable for prompt injection.
 *
 * @param skillIds Array of skill IDs (e.g., ["domain/markup-analysis", "meta/confidence-calibration"])
 * @returns Concatenated skill content
 */
export async function loadSkills(skillIds: string[]): Promise<string> {
  const sections: string[] = [];

  for (const skillId of skillIds) {
    try {
      const path = resolveSkillPath(skillId);
      const content = await readFile(path, 'utf-8');

      // Strip YAML frontmatter (between --- delimiters)
      const stripped = stripFrontmatter(content);
      sections.push(`\n--- Skill: ${skillId} ---\n${stripped}`);
    } catch {
      // Skill file not found — skip silently
      sections.push(`\n--- Skill: ${skillId} (not found) ---\n`);
    }
  }

  return sections.join('\n');
}

/**
 * Strip YAML frontmatter from a markdown file.
 */
function stripFrontmatter(content: string): string {
  if (!content.startsWith('---')) return content;

  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) return content;

  return content.substring(endIndex + 3).trim();
}

/**
 * Parse YAML-like frontmatter from a skill file.
 * Simple parser for the skill metadata format.
 */
export function parseFrontmatter(
  content: string
): Record<string, any> | null {
  if (!content.startsWith('---')) return null;

  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) return null;

  const frontmatter = content.substring(3, endIndex).trim();
  const result: Record<string, any> = {};

  for (const line of frontmatter.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    // Parse arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as any;
    }
    // Parse numbers
    else if (!isNaN(Number(value))) {
      value = Number(value) as any;
    }

    result[key] = value;
  }

  return result;
}
