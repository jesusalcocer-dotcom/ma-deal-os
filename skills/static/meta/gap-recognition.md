---
skill_id: meta/gap-recognition
version: 1.0
type: meta
applicable_agents: [manager, specialist]
applicable_tasks: [analysis, skill_management]
depends_on: [meta/problem-decomposition]
quality_score: 0.75
source: static
---

# Gap Recognition

## Purpose

An agent that does not know what it does not know is dangerous. In M&A advisory,
incomplete analysis presented with false confidence can lead to missed risks,
flawed deal terms, and malpractice exposure. This skill provides a systematic
method for detecting when an agent's current capabilities, knowledge, or available
information are insufficient to produce a reliable output. Recognizing gaps early
enables timely escalation, dynamic skill creation, or specialist delegation rather
than producing unreliable work product.

## Framework

### Step 1: Define What Is Needed (X)

Before any analysis begins, explicitly state the required output and the quality
standard it must meet. Use the problem decomposition skill to identify all the
sub-questions that must be answered. For each sub-question, specify:

- What type of knowledge is required (statutory, case law, market practice,
  deal-specific facts, quantitative analysis)
- What confidence level the output must achieve (per the confidence calibration
  skill) to be actionable
- What format the output must take (recommendation, risk assessment, draft
  language, numerical estimate)

This defines X -- the full capability envelope required for the task.

### Step 2: Inventory What Is Available (Y)

Assess the agent's current resources against each element of X:

- **Knowledge base**: Does the agent have relevant skills, precedent data, or
  legal research that directly addresses the sub-question?
- **Deal context**: Has sufficient deal-specific information been provided
  (documents, directives, prior analysis) to support the analysis?
- **Analytical tools**: Does the agent have the computational or reasoning
  capabilities needed (e.g., financial modeling, statistical analysis,
  multi-jurisdictional legal comparison)?
- **Authority**: Is the agent authorized to perform this analysis, or does it
  require delegation or escalation?

Be honest and specific. Vague claims of capability ("I can probably figure this
out") are not acceptable. Either the resource exists and can be identified, or it
is absent.

### Step 3: Calculate the Gap (X - Y)

For each sub-question, compare what is needed against what is available. Classify
each gap:

| Gap Type | Description | Resolution Path |
|----------|-------------|-----------------|
| **Knowledge gap** | The agent lacks domain expertise on a specific legal topic, industry, or jurisdiction | Request dynamic skill creation or specialist delegation |
| **Information gap** | The required facts or documents are not available to the agent | Request the missing information from the partner or deal team |
| **Capability gap** | The analysis requires tools or methods the agent does not possess | Delegate to a specialist agent or external tool |
| **Authority gap** | The agent can perform the analysis but is not authorized to act on it | Escalate per the escalation-judgment skill |
| **Confidence gap** | The agent can produce output but cannot achieve the required confidence level | Flag the output as preliminary and escalate for review |

### Step 4: Trigger the Appropriate Resolution

Each gap type has a distinct resolution mechanism:

- **Knowledge gap**: Invoke the skill-scoping skill to define what a new dynamic
  skill would need to cover. If the gap is narrow and well-defined, request
  dynamic skill creation. If broad, escalate to the partner.
- **Information gap**: Generate a specific, actionable information request. State
  exactly what document, data point, or clarification is needed and why.
- **Capability gap**: Identify which specialist agent or external tool can fill
  the gap. Formulate a delegation request with clear inputs and expected outputs.
- **Authority gap**: Package the analysis per the escalation-judgment skill and
  route to the appropriate decision-maker.
- **Confidence gap**: Complete the analysis at the best achievable confidence
  level, clearly label it as preliminary, and specify what additional information
  or analysis would be needed to raise confidence to the required threshold.

### Step 5: Prevent Silent Gaps

The most dangerous gaps are the ones the agent does not recognize. Implement
these safeguards:

- **Pre-analysis checklist**: Before producing output, verify that every sub-
  question from the decomposition has been addressed. Unaddressed sub-questions
  are gaps by definition.
- **Confidence floor check**: If the overall confidence score is below the
  threshold required by the task, a gap exists even if the agent cannot pinpoint
  exactly what is missing.
- **Novelty detection**: If the current question does not match any pattern the
  agent has seen before, flag it as potentially novel and apply heightened
  scrutiny to the analysis.

## Application Guidelines

- Run gap recognition at the START of every significant task, not just when
  problems are encountered mid-analysis.
- Document all identified gaps and their resolution status in the task log.
- When multiple gaps exist, prioritize resolution of gaps that block other
  analysis steps (use the dependency map from problem decomposition).
- A gap that is recognized, documented, and flagged is far less risky than a
  gap that is unrecognized. Reward thoroughness in gap identification.

## Common Mistakes to Avoid

- **Overestimating capabilities**: Assuming familiarity with a topic equals
  competence. Having seen similar provisions is not the same as having analyzed
  the specific legal question.
- **Ignoring information gaps**: Proceeding with analysis based on assumptions
  about missing facts rather than requesting the actual information.
- **Gap denial**: Recognizing a gap internally but not reporting it because
  the agent wants to appear capable. This is the single most dangerous failure
  mode.
- **Treating all gaps equally**: A knowledge gap on a material term is far
  more critical than a formatting capability gap. Prioritize by impact.
- **Waiting too long to flag**: Discovering a gap halfway through a complex
  analysis and continuing anyway, hoping to work around it, rather than
  flagging immediately.

## Examples

**Knowledge gap identified**: The deal involves a target with operations in
Brazil. The agent has strong skills in Delaware and New York M&A law but no
specific knowledge of Brazilian corporate law requirements for share transfers.
Gap: jurisdiction-specific legal knowledge. Resolution: request dynamic skill
creation for Brazilian M&A transfer requirements, or escalate to partner for
specialist referral.

**Information gap identified**: The purchase price adjustment mechanism references
"Net Working Capital as defined in Schedule 2.3," but Schedule 2.3 has not been
provided to the agent. Gap: deal-specific factual information. Resolution: request
the specific document from the deal team with an explanation of why it is needed.

**Confidence gap identified**: The agent can analyze the non-solicitation provision
but achieves only 0.55 confidence because the governing law (Georgia) has limited
and conflicting case law on the enforceability of 3-year non-solicitation periods.
Gap: confidence below the 0.70 threshold required for recommendations. Resolution:
present the analysis as preliminary with both possible interpretations and escalate
for partner judgment.
