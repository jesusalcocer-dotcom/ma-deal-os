/**
 * Seed Skills Registry
 * Scans skills directories and inserts/upserts registry records into Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const SKILLS_ROOT = join(__dirname, '..', 'skills');

interface SkillRecord {
  skill_id: string;
  type: string;
  path: string;
  version: string;
  quality_score: number;
  applicable_agents: string[];
  applicable_tasks: string[];
  depends_on: string[];
  source: string;
  description: string | null;
}

function parseFrontmatter(content: string): Record<string, any> | null {
  if (!content.startsWith('---')) return null;
  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) return null;

  const frontmatter = content.substring(3, endIndex).trim();
  const result: Record<string, any> = {};

  for (const line of frontmatter.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.substring(0, colonIndex).trim();
    let value: any = line.substring(colonIndex + 1).trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    } else if (!isNaN(Number(value)) && value !== '') {
      value = Number(value);
    }

    result[key] = value;
  }

  return result;
}

function scanSkills(): SkillRecord[] {
  const records: SkillRecord[] = [];

  const categories = [
    { dir: 'static/domain', type: 'domain', source: 'static' },
    { dir: 'static/process', type: 'process', source: 'static' },
    { dir: 'static/meta', type: 'meta', source: 'static' },
  ];

  for (const { dir, type, source } of categories) {
    const fullDir = join(SKILLS_ROOT, dir);
    let files: string[];
    try {
      files = readdirSync(fullDir).filter((f) => f.endsWith('.md'));
    } catch {
      console.log(`  Skipping ${dir} (not found)`);
      continue;
    }

    for (const file of files) {
      const filePath = join(fullDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const meta = parseFrontmatter(content);
      const skillName = file.replace('.md', '');

      // Extract first heading as description
      const headingMatch = content.match(/^#\s+(.+)$/m);
      const purposeMatch = content.match(/##\s+Purpose\s*\n([\s\S]*?)(?=\n##|\n---)/i);
      const description = purposeMatch
        ? purposeMatch[1].trim().substring(0, 200)
        : headingMatch
          ? headingMatch[1]
          : null;

      records.push({
        skill_id: meta?.skill_id || `${type}/${skillName}`,
        type: meta?.type || type,
        path: `${dir}/${file}`,
        version: meta?.version?.toString() || '1.0',
        quality_score: typeof meta?.quality_score === 'number' ? meta.quality_score : 0.8,
        applicable_agents: Array.isArray(meta?.applicable_agents) ? meta.applicable_agents : [],
        applicable_tasks: Array.isArray(meta?.applicable_tasks) ? meta.applicable_tasks : [],
        depends_on: Array.isArray(meta?.depends_on) ? meta.depends_on : [],
        source,
        description,
      });
    }
  }

  return records;
}

async function main() {
  console.log('=== Seeding Skills Registry ===\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('ERROR: Supabase credentials not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Scan skills
  const records = scanSkills();
  console.log(`Found ${records.length} skill files\n`);

  for (const record of records) {
    console.log(`  ${record.skill_id} (${record.type}) — ${record.path}`);
  }

  // Upsert into database
  console.log('\nInserting into skills_registry...');
  const { data, error } = await supabase.from('skills_registry').upsert(
    records.map((r) => ({
      skill_id: r.skill_id,
      type: r.type,
      path: r.path,
      version: r.version,
      quality_score: r.quality_score,
      applicable_agents: r.applicable_agents,
      applicable_tasks: r.applicable_tasks,
      depends_on: r.depends_on,
      source: r.source,
      description: r.description,
    })),
    { onConflict: 'skill_id' }
  );

  if (error) {
    if (error.message?.includes('skills_registry')) {
      console.log('DEFERRED: skills_registry table not created yet');
      console.log('  Run migration 013 via Supabase Dashboard first');
    } else {
      console.log('ERROR:', error.message);
    }
  } else {
    console.log('SUCCESS: All skills registered');
  }

  // Verify
  const { data: count } = await supabase.from('skills_registry').select('skill_id');
  if (count) {
    console.log(`\nVerification: ${count.length} skills in registry`);
  }

  console.log(`\nDone. ${records.length} skills processed.`);
}

main().catch(console.error);
