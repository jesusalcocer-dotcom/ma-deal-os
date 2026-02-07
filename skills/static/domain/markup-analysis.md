---
skill_id: domain/markup-analysis
version: "1.0"
type: domain
applicable_agents: [specialist]
applicable_tasks: [markup_analysis, document_review]
depends_on: [domain/provision-drafting]
quality_score: 0.80
source: static
---

# Markup Analysis

## Purpose

Markup analysis is the disciplined process of reviewing counterparty redlines to a transaction document, classifying each change by type and severity, assessing its commercial and legal impact, and formulating a recommended response. In M&A transactions, the markup exchange is the primary mechanism through which parties negotiate the allocation of risk. A rigorous, provision-by-provision analysis ensures that no change is overlooked and that the deal team can prioritize negotiation efforts on the changes that matter most.

This skill governs how agents should process incoming markups to Stock Purchase Agreements (SPAs), Asset Purchase Agreements (APAs), merger agreements, and ancillary documents such as disclosure schedules, transition services agreements, and escrow agreements.

## Methodology

### Step 1: Structural Comparison and Change Extraction

Before analyzing substance, perform a structural comparison between the sent draft and the returned markup. Identify every change, including:

- Textual additions (new language inserted by counterparty)
- Textual deletions (language removed from the prior draft)
- Moved provisions (sections relocated without substantive change)
- Formatting-only changes (numbering, cross-reference updates, defined term capitalization)
- Comment boxes and margin notes (counterparty attorney commentary)

Normalize the comparison by stripping formatting-only changes to isolate substantive edits. Flag any structural reorganization (e.g., splitting a single representation into multiple sub-sections, or consolidating carve-outs) as these often mask substantive shifts in risk allocation.

### Step 2: Change Classification

Classify each substantive change into one of the following categories:

**Variant Change** — The counterparty has replaced one formulation of a provision with a materially different formulation. Example: changing a flat indemnification cap to a tiered cap structure, or replacing a "to the knowledge of the Company" qualifier with an unqualified representation.

**Threshold Change** — A numeric or quantitative parameter has been altered. Example: increasing the basket from 0.5% to 1.0% of enterprise value, extending the survival period from 18 months to 24 months, or changing a materiality scrape from a double-materiality to single-materiality formulation.

**Language Refinement** — Wording has been adjusted without changing the commercial substance. Example: replacing "shall use commercially reasonable efforts" with "shall use reasonable best efforts" in a covenant, or adding "in all material respects" as a qualifier.

**Addition** — Entirely new language has been introduced that was not present in any form in the prior draft. Example: adding a new interim operating covenant restricting capital expenditures above a threshold, or inserting a new condition to closing.

**Deletion** — Language has been removed entirely. Example: striking a bring-down condition, removing a specific indemnity, or deleting a termination right.

### Step 3: Severity Assessment

Assign each change a severity level based on its potential impact on the client's risk position:

- **Critical** — Changes that fundamentally alter the economic deal, shift major risk categories, or could result in material financial exposure. Examples: removal of a fundamental representations carve-out from the cap, elimination of a termination fee, deletion of a closing condition.
- **High** — Changes that meaningfully affect risk allocation but do not alter the fundamental deal structure. Examples: tightening knowledge qualifiers, expanding indemnification baskets, shortening survival periods.
- **Medium** — Changes that affect specific provisions but have limited overall deal impact. Examples: adding a materiality qualifier to a mid-tier representation, adjusting a de minimis threshold.
- **Low** — Technical, clarifying, or cosmetic changes with no material risk impact. Examples: cross-reference corrections, defined term consistency fixes, grammar edits.

### Step 4: Favorability Scoring

Score each change on a scale from -3 (strongly buyer-unfavorable) to +3 (strongly buyer-favorable), with 0 representing neutral or balanced changes. The scoring framework:

- **-3**: Eliminates a significant buyer protection or creates substantial uncapped exposure
- **-2**: Materially weakens a buyer protection or shifts meaningful risk to buyer
- **-1**: Modestly disadvantages buyer but within market range
- **0**: Neutral, balanced, or purely technical
- **+1**: Modestly improves buyer position
- **+2**: Materially strengthens a buyer protection
- **+3**: Provides extraordinary buyer protection beyond market norms

When scoring, always reference the applicable market standard for the deal type (private target, public target, sponsor-backed, cross-border) and the deal size bracket.

### Step 5: Response Recommendation

For each classified and scored change, generate a response recommendation:

