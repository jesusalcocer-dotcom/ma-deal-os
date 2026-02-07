# Phase 8: Skills System

## Prerequisites
- Phase 7 complete (Manager Agent, Specialist framework, System Expert)
- Agent activation working with real Claude API calls
- Specialist configuration framework functional

## What You're Building

The skills system provides structured knowledge modules that agents load to perform specific tasks. You are building:
1. **Skills directory structure** with static, adaptive, and dynamic skill categories
2. **Static skills library** — the initial set of M&A domain knowledge, process procedures, and meta-reasoning skills
3. **Skill loading logic** — how specialists discover and load relevant skills
4. **Skills registry** — database table tracking all skills with metadata
5. **Adaptive skill creation** — pipeline that generates skills from feedback patterns

## Reference
- SPEC-V2-COMPLETE.md Section 8 (Skills System)

## Steps

### Step 8.1: Skills Directory Structure

**What:** Create the skills directory hierarchy and the skills registry table.

**Files to create/modify:**
- `skills/static/domain/` — Directory for domain skills
- `skills/static/process/` — Directory for process skills
- `skills/static/meta/` — Directory for meta skills
- `skills/adaptive/partner-preferences/` — Directory for learned preferences
- `skills/adaptive/counterparty-patterns/` — Directory for counterparty patterns
- `skills/adaptive/deal-type-refinements/` — Directory for deal-type learnings
- `skills/adaptive/firm-conventions/` — Directory for firm norms
- `skills/dynamic/generated/` — Directory for on-the-fly skills
- `skills/dynamic/pending-review/` — Directory for unvalidated skills
- `packages/db/src/schema/skills-registry.ts` — Drizzle schema for skills_registry table

**Implementation details:**
- Create all directories
- Create `skills_registry` table in Supabase
- Each directory gets a `.gitkeep` placeholder

**Test:**
```bash
# Verify directory structure
ls -la skills/static/domain/ skills/static/process/ skills/static/meta/ skills/adaptive/ skills/dynamic/
# Verify table
npx tsx -e "
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('skills_registry').select('*').limit(1).then(r => console.log('Table exists:', !r.error));
"
```
**Expected:** Directories exist. Table exists.
**Severity:** 🔴 CRITICAL

### Step 8.2: Core Domain Skills (Batch 1)

**What:** Write the first 5 static domain skills.

**Files to create:**
- `skills/static/domain/markup-analysis.md`
- `skills/static/domain/provision-drafting.md`
- `skills/static/domain/negotiation-strategy.md`
- `skills/static/domain/dd-methodology.md`
- `skills/static/domain/closing-mechanics.md`

**Implementation details:**
Each skill file follows the format from SPEC-V2-COMPLETE.md Section 8.2:
```markdown
---
skill_id: domain/markup-analysis
version: 1.0
type: domain
applicable_agents: [specialist]
applicable_tasks: [markup_analysis]
depends_on: [domain/provision-drafting]
quality_score: 0.80
source: static
---
# Markup Analysis
## Purpose
## Methodology
### Step 1: ...
## Common Patterns
## Common Mistakes to Avoid
## Examples
```

Content for each skill should encode real M&A legal knowledge:
- **markup-analysis:** How to analyze counterparty markups provision by provision. Structural comparison, change classification (variant change, threshold change, language refinement, addition, deletion), severity assessment, favorability scoring, response recommendation.
- **provision-drafting:** Conventions for SPA provisions. Cross-reference management, defined term consistency, qualifier handling (knowledge, materiality), carve-out drafting, basket/cap/survival mechanics.
- **negotiation-strategy:** Frameworks for negotiation planning. Opening position calibration, concession sequencing, trade identification, impasse resolution, market data usage.
- **dd-methodology:** Systematic DD review by workstream. Document review priorities, risk classification (critical/high/medium/low), exposure quantification, finding documentation standards.
- **closing-mechanics:** Pre-closing checklist management. Condition satisfaction tracking, deliverable coordination, funds flow mechanics, signature page protocol, closing call procedure.

**Test:**
```bash
# Verify all 5 files exist and have metadata
for f in markup-analysis provision-drafting negotiation-strategy dd-methodology closing-mechanics; do
  if [ -f "skills/static/domain/$f.md" ]; then
    echo "PASS: $f.md exists ($(wc -l < skills/static/domain/$f.md) lines)"
  else
    echo "FAIL: $f.md missing"
  fi
done
```
**Expected:** All 5 files exist with substantial content (100+ lines each).
**Severity:** 🔴 CRITICAL

### Step 8.3: Additional Domain Skills (Batch 2)

