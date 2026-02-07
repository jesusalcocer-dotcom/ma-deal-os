---
skill_id: meta/escalation-judgment
version: 1.0
type: meta
applicable_agents: [manager]
applicable_tasks: [event_response, action_planning, approval_routing]
depends_on: [meta/confidence-calibration]
quality_score: 0.85
source: static
---

# Escalation Judgment

## Purpose

The manager agent must continuously decide which matters require partner attention
and which can be handled autonomously. Over-escalation erodes trust and wastes
partner time. Under-escalation risks unauthorized decisions on material matters.
This skill defines the bright-line rules and the gray-zone decision framework for
making correct escalation calls consistently.

## Framework

### Step 1: Apply the Bright-Line Rules

Certain categories of events ALWAYS require escalation, regardless of confidence
level or time pressure. These are non-negotiable.

**Always escalate:**
- Any change to deal economics (purchase price, earnout terms, working capital
  adjustments, break fees, or reverse break fees)
- Novel legal issues with no clear precedent in the agent's knowledge base
- Any potential breach of the deal constitution or standing directives
- Counterparty threats of litigation or regulatory complaints
- Discovery of material misrepresentations in seller disclosures
- Any matter involving personal liability of the partner or the firm
- Regulatory or antitrust filing decisions
- Changes to closing conditions or termination rights

**Never escalate (handle autonomously):**
- Routine status updates on deal timeline milestones
- Standard drafting of non-material provisions using established templates
- Organizing and indexing due diligence documents
- Scheduling and logistics coordination
- Generating first drafts of routine correspondence
- Updating the deal checklist based on completed tasks

### Step 2: Assess the Gray Zone

Most escalation decisions fall between the bright lines. For gray-zone matters,
apply the following decision factors:

**Factor 1: Reversibility**
Can the decision be undone if the partner disagrees? Reversible decisions (internal
analysis choices, draft language not yet sent) carry lower escalation urgency.
Irreversible decisions (sent communications, filed documents) require escalation.

**Factor 2: Materiality**
What is the dollar impact or risk exposure if this decision is wrong? Use the
deal's materiality threshold as the benchmark. Matters below threshold can be
handled autonomously with a log entry.

**Factor 3: Precedent**
Has the partner previously addressed a similar matter? If the partner has
consistently made the same call on similar issues, the agent may follow that
pattern without escalation, provided the facts are not materially distinguishable.

**Factor 4: Time Sensitivity**
Is there a deadline that makes escalation impractical? If the partner is unavailable
and a deadline is imminent, take the most conservative action available and escalate
immediately afterward with a full explanation.

### Step 3: Formulate the Escalation Package

When escalating, provide the partner with a complete decision package:

1. **Issue summary**: One sentence stating the question requiring judgment.
2. **Context**: What triggered this issue and why it matters to the deal.
3. **Analysis**: The agent's assessment, including confidence score.
4. **Recommendation**: What the agent would do if authorized to decide.
5. **Alternatives**: Other reasonable courses of action with trade-offs.
6. **Deadline**: When a decision is needed and what happens if deferred.

### Step 4: Route to the Correct Escalation Level

- **Deal partner**: Material terms, economics, strategy, novel legal issues
- **Senior associate**: Non-material but complex drafting, DD findings needing
  legal interpretation, procedural questions
- **Client directly**: Only when explicitly authorized by the deal constitution

If no routing rule exists for the matter type, default to the deal partner.

## Application Guidelines

- Log every escalation decision with reasoning for audit trail purposes.
- When in genuine doubt, escalate. The cost of a false positive is always lower
  than the cost of a false negative on a material matter.
- Batch non-urgent escalations into a daily summary. Urgent escalations go
  immediately.
- After receiving the partner's decision, update decision patterns for future use.

## Common Mistakes to Avoid

- **Escalation fatigue**: Escalating everything to avoid responsibility, which
  trains the partner to ignore escalations.
- **Confidence as a proxy for materiality**: High-confidence conclusions on
  material matters still require escalation.
- **Assuming silence means approval**: If the partner does not respond, do not
  treat silence as authorization. Follow up or take conservative action.
- **Skipping the package**: Escalating with "what should we do?" instead of
  providing full analysis and recommendation.
- **Forgetting to close the loop**: After the partner decides, failing to record
  the decision and rationale for future reference.

## Examples

**Clear escalation**: Seller's counsel proposes reducing the indemnification cap
from 15% to 5% of purchase price. This is a deal economics change -- always
escalate, no analysis needed to determine whether to escalate.

**Gray zone -- no escalation**: One of 200 customer contracts lacks an assignment
clause. The contract represents 0.3% of revenue (below materiality). Log the
finding and include in the next daily summary.

**Gray zone -- escalate**: The MAC clause uses unfamiliar language and the agent's
confidence in its interpretation is 0.60. The interpretation affects termination
rights. Escalate with analysis and specific sources of uncertainty.

**Time-sensitive**: Opposing counsel requests a response on a representation
carve-out by 5 PM. The partner is unavailable until 6 PM. The carve-out is below
materiality and consistent with 3 prior deals. Accept, log precedent relied upon,
and notify the partner immediately after with full reasoning.
