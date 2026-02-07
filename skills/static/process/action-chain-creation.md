---
skill_id: process/action-chain-creation
version: 1.0
type: process
applicable_agents: [manager]
applicable_tasks: [action_planning, event_response]
depends_on: [meta/problem-decomposition]
quality_score: 0.80
source: static
---

# Action Chain Creation

## Purpose

Action chains are the primary execution mechanism in M&A Deal OS. A chain is an ordered
sequence of discrete actions that together accomplish a goal — such as responding to a
due diligence finding, updating a disclosure schedule, or revising a purchase agreement
section. Well-structured chains execute faster, require fewer approval cycles, and
produce more predictable outcomes. This skill defines how to construct, sequence, and
tier action chains for maximum clarity and efficiency.

## Procedure

### Step 1: Identify the Trigger and Desired End State

Every action chain begins with a triggering event and a target outcome. Before
constructing any actions, articulate both in a single sentence. Example: "DD finding
on environmental liability discovered; end state is updated indemnity cap and revised
rep language in SPA Section 4.12." If the end state cannot be stated in one sentence,
the scope is too broad — decompose first using meta/problem-decomposition.

### Step 2: Enumerate Required Actions

List every discrete action needed to move from trigger to end state. Each action must
be independently verifiable — meaning someone can confirm it happened without needing
to inspect the full chain. Actions should be granular enough to complete in a single
agent invocation. Examples of well-scoped actions:

- "Draft revised representation language for Section 4.12"
- "Calculate updated indemnity cap based on new liability estimate"
- "Generate redline comparing current and proposed Section 4.12"

Examples of poorly-scoped actions (too broad):

- "Fix the environmental issue" (not specific or verifiable)
- "Update all affected documents" (multiple documents = multiple actions)

### Step 3: Determine Bundling vs Separation

Bundle actions into a single chain when they share all of these properties:
- Same deal context and document scope
- Sequential dependency (action B requires output of action A)
- Same approval tier (all auto-approve, or all require the same approver)
- Combined execution time under 120 seconds

Separate into distinct chains when:
- Actions target different documents or deal sections
- Actions require different approval tiers
- Actions can execute in parallel without dependencies
- A failure in one action should not block the others

### Step 4: Sequence Ordering

Within a chain, order actions by these rules in priority order:

1. **Data retrieval before analysis.** Fetch current state before computing changes.
2. **Computation before drafting.** Calculate values before writing prose that uses them.
3. **Drafting before formatting.** Get the substance right, then apply presentation.
4. **Internal before external.** Prepare internal documents before counterparty-facing ones.
5. **Lower-risk before higher-risk.** Place reversible actions before irreversible ones.

If two actions have no ordering constraint, place the faster one first to surface
failures sooner and reduce wasted compute on partial chains.

### Step 5: Generate Preview Content

Every chain must include a human-readable preview that supports fast approval. The
preview contains:

- **Chain summary**: One sentence describing the overall goal (max 120 characters).
- **Action count**: Total number of actions in the chain.
- **Estimated duration**: Sum of individual action time estimates.
- **Impact scope**: Which deal documents, sections, or parties are affected.
- **Reversibility note**: Whether the chain can be rolled back if results are wrong.

The preview is what appears in the approval queue. Write it for a partner who has
10 seconds to decide. Front-load the most important information.

### Step 6: Assign Approval Tiers

Each chain receives a tier based on its highest-impact action:

- **Tier 0 (Auto-approve)**: Internal calculations, data retrieval, analysis memos,
  draft generation that stays internal. No counterparty-facing output.
- **Tier 1 (Associate review)**: Document revisions, checklist updates, internal
  redlines. Output stays within the deal team.
- **Tier 2 (Partner review)**: Counterparty-facing communications, purchase price
  adjustments, material term changes, anything affecting deal economics.
- **Tier 3 (Client approval)**: Final document versions sent to counterparty,
  closing deliverables, public filings.

When in doubt, tier up. A chain that straddles two tiers takes the higher tier.

## Guidelines

- Keep chains between 2 and 8 actions. Single-action chains add overhead without
  benefit. Chains longer than 8 actions are hard to review and debug.
- Name each action with a verb-noun pattern: "Calculate cap", "Draft section",
  "Generate redline". This makes the chain scannable in the approval queue.
- Include rollback instructions for any action that modifies persisted state.
- Tag each action with its expected output type (text, number, document, notification)
  so downstream actions know what to consume.
- Log chain creation events to the activity log with the trigger reference.

## Common Mistakes to Avoid

- **Mega-chains**: Bundling 15 actions into one chain because they relate to the same
  event. Break them into logical sub-chains of 3-6 actions each.
- **Missing dependencies**: Assuming an action's input will be available without
  explicitly sequencing the producing action before it.
- **Under-tiering**: Marking a counterparty-facing draft as Tier 0 because the human
  "will review it anyway." The tier governs routing, not trust.
- **Vague previews**: Writing "Update documents per DD finding" instead of specifying
  which documents and which finding. The approver needs specifics.
- **Ignoring parallelism**: Placing independent actions in a serial chain when they
  could run as separate parallel chains, doubling execution time unnecessarily.