**What:** Write 5 more domain skills covering specialized knowledge areas.

**Files to create:**
- `skills/static/domain/disclosure-schedules.md`
- `skills/static/domain/indemnification-structures.md`
- `skills/static/domain/purchase-price-mechanics.md`
- `skills/static/domain/employment-matters.md`
- `skills/static/domain/ip-assessment.md`

**Implementation details:**
- **disclosure-schedules:** Schedule generation methodology, cross-referencing between reps and schedules, gap detection, client questionnaire design, common disclosure traps.
- **indemnification-structures:** Basket types (tipping vs. true deductible vs. hybrid), cap structures (percentage, specific dollar, tiered), survival periods (general vs. fundamental vs. tax), carve-outs for fraud/fundamental reps, mini-basket thresholds, R&W insurance interaction.
- **purchase-price-mechanics:** Working capital adjustment (peg methodology, net working capital definition, disputed items), earnout structures (metric selection, accounting methodology, buyer obligations), escrow mechanics (release schedule, claims process), holdback mechanics.
- **employment-matters:** Key employee retention agreements, non-compete scope (geographic, temporal, activity), WARN Act analysis, benefit plan continuation, equity treatment.
- **ip-assessment:** Patent portfolio evaluation, trade secret protection assessment, license agreement review (assignment clauses, change-of-control), open source compliance, IP indemnification.

**Test:**
```bash
ls -la skills/static/domain/*.md | wc -l
# Should be 10
```
**Expected:** 10 domain skill files exist.
**Severity:** 🟡 HIGH

### Step 8.4: Process Skills

**What:** Write all 6 process skills.

**Files to create:**
- `skills/static/process/action-chain-creation.md`
- `skills/static/process/approval-queue-formatting.md`
- `skills/static/process/email-communication.md`
- `skills/static/process/document-versioning.md`
- `skills/static/process/closing-coordination.md`
- `skills/static/process/client-communication.md`

**Implementation details:**
- **action-chain-creation:** How to structure action chains for clarity and efficiency. When to bundle actions vs. separate them. Sequence ordering for dependent actions. Preview content that enables fast approval.
- **approval-queue-formatting:** Formatting guidelines for approval queue items. Summary writing that enables 10-second decisions. Significance assessment calibration. Preview content standards.
- **email-communication:** Tone and format guidelines for legal emails. Counterparty communication (firm, professional, precise). Client communication (accessible, reassuring, action-oriented). Follow-up protocols.
- **document-versioning:** Version numbering conventions. Change manifest creation. When to create new major versions vs. revisions. Markup tracking standards.
- **closing-coordination:** Pre-closing call agenda. Signature page logistics. Funds flow verification steps. Post-closing obligation handoff.
- **client-communication:** Client-appropriate language (no legalese). Status update structure. Action item framing. Bad news delivery. Decision memo format.

**Test:**
```bash
ls -la skills/static/process/*.md | wc -l
# Should be 6
```
**Expected:** 6 process skill files exist.
**Severity:** 🟡 HIGH

### Step 8.5: Meta Skills

**What:** Write all 6 meta skills for higher-order reasoning.

**Files to create:**
- `skills/static/meta/problem-decomposition.md`
- `skills/static/meta/confidence-calibration.md`
- `skills/static/meta/escalation-judgment.md`
- `skills/static/meta/gap-recognition.md`
- `skills/static/meta/skill-scoping.md`
- `skills/static/meta/objective-conflict-resolution.md`

**Implementation details:**
- **problem-decomposition:** How to break complex legal questions into sub-questions. Identify the core issue, enumerate sub-issues, determine dependencies, prioritize by impact.
- **confidence-calibration:** How to accurately assess and report confidence. Distinguish between "I know the answer" (0.9+), "I have a strong basis" (0.7-0.9), "I'm reasoning from analogy" (0.5-0.7), and "I'm guessing" (<0.5). When to escalate based on confidence.
- **escalation-judgment:** Criteria for escalating to the partner. Always escalate: deal economics changes, novel legal issues, constitutional violations, conflicting workstream data. Never escalate: routine status updates, standard provision drafting, automated cross-references.
- **gap-recognition:** How to identify when existing capabilities are insufficient. Pattern: "I need to do X. Available tools/skills cover Y. Gap: X - Y = Z." Trigger dynamic skill creation.
- **skill-scoping:** How to define what a new skill needs to cover. Input/output specification, methodology steps, example scenarios, quality criteria.
- **objective-conflict-resolution:** How to handle conflicts between competing deal objectives. Framework: identify the conflict, assess relative priority (from constitution/directives), evaluate trade-offs, recommend resolution, present alternatives.

