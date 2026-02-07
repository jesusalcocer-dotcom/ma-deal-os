---
skill_id: domain/provision-drafting
version: "1.0"
type: domain
applicable_agents: [specialist]
applicable_tasks: [document_drafting, provision_review]
depends_on: []
quality_score: 0.85
source: static
---

# Provision Drafting

## Purpose

Provision drafting is the foundational skill for generating, reviewing, and refining the individual clauses that compose M&A transaction documents. Each provision in a Stock Purchase Agreement, Asset Purchase Agreement, or merger agreement serves a specific risk allocation function. Drafting quality directly affects enforceability, clarity of obligation, and the efficiency of subsequent negotiation rounds.

This skill establishes the conventions, standards, and best practices that agents must follow when drafting or reviewing provisions for any transaction document in the M&A Deal OS system. It covers cross-reference integrity, defined term consistency, qualifier usage, carve-out construction, and the mechanical provisions that govern indemnification economics.

## Methodology

### Step 1: Cross-Reference Management

Every provision must maintain accurate internal cross-references. When drafting or modifying a provision:

- Use section numbers rather than page numbers for all internal references (e.g., "as set forth in Section 3.14(a)" not "as described above").
- When a provision references a defined term, verify that the defined term exists in Article I (Definitions) or in the section where it is first used with a parenthetical definition.
- Track forward references carefully. If a representation references an exception "as set forth in Section 5.2(b)(iii)," confirm that Section 5.2(b)(iii) exists and contains the relevant exception.
- When provisions are reorganized (sections added, deleted, or renumbered), perform a full cross-reference audit across the entire agreement. A single broken cross-reference can create ambiguity that undermines enforceability.
- Use a cross-reference table during drafting to map every internal reference to its target section. Update this table whenever sections are modified.

### Step 2: Defined Term Consistency

Defined terms are the backbone of contract precision. Follow these rules:

- Every capitalized term must be defined exactly once, either in the definitions article or with a parenthetical definition at first use.
- Use the exact defined term throughout the agreement. Do not alternate between "Material Adverse Effect" and "Material Adverse Change" or between "Purchaser" and "Buyer" unless these are separately defined terms with distinct meanings.
- When a defined term incorporates a threshold (e.g., "Material Contract" means any contract with annual payments exceeding $250,000), ensure the threshold is appropriate for the target's size and industry.
- Defined terms that appear in disclosure schedules must match the agreement exactly. A schedule referencing "Significant Contracts" when the agreement defines "Material Contracts" creates an ambiguity that counsel will exploit.
- Avoid circular definitions. "Knowledge" should not be defined by reference to another defined term that itself references "Knowledge."
- When drafting a new defined term, check whether an existing defined term already covers the concept. Redundant definitions create interpretation disputes.

### Step 3: Qualifier Handling

Qualifiers control the scope and bite of representations, warranties, and covenants. The three primary qualifiers in M&A practice are:

**Knowledge Qualifiers:**
- "To the knowledge of the Company" limits a representation to facts actually known (or constructively known) by specified individuals.
- Always define "knowledge" in the definitions article. Specify whether it means actual knowledge only, or includes constructive knowledge (facts that would be known after reasonable inquiry).
- Define the "knowledge group" — the specific individuals whose knowledge is attributed to the Company. Typically includes C-suite officers, division heads, and key operational personnel.
- Buyer's counsel should resist knowledge qualifiers on representations concerning objective facts (e.g., "The Company is duly organized" should never be knowledge-qualified).
- Seller's counsel should seek knowledge qualifiers on representations that require subjective assessment or that cover areas outside management's direct oversight.

**Materiality Qualifiers:**
- "Material" and "Material Adverse Effect" (MAE) qualifiers limit the scope of a representation to matters that cross a significance threshold.
- Be precise about which materiality standard applies. A representation qualified by "in all material respects" is different from one qualified by "except as would not reasonably be expected to have a Material Adverse Effect."
- Watch for double-materiality problems: if a representation is qualified by materiality and the indemnification article uses a materiality scrape (reading representations without materiality qualifiers for purposes of determining loss), the interplay must be deliberate.
- Draft MAE definitions with care. The standard Delaware formulation excludes changes in general economic conditions, industry conditions, law changes, and acts of God, unless they disproportionately affect the target relative to peers.

**Temporal Qualifiers:**
- "As of the date hereof" limits a representation to the signing date.
- "As of the Closing Date" extends the representation to closing.
- Bring-down conditions typically require representations to be true "as of the date hereof and as of the Closing Date as though made on and as of such date," with exceptions for representations that by their terms speak as of a specific earlier date.

### Step 4: Carve-Out Drafting

Carve-outs create exceptions to general rules and must be drafted with precision:

- Each carve-out should be self-contained and unambiguous. A reader should understand the scope of the exception without needing to interpret undefined terms.
- Number carve-outs as sub-clauses (i), (ii), (iii) for clarity and ease of reference in negotiation.
- Use parallel grammatical structure across carve-outs in the same provision. If carve-out (i) begins with a gerund ("relating to"), all subsequent carve-outs should follow the same structure.
- Distinguish between carve-outs that are absolute exceptions and those that are qualified exceptions. "Other than Permitted Liens" is absolute; "other than liens that do not materially impair the use of the affected property" is qualified and requires judgment.
- In MAE definitions, the standard carve-outs (general economic conditions, industry changes, law changes, pandemic effects) should each include the "disproportionate impact" exception — these carve-outs do not apply to the extent the relevant change disproportionately affects the target compared to similarly situated companies.

