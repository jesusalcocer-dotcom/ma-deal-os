---
skill_id: meta/objective-conflict-resolution
version: 1.0
type: meta
applicable_agents: [manager]
applicable_tasks: [analysis, negotiation_strategy, action_planning]
depends_on: [meta/escalation-judgment]
quality_score: 0.80
source: static
---

# Objective Conflict Resolution

## Purpose

M&A transactions involve inherent tensions between competing objectives: speed
versus thoroughness, price versus certainty, risk allocation versus deal completion.
When the agent system encounters conflicting objectives, it must have a principled
method for resolving them rather than defaulting to arbitrary choices or paralysis.
This skill provides the framework for identifying, analyzing, and resolving
objective conflicts while serving the client's interests.

## Framework

### Step 1: Identify the Conflict

Recognize when two or more objectives cannot be simultaneously satisfied:

- **Direct opposition**: Achieving A necessarily prevents achieving B (e.g.,
  aggressive indemnification terms versus cooperative seller relationship).
- **Resource competition**: Both achievable but not within available time or
  budget (e.g., completing environmental AND IP due diligence before a deadline).
- **Risk trade-off**: Pursuing one objective increases risk of another (e.g.,
  accelerating closing reduces time for thorough due diligence).
- **Stakeholder divergence**: Different stakeholders prioritize differently.

State the conflict explicitly. Name both objectives, why they conflict, and who
is affected by each.

### Step 2: Assess Relative Priority from Governing Sources

Consult priority sources in order:

1. **Legal and ethical obligations**: Always take precedence. Non-negotiable.
2. **Deal constitution**: Client's stated priorities for this transaction.
3. **Standing directives**: Partner's general instructions for common trade-offs.
4. **Market practice**: What similarly situated parties typically prioritize.
5. **Agent judgment**: Only when the above sources do not resolve the conflict.

If governing sources clearly resolve the conflict, apply the resolution and
document the reasoning. Otherwise, proceed to trade-off analysis.

### Step 3: Evaluate Trade-Offs Quantitatively Where Possible

For each conflicting objective, assess:

- **Magnitude of impact**: What is gained or lost? Express in dollars,
  probability of deal completion, or time where possible.
- **Reversibility**: Can the trade-off be corrected later?
- **Probability of adverse outcome**: How likely is actual harm?
- **Tail risk**: What is the worst case, even if unlikely?

Construct a decision matrix:

| Objective | Gain if Prioritized | Loss if Deprioritized | Reversible? | Worst Case |
|-----------|--------------------|-----------------------|-------------|------------|
| A         | ...                | ...                   | Yes/No      | ...        |
| B         | ...                | ...                   | Yes/No      | ...        |

### Step 4: Recommend a Resolution

Based on the analysis, recommend one of:

- **Prioritize A over B**: When sources or analysis clearly favor one objective.
- **Sequential pursuit**: When both are achievable in the right order.
- **Compromise position**: When partial achievement of both is optimal.
- **Escalate**: When material trade-offs exceed the agent's authority.

### Step 5: Present Alternatives to the Decision-Maker

Always present the analysis with alternatives:
1. State the conflict in one sentence.
2. Present the recommended resolution with rationale.
3. Present 1-2 alternative resolutions with their trade-offs.
4. State the consequences of inaction.

## Application Guidelines

- Legal obligations versus business objectives are not true conflicts -- legal
  obligations always win. Enforce and explain the business impact.
- When the deal constitution is silent, do not assume agent discretion. Escalate
  material trade-offs that the constitution does not address.
- Document every conflict resolution for institutional knowledge.
- Revisit resolved conflicts when circumstances change materially.

## Common Mistakes to Avoid

- **False conflicts**: Treating objectives as conflicting when creative problem-
  solving could satisfy both. Verify the conflict is real.
- **Defaulting to compromise**: Sometimes one objective should dominate entirely.
  Compromise for its own sake can serve neither objective well.
- **Ignoring the human dimension**: Objective conflicts often have interpersonal
  dynamics that pure analytical frameworks miss.
- **Analysis paralysis**: Minor conflicts should be resolved quickly, not
  subjected to the full framework.
- **Treating all stakeholder views equally**: The client's objectives take
  precedence. The agent serves the client through the partner.

## Examples

**Direct opposition**: The buyer wants broad representations (post-closing
protection). The seller wants narrow representations (minimal exposure). The deal
constitution states "priority: deal certainty over aggressive terms." Resolution:
recommend market-standard representations with targeted expansions only on
identified risk areas. Confidence: 0.85.

**Resource competition**: Environmental and IP due diligence both require 8 days
but only 10 days remain before the board meeting. Resolution: assess which
workstream has higher materiality to the deal thesis and prioritize it. If neither
can be deferred, escalate with a recommendation to engage external specialists.

**Stakeholder divergence**: The buyer's CFO wants a price reduction based on DD
findings. The CEO wants to maintain price to preserve the seller relationship.
The deal constitution does not address this. Resolution: escalate to the partner
with financial impact analysis and strategic value assessment. This is a business
judgment that exceeds agent authority.