**Test:**
```bash
ls -la skills/static/meta/*.md | wc -l
# Should be 6
```
**Expected:** 6 meta skill files exist.
**Severity:** 🟡 HIGH

### Step 8.6: Skill Loader

**What:** Function that discovers and loads relevant skills for a specialist configuration.

**Files to create/modify:**
- `packages/ai/src/skills/skill-loader.ts` — `loadSkills(skillIds: string[]): Promise<string>` — reads skill files and concatenates content
- `packages/ai/src/skills/skill-registry.ts` — `findApplicableSkills(taskType, context): string[]` — finds relevant skills for a task

**Implementation details:**
- `loadSkills()`: Read skill markdown files from the filesystem, concatenate, return as a single string for prompt injection
- `findApplicableSkills()`: Query the skills registry table (or scan filesystem) for skills matching:
  - `applicable_tasks` contains the task type
  - `applicable_agents` contains the agent type
  - Quality score above threshold (default 0.5)
- Load adaptive skills if they match the context (partner preferences, deal type)
- Return skill IDs ordered by relevance

**Test:**
```bash
pnpm build --filter @ma-deal-os/ai
node -e "
const { loadSkills } = require('./packages/ai/dist/skills/skill-loader');
loadSkills(['domain/markup-analysis', 'meta/confidence-calibration']).then(content => {
  console.log('Loaded skills length:', content.length, 'chars');
  console.log('Contains markup analysis:', content.includes('Markup Analysis'));
  console.log('PASS: Skill loader works');
});
"
```
**Expected:** Skills loaded from filesystem. Combined content includes both skill names.
**Severity:** 🔴 CRITICAL

### Step 8.7: Seed Skills Registry

**What:** Populate the skills_registry table with metadata for all static skills.

**Files to create/modify:**
- `scripts/seed-skills-registry.ts` — Script to scan skills directory and insert registry records

**Implementation details:**
- Scan `skills/static/**/*.md` files
- Parse YAML frontmatter from each file
- Insert/upsert into `skills_registry` table with: skill_id, type, path, version, quality_score, applicable_agents, applicable_tasks, depends_on, source

**Test:**
```bash
npx tsx scripts/seed-skills-registry.ts
npx tsx -e "
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('skills_registry').select('*').then(r => console.log('Skills registered:', r.data?.length));
"
```
**Expected:** 22 skills registered (10 domain + 6 process + 6 meta).
**Severity:** 🟡 HIGH

### Step 8.8: Integrate Skills into Specialist Configuration

**What:** Update the specialist factory to load skills as part of specialist prompt construction.

**Files to modify:**
- `packages/ai/src/agents/specialists/specialist-factory.ts` — Call skill loader during prompt construction

**Implementation details:**
- When `createSpecialist(config)` is called:
  1. Call `findApplicableSkills(config.task_type, config.context)` to discover relevant skills
  2. Merge with explicitly requested `config.skills`
  3. Call `loadSkills(skillIds)` to load content
  4. Inject loaded skill content into the specialist system prompt
- The specialist prompt structure:
  ```
  [Role Description]
  [Loaded Skills]
  [Task-Specific Context]
  [Output Schema]
  [Instructions]
  ```

**Test:**
```bash
# Test that a drafter specialist loads provision-drafting and cross-reference skills
pnpm build --filter @ma-deal-os/ai
node -e "
const { createSpecialist } = require('./packages/ai/dist/agents/specialists/specialist-factory');
const runner = createSpecialist({
  task_type: 'document_drafting',
  skills: ['domain/provision-drafting'],
  context: { documents: [], deal_state_subset: [] },
  tools: [], output_schema: {}, instructions: 'Test'
});
console.log('Specialist with skills created');
console.log('PASS');
"
```
**Expected:** Specialist created with skills loaded into prompt.
**Severity:** 🔴 CRITICAL

### Step 8.9: Build Verification

**Test:**
```bash
pnpm build
echo "Total skill files:"
find skills -name "*.md" | wc -l
```
**Expected:** Build succeeds. 22+ skill files exist.
**Severity:** 🔴 CRITICAL

## Phase Gate
- [ ] Skills directory structure with static/adaptive/dynamic subdirectories
- [ ] 10 domain skill files with substantial M&A legal content
- [ ] 6 process skill files with operational procedures
- [ ] 6 meta skill files with reasoning frameworks
- [ ] skills_registry table populated with 22 entries
- [ ] Skill loader reads and concatenates skill content
- [ ] Specialist factory integrates skills into prompts
- [ ] `pnpm build` succeeds