### Step 5: Basket, Cap, and Survival Mechanics

The indemnification article's economic provisions form an integrated framework. Draft these provisions as a coordinated system:

**Baskets:**
- A "deductible" basket means the indemnifying party is only liable for losses exceeding the basket amount, and then only for the excess. The indemnified party absorbs the first dollar of loss up to the basket.
- A "tipping" (or "first dollar") basket means that once aggregate losses exceed the basket amount, the indemnifying party is liable for all losses from the first dollar, not just the excess.
- Hybrid structures are common: a deductible basket for general representations and a tipping basket for fundamental representations.
- Market basket sizes for private M&A typically range from 0.5% to 1.5% of enterprise value, varying by deal size and sector.

**Caps:**
- The general indemnification cap for non-fundamental representations typically ranges from 10% to 20% of the purchase price.
- Fundamental representations (organization, authority, capitalization, title, tax, brokers) are often subject to a higher cap (frequently 100% of the purchase price) or are uncapped.
- Special indemnities for known issues are typically uncapped or subject to a deal-specific cap.
- Draft cap provisions to specify clearly whether the cap applies per-claim or in the aggregate, and whether it includes or excludes amounts recovered under the basket.

**Survival Periods:**
- General representations typically survive for 12 to 24 months post-closing.
- Fundamental representations survive for 36 to 72 months, or until the expiration of the applicable statute of limitations plus 60 days.
- Tax representations survive until 60 days after the expiration of the applicable statute of limitations (including extensions).
- Covenants survive until fully performed, or for a specified period if performance is ongoing.
- Draft survival provisions to state clearly that claims brought before expiration of the survival period are preserved even if resolved after expiration.

## Common Patterns

1. **Representation and Warranty Structure** — Representations are typically organized by subject matter (organization, authority, capitalization, financial statements, absence of changes, material contracts, tax, employees, IP, environmental, litigation, compliance). Each representation section should follow a consistent internal structure: general statement, specific sub-representations, schedule references, and qualifiers.

2. **Covenant Hierarchy** — Interim operating covenants (between signing and closing) follow a standard pattern: "The Company shall, and shall cause its Subsidiaries to, conduct the Business in the ordinary course of business consistent with past practice" followed by specific affirmative and negative covenants. Negative covenants use "shall not, without the prior written consent of Purchaser (such consent not to be unreasonably withheld, conditioned, or delayed)" as the standard formulation.

3. **Conditions Precedent** — Closing conditions are drafted as a checklist of requirements that must be satisfied or waived. Standard conditions include accuracy of representations (subject to bring-down standard), performance of covenants, no MAE, regulatory approvals, third-party consents, and delivery of ancillary documents.

## Common Mistakes to Avoid

1. **Inconsistent defined terms** — Using "Company Material Adverse Effect" in one section and "Material Adverse Effect" in another when only one is defined. Always run a defined-term audit before finalizing any draft.

2. **Orphaned cross-references** — Referring to "Section 6.2(c)" when Section 6.2 only has subsections (a) and (b). This occurs most frequently after sections are reorganized.

3. **Ambiguous antecedents** — "Such party shall deliver the documents referenced therein" — which party? Which documents? Which section is "therein"? Repeat the defined term and section number for clarity.

4. **Qualifier creep without tracking** — Adding materiality qualifiers during drafting without updating the materiality scrape analysis. Every qualifier added to a representation must be evaluated against the indemnification article's scrape provisions.

5. **Survival/claims interaction gap** — Drafting survival periods without addressing whether a timely-noticed claim survives beyond the survival period for resolution. This gap creates disputes about whether an indemnification claim noticed on month 23 of a 24-month survival period can be litigated in month 36.

## Examples

**Example 1: Well-Drafted Knowledge-Qualified Representation**
"To the Knowledge of the Company, as of the date hereof, no third party is infringing, misappropriating, or otherwise violating any Company Intellectual Property in any material respect."
This provision correctly uses (a) a defined knowledge qualifier, (b) a temporal anchor, (c) specific IP violation categories, and (d) a materiality qualifier.

**Example 2: Properly Structured Basket Provision**
"The Indemnifying Party shall not be liable for any Losses pursuant to Section 8.2(a) unless and until the aggregate amount of all such Losses exceeds $1,500,000 (the 'Basket Amount'), in which event the Indemnified Party shall be entitled to indemnification for the amount of such Losses in excess of the Basket Amount; provided, that the foregoing limitation shall not apply to any Losses arising out of or relating to any breach of any Fundamental Representation."
This provision clearly establishes a deductible basket with a fundamental-representations carve-out.

**Example 3: MAE Carve-Out with Disproportionate Impact Exception**
"...except to the extent that such changes, events, or conditions referred to in clauses (i) through (vi) above have a disproportionate adverse effect on the Company and its Subsidiaries, taken as a whole, relative to other participants in the industries in which the Company and its Subsidiaries operate."
This is the standard disproportionate-impact exception that claws back the MAE carve-outs when the target is hit harder than its peers.
