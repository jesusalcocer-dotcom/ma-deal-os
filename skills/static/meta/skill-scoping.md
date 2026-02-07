---
skill_id: meta/skill-scoping
version: 1.0
type: meta
applicable_agents: [manager]
applicable_tasks: [skill_management, planning]
depends_on: [meta/gap-recognition]
quality_score: 0.75
source: static
---

# Skill Scoping

## Purpose

When gap-recognition identifies a knowledge or capability gap, the system may need
to create a new dynamic skill. However, poorly scoped skills are worse than no skill
at all -- they create false confidence by appearing to cover a topic while providing
incomplete guidance. This skill defines how to precisely scope what a new skill must
cover, ensuring dynamically created skills are focused, testable, and fit for purpose.

## Framework

### Step 1: Define the Triggering Gap

Start from the gap-recognition output. State explicitly:

- What task or analysis exposed the gap
- What specific knowledge, methodology, or capability is missing
- What confidence level the gap prevents the agent from achieving
- Whether this is a one-time need or a recurring pattern

Skills should only be created for recurring patterns or gaps affecting multiple deal
tasks. One-time gaps are better resolved through escalation or specialist delegation.

### Step 2: Specify Inputs and Outputs

Every skill must have clearly defined boundaries:

**Required inputs:**
- What information must be provided for the skill to be usable
- What document types, data formats, or deal parameters are prerequisites
- What other skills must have been applied first (dependency chain)

**Expected outputs:**
- What the skill produces (analysis, draft language, risk score, recommendation)
- What format the output takes and what confidence level it should achieve
- What the output does NOT cover (explicit exclusions prevent scope creep)

### Step 3: Define the Methodology Steps

Outline the analytical procedure the skill will encode. Each step should be:

- **Specific**: Not "analyze the provision" but "compare the provision's triggers
  against the ABA model clause and identify additions and deletions."
- **Ordered**: Steps follow a logical sequence building on prior output.
- **Decidable**: Clear criteria for completion and acceptable results.

Aim for 4-8 methodology steps. Fewer suggests the skill is too simple for formal
creation. More suggests it should be split into focused sub-skills.

### Step 4: Provide Example Scenarios

Include 2-3 concrete scenarios the skill must handle correctly. Each should include:
- A realistic input scenario drawn from M&A practice
- The expected analytical process and which methodology steps apply
- The expected output including confidence level
- At least one edge case that tests the skill's boundaries

These validate scope during creation and provide test cases for quality assurance.

### Step 5: Establish Quality Criteria

Define measurement standards:

- **Accuracy threshold**: Percentage of test cases handled correctly (85%+ for
  legal analysis skills).
- **Confidence calibration**: A skill reporting 0.80 confidence should be correct
  at least 80% of the time.
- **Completeness**: All aspects of defined scope must be addressed.
- **Consistency**: Same inputs should produce materially the same outputs.

### Step 6: Define Validation Requirements

Specify testing before deployment:

- **Peer review**: Another agent reviews the definition for logical soundness.
- **Test case execution**: Example scenarios are run and outputs verified.
- **Edge case testing**: At least one out-of-scope scenario tested to verify the
  skill correctly identifies it as out of scope.
- **Partner validation**: First real-world application flagged for partner review.

## Application Guidelines

- Keep skills focused. "M&A Due Diligence" is too broad. "Environmental Liability
  Assessment for Manufacturing Targets" is appropriately scoped.
- Skill definitions should be readable by a junior associate.
- Version skills rather than silently modifying them to preserve audit trails.
- Set initial quality_score of 0.70 for new dynamic skills, adjusting based on
  partner feedback and outcome tracking.

## Common Mistakes to Avoid

- **Scope creep**: Starting focused and expanding to cover "everything related to"
  the topic. Resist comprehensiveness at the expense of precision.
- **Omitting exclusions**: Every skill needs an explicit "Out of Scope" section.
- **Copying generic frameworks**: The value of a skill is specialized methodology,
  not restating general analytical principles.
- **Skipping validation**: Untested skills are untrustworthy skills.
- **Creating skills for one-time problems**: If the gap will not recur, escalation
  is more efficient than skill creation.

## Examples

**Well-scoped**: "Create a skill for analyzing change-of-control provisions in
commercial leases. Inputs: lease text, target entity structure. Outputs: risk
assessment (trigger analysis, consequences, mitigation options). Methodology:
identify trigger language, map acquisition structure against triggers, assess
landlord consent requirements, evaluate cure options. Confidence: 0.80 for common
structures, 0.60 for unusual structures with escalation."

**Poorly-scoped**: "Create a skill for real estate due diligence." Too broad --
encompasses environmental, zoning, title, lease, property condition, and valuation,
each requiring different expertise and methodology.

**Decision NOT to create**: The agent encounters Bermuda reinsurance regulations
for the first time. Highly specialized and unlikely to recur. Resolution: escalate
for specialist referral rather than creating an unvalidatable skill.
