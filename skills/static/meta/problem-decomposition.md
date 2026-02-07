---
skill_id: meta/problem-decomposition
version: 1.0
type: meta
applicable_agents: [manager, specialist]
applicable_tasks: [analysis, planning, event_response]
depends_on: []
quality_score: 0.85
source: static
---

# Problem Decomposition

## Purpose

Complex M&A legal questions rarely have single-factor answers. This skill provides a
structured methodology for breaking multi-faceted deal issues into discrete, manageable
sub-questions that can be analyzed independently and then synthesized into a coherent
recommendation. Without disciplined decomposition, agents risk giving shallow answers
to deep questions or missing critical dimensions entirely.

## Framework

### Step 1: Identify the Core Issue

State the top-level question in a single sentence. Strip away context and noise to
expose the fundamental decision or judgment being requested. Ask: "What is the ONE
thing the partner needs to know or decide?" If the answer requires more than one
sentence, the core issue has not been sufficiently distilled.

Examples of well-formed core issues:
- "Should the buyer accept the seller's proposed indemnification cap?"
- "Does the material adverse change clause cover pandemic-related revenue decline?"
- "Which closing conditions create the highest risk of deal failure?"

### Step 2: Enumerate Sub-Issues Using the MECE Framework

MECE stands for Mutually Exclusive, Collectively Exhaustive. Each sub-issue must be
distinct (no overlapping analysis) and the full set must cover the entire problem space
(no gaps). This prevents both redundant work and blind spots.

Apply the issue tree methodology:
1. Branch the core issue into 2-5 primary sub-issues.
2. For each primary sub-issue, determine if it can be answered directly or needs
   further decomposition.
3. Continue branching until every leaf node is a question that can be answered with
   a single analysis step, a single data lookup, or a single legal judgment.

Validation check: read the leaf nodes back. If answering ALL of them fully addresses
the core issue, the decomposition is collectively exhaustive. If any two leaves would
require analyzing the same facts, they are not mutually exclusive -- merge or re-split.

### Step 3: Determine Dependencies Between Sub-Issues

Map which sub-issues depend on the conclusions of others. Build a directed acyclic
graph (DAG) of dependencies. This determines the order of analysis and identifies
which sub-issues can be investigated in parallel.

Dependency types:
- **Factual dependency**: Sub-issue B requires a factual finding from sub-issue A.
- **Legal dependency**: The legal standard in B changes based on the conclusion in A.
- **Strategic dependency**: The recommendation in B only matters if A resolves a
  particular way.

### Step 4: Prioritize by Impact and Urgency

Not all sub-issues carry equal weight. Rank them on two axes:
- **Impact**: How much does the answer to this sub-issue change the overall recommendation?
- **Urgency**: Is there a deadline, a negotiation session, or a filing that makes
  this time-sensitive?

High-impact, high-urgency sub-issues are analyzed first. Low-impact, low-urgency
sub-issues may be deferred or flagged for later review.

### Step 5: Synthesize Findings

After analyzing each sub-issue, integrate the findings bottom-up through the issue
tree. State the conclusion for each branch, then combine branch conclusions into the
answer to the core issue. Explicitly note where sub-issue conclusions reinforce each
other versus where they create tension that must be resolved.

## Application Guidelines

- Aim for 3-5 primary branches. Fewer than 3 suggests the problem was not complex
  enough to warrant formal decomposition. More than 5 suggests the core issue was
  not sufficiently focused.
- Each leaf node should be answerable in one analytical pass. If a leaf requires
  its own decomposition, the tree is not deep enough.
- Document the tree structure before beginning analysis. This prevents scope creep
  and ensures completeness.
- When presenting to the partner, lead with the core issue and recommendation, then
  offer the decomposition as supporting structure if they want to drill down.

## Common Mistakes to Avoid

- **Skipping to solutions**: Decomposing into "options" rather than "questions" --
  options come after analysis, not before.
- **Non-MECE splits**: Creating overlapping sub-issues that lead to contradictory
  or redundant analysis.
- **Over-decomposition**: Breaking simple issues into unnecessary sub-trees, wasting
  time and obscuring the straightforward answer.
- **Ignoring dependencies**: Analyzing sub-issues in the wrong order and having to
  redo work when an upstream conclusion changes.
- **Losing the forest**: Getting so deep into leaf-node analysis that the core issue
  and its practical implications are forgotten.

## Examples

**Core Issue**: Should the buyer waive the financing condition?

Issue tree:
1. What is the current financing status? (factual)
2. What are the contractual consequences of waiving? (legal)
   - 2a. Does waiver eliminate the reverse break fee protection?
   - 2b. Does waiver trigger any seller consent requirements?
3. What is the probability of financing falling through? (risk assessment)
4. What is the strategic value of waiving to accelerate closing? (business judgment)

Dependencies: 3 depends on 1. Recommendation synthesis depends on 2, 3, and 4.
Priority: 1 first (factual foundation), then 2 and 3 in parallel, then 4, then synthesize.