- **Accept** — The change is neutral, market-standard, or immaterial. Accepting it preserves goodwill without sacrificing protection.
- **Accept with Modification** — The direction of the change is acceptable but the specific formulation needs adjustment. Specify the modification.
- **Reject** — The change is unacceptable and should be struck in the return markup. Provide the rationale.
- **Counter** — The change raises a legitimate concern but the proposed solution is not acceptable. Propose an alternative formulation that addresses the counterparty's likely concern while preserving the client's position.
- **Flag for Discussion** — The change involves a business point that requires client instruction before a legal response can be formulated.

## Common Patterns

When analyzing markups from seller's counsel in private M&A transactions, expect the following common patterns:

1. **Knowledge qualification creep** — Seller's counsel will attempt to add "to the knowledge of Seller" qualifiers to representations that were drafted as unqualified statements of fact. This is particularly common in IP representations, contract representations, and compliance representations.

2. **Materiality qualifier stacking** — Adding "material" or "Material Adverse Effect" qualifiers to representations that already have built-in materiality through dollar thresholds or other limiting language. Watch for double-materiality issues in the indemnification article where a materiality scrape may be needed.

3. **Carve-out expansion** — Seller's counsel will seek to expand the list of carve-outs from the definition of Material Adverse Effect, the interim operating covenants, and the non-compete provisions. Each carve-out should be evaluated independently.

4. **Survival period compression** — Reducing the period during which indemnification claims can be brought, particularly for non-fundamental representations. Market ranges vary by deal size but typically fall between 12-24 months for general representations.

5. **Basket and cap manipulation** — Adjusting the deductible/tipping basket threshold upward and the indemnification cap downward. Evaluate these in tandem as they form an integrated risk allocation framework.

6. **Closing condition softening** — Changing "all" to "substantially all" in bring-down conditions, or adding a "would not reasonably be expected to have a Material Adverse Effect" qualifier to the accuracy bring-down.

## Common Mistakes to Avoid

1. **Reviewing changes in isolation** — Each markup change must be evaluated in the context of the entire agreement. A concession on basket size may be acceptable if paired with a longer survival period. Always assess the integrated risk allocation.

2. **Ignoring deletions** — Deleted language is often more significant than added language. A provision that is silently struck may represent the most important change in the markup.

3. **Treating all knowledge qualifiers equally** — "Actual knowledge" is far narrower than "constructive knowledge" or "knowledge after reasonable inquiry." The scope of the knowledge group and the inquiry standard matter significantly.

4. **Failing to check cross-references** — A change to a defined term in Article I can cascade throughout the agreement. Always trace the impact of definitional changes across all articles.

5. **Overlooking disclosure schedule interplay** — Changes to representations often require corresponding updates to disclosure schedules. Flag any representation change that could affect schedule adequacy.

## Examples

**Example 1: Variant Change (Critical, -3)**
Counterparty changed the indemnification cap from "100% of the Purchase Price" for fundamental representations to "50% of the Purchase Price." This eliminates half of the buyer's recovery for the most significant categories of loss. Recommendation: Reject. Fundamental representations should be uncapped or capped at 100% of purchase price.

**Example 2: Threshold Change (High, -2)**
Counterparty increased the indemnification basket from 0.75% to 1.5% of enterprise value. For a $200M deal, this shifts the first $1.5M of losses entirely to the buyer. Recommendation: Counter at 1.0% with a tipping basket structure rather than a true deductible.

**Example 3: Language Refinement (Medium, -1)**
Counterparty changed "commercially reasonable efforts" to "reasonable efforts" in the regulatory approval covenant. While the distinction is debated, "reasonable efforts" is generally viewed as a lower standard. Recommendation: Accept with modification — use "commercially reasonable efforts" as the market standard for private M&A.

**Example 4: Addition (High, -2)**
Counterparty inserted a new Section 5.18 restricting the buyer from making any capital expenditures exceeding $100,000 individually or $500,000 in the aggregate during the interim period without seller's prior written consent. This covenant was not present in the initial draft and materially constrains buyer's ability to operate the business post-signing. Recommendation: Counter with a higher threshold ($500,000 individual / $2,000,000 aggregate) consistent with the target's historical capex run-rate, and add "such consent not to be unreasonably withheld, conditioned, or delayed."

**Example 5: Deletion (Critical, -3)**
Counterparty deleted the specific indemnity provision (Section 8.2(d)) covering known environmental remediation obligations at the target's manufacturing facility. The environmental DD identified $3-5M in estimated remediation costs. Removing the specific indemnity would force these known costs through the general indemnification framework, subject to the basket and cap. Recommendation: Reject. Known environmental liabilities should be covered by a specific indemnity outside the basket and cap structure.
