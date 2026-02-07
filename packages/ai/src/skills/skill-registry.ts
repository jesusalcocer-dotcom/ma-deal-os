/**
 * Skill Registry
 * Finds applicable skills for a given task type and agent context.
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseFrontmatter } from './skill-loader';

interface SkillMetadata {
  skill_id: string;
  type: string;
  applicable_agents: string[];
  applicable_tasks: string[];
  depends_on: string[];
  quality_score: number;
  source: string;
}

/**
 * Find applicable skills for a task type and agent.
 * Scans the skills directory and returns matching skill IDs ordered by relevance.
 *
 * @param taskType The task type (e.g., "document_drafting", "dd_analysis")
 * @param context Optional context with agent type and quality threshold
 * @returns Array of skill IDs
 */
export function findApplicableSkills(
  taskType: string,
  context?: {
    agentType?: string;
    qualityThreshold?: number;
    includeAdaptive?: boolean;
  }
): string[] {
  const threshold = context?.qualityThreshold ?? 0.5;
  const agentType = context?.agentType;
  const allSkills = scanAllSkills();

  return allSkills
    .filter((skill) => {
      // Match task type
      const taskMatch =
        skill.applicable_tasks.length === 0 ||
        skill.applicable_tasks.some(
          (t) =>
            t === taskType ||
            taskType.includes(t) ||
            t.includes(taskType)
        );

      // Match agent type if specified
      const agentMatch =
        !agentType ||
        skill.applicable_agents.length === 0 ||
        skill.applicable_agents.includes(agentType);

      // Quality threshold
      const qualityMatch = skill.quality_score >= threshold;

      // Source filter
      const sourceMatch =
        skill.source === 'static' ||
        (context?.includeAdaptive && skill.source === 'adaptive');

      return taskMatch && agentMatch && qualityMatch && sourceMatch;
    })
    .sort((a, b) => b.quality_score - a.quality_score)
    .map((s) => s.skill_id);
}

/**
 * Scan all skill files and parse their metadata.
 */
function scanAllSkills(): SkillMetadata[] {
  const skillsRoot = getSkillsRoot();
  const skills: SkillMetadata[] = [];

  const categories = [
    { dir: 'static/domain', type: 'domain' },
    { dir: 'static/process', type: 'process' },
    { dir: 'static/meta', type: 'meta' },
  ];

  for (const { dir, type } of categories) {
    const fullDir = join(skillsRoot, dir);
    if (!existsSync(fullDir)) continue;

    const files = readdirSync(fullDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      try {
        const content = readFileSync(join(fullDir, file), 'utf-8');
        const meta = parseFrontmatter(content);
        if (!meta) continue;

        const skillName = file.replace('.md', '');
        skills.push({
          skill_id: meta.skill_id || `${type}/${skillName}`,
          type: meta.type || type,
          applicable_agents: Array.isArray(meta.applicable_agents)
            ? meta.applicable_agents
            : [],
          applicable_tasks: Array.isArray(meta.applicable_tasks)
            ? meta.applicable_tasks
            : [],
          depends_on: Array.isArray(meta.depends_on) ? meta.depends_on : [],
          quality_score:
            typeof meta.quality_score === 'number' ? meta.quality_score : 0.8,
          source: meta.source || 'static',
        });
      } catch {
        // Skip unreadable files
      }
    }
  }

  return skills;
}

function getSkillsRoot(): string {
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

  return join(process.cwd(), 'skills');
}
