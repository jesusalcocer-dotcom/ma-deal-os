---
skill_id: domain/purchase-price-mechanics
version: "1.0"
type: domain
applicable_agents: [specialist, manager]
applicable_tasks: [negotiation_strategy, closing_mechanics, financial_analysis]
depends_on: []
quality_score: 0.85
source: static
---

# Purchase Price Mechanics

## Purpose

Purchase price mechanics define how the economic value of a transaction is calculated, adjusted, and transferred between buyer and seller. In virtually every private M&A deal, the final purchase price is not a single fixed number agreed at signing. Instead, it is a dynamic figure subject to adjustment mechanisms that ensure the buyer receives the business in the financial condition contemplated at the time the deal was priced.

This skill covers the principal adjustment mechanisms -- working capital adjustments, earnout structures, escrow and holdback arrangements, and purchase price allocation under Section 1060 of the Internal Revenue Code. Mastery of these mechanics is essential for structuring, negotiating, and closing M&A transactions.

## Methodology

### Step 1: Establish the Working Capital Adjustment Framework

The working capital adjustment is the most common post-closing price adjustment mechanism. Its purpose is to ensure the target is delivered at closing with a "normal" level of operating liquidity, preventing the seller from stripping cash or delaying payables to inflate closing proceeds.

**Peg Determination**:
- The working capital peg (or target) represents the expected level of net working capital at closing
- Common methodologies: trailing 12-month average, trailing 6-month average, most recent month-end, or a negotiated fixed amount
- The peg should exclude seasonal distortions; use normalized averages where the business has significant seasonality
- Both parties should agree on the peg amount before or at signing; leaving it to be determined post-closing creates unnecessary disputes

**Net Working Capital Definition**:
- Standard definition: current assets minus current liabilities, with specified inclusions and exclusions
- Common exclusions from current assets: cash and cash equivalents (if dealt with separately), deferred tax assets, intercompany receivables, prepaid expenses beyond 12 months
- Common exclusions from current liabilities: current portion of long-term debt (treated as debt-like), deferred revenue (sometimes contested), accrued income taxes, intercompany payables
- The definition must be precise and attached as an exhibit to the purchase agreement with a sample calculation

**True-Up Process**:
- Seller prepares an estimated closing statement 2-5 business days before closing
- Purchase price at closing is adjusted based on estimated working capital vs. the peg
- Within 60-90 days post-closing, buyer prepares a final closing statement using actual figures
- Seller has 30-45 days to review and object
- Disputed items are resolved through an independent accounting firm (the "Accounting Arbitrator")
- The Accounting Arbitrator's determination is final, binding, and not subject to appeal
- Payment of any true-up adjustment is made within 5 business days of final determination

**Disputed Items and the Accounting Arbitrator**:
- The Accounting Arbitrator is typically a Big Four firm not engaged by either party
- Its scope is limited to disputed items only; agreed items are not subject to review
- The Arbitrator must resolve each disputed item within the range proposed by the parties (baseball arbitration for each line item)
- Costs are allocated based on which party's position is closer to the final determination
- The Accounting Arbitrator applies the same accounting principles and methodologies used to prepare the sample calculation

### Step 2: Structure Earnout Provisions

Earnouts bridge valuation gaps by making a portion of the purchase price contingent on post-closing financial or operational performance. They are inherently contentious and require precise drafting to be enforceable.

**Metric Selection**:
- Revenue-based earnouts: simpler to measure, harder for the buyer to manipulate, but do not account for profitability
- EBITDA-based earnouts: capture profitability but give the buyer significant control over expense allocation and accounting policy
- Gross margin earnouts: balance between revenue and EBITDA, but require clear COGS definition
- Non-financial milestones: product launches, regulatory approvals, customer retention; binary (achieved or not) rather than scaled
- Hybrid metrics: multiple metrics with weighted scoring; complex but comprehensive

**Accounting Methodology**:
- Specify GAAP consistently applied in accordance with the target's historical practices
- Prohibit the buyer from changing accounting policies, estimates, or methodologies during the earnout period if the change would reduce the earnout calculation
- Address specific items: treatment of intercompany charges, allocation of shared overhead, treatment of extraordinary or non-recurring items, buyer synergies (typically excluded)
- Include a sample calculation as an exhibit

**Buyer Obligations During the Earnout Period**:
- Covenant to operate the business in good faith and in the ordinary course consistent with past practice
- The implied covenant of good faith and fair dealing applies, but relying on it is insufficient; draft explicit operational covenants
- Common covenants: maintain adequate staffing, fund working capital needs, refrain from diverting customers or revenue, continue product development at agreed levels
- Address the right to combine or restructure the acquired business; if the buyer integrates the target such that standalone measurement becomes impossible, include an acceleration or deemed-achievement provision
- Provide seller access to books and records for earnout verification (with confidentiality restrictions)

**Dispute Resolution for Earnouts**:
- Independent accounting firm for financial metric disputes (same model as working capital)
- Separate arbitration or litigation for disputes over buyer compliance with operational covenants
- Acceleration provisions: if the buyer materially breaches its earnout-period obligations, the maximum earnout is deemed earned

### Step 3: Design Escrow Mechanics

Escrow arrangements provide a funded source of recovery for indemnification claims and purchase price adjustments.

**Release Schedule**:
- Match release dates to survival periods for the corresponding indemnification obligations
- Common structure: 50% release at 12 months, remainder at 18 months (matching general survival)
- Retention amount: the escrow agent retains funds sufficient to cover pending but unresolved claims (the "Pending Claims Reserve")
- Final release: upon resolution of all pending claims or expiration of all survival periods, whichever is later

**Claims Process**:
- Indemnifying party submits a written claim notice specifying the factual basis, applicable representation, and estimated loss amount
- Responding party has 30-45 days to object; if no objection, the claim is deemed accepted and paid from escrow
- Disputed claims remain in escrow pending resolution through the contractual dispute mechanism (arbitration or litigation)
- Joint instructions to the escrow agent are required for all disbursements; unilateral withdrawal is not permitted

**Escrow Agent Selection and Agreement**:
- Nationally recognized bank or trust company
- Standard escrow agreement (typically the agent's form with negotiated modifications)
- Agent liability limited to gross negligence or willful misconduct
- Agent fees paid by the buyer (market standard) or split equally
- Investment of escrowed funds: typically money market or short-term treasuries; interest allocable to the seller (as the beneficial owner) unless applied to claims

### Step 4: Address Holdback Mechanics

Holdbacks are functionally similar to escrows but the buyer retains the funds rather than depositing them with a third party.

- Simpler to administer; no escrow agent agreement or fees
- Creates credit risk for the seller: if the buyer becomes insolvent, the holdback funds are part of the buyer's general estate
- Seller may negotiate for a security interest in the holdback amount or require the buyer to maintain a minimum liquidity level
- Release mechanics mirror escrow release schedules
- More common in transactions under $50M

### Step 5: Purchase Price Allocation Under Section 1060

Section 1060 of the Internal Revenue Code requires the buyer and seller in an applicable asset acquisition to allocate the purchase price among the acquired assets using the residual method. The allocation has significant tax consequences for both parties.

**Asset Classes (Treasury Regulation 1.338-6)**:
- Class I: Cash and cash equivalents
- Class II: Actively traded personal property, certificates of deposit, foreign currency
- Class III: Accounts receivable, mortgages, credit card receivables
- Class IV: Inventory
- Class V: All other tangible and intangible assets not in Class VI or VII
- Class VI: Section 197 intangibles (other than goodwill and going concern value) -- customer lists, patents, covenants not to compete, licenses, franchises
- Class VII: Goodwill and going concern value (residual)

**Conflicting Interests**:
- Sellers prefer allocation to goodwill (capital gains rate) over allocation to inventory or depreciable assets (ordinary income recapture)
- Buyers prefer allocation to depreciable and amortizable assets (Class IV-VI) to maximize future tax deductions
- Covenant not to compete: ordinary income to the seller, amortizable by the buyer over 15 years
- The parties should negotiate the allocation at signing and include it as an exhibit; post-closing disputes are common if deferred

**Reporting Obligations**:
- Both parties file IRS Form 8594 (Asset Acquisition Statement) with their tax returns for the year of the transaction
- The forms must be consistent between buyer and seller; inconsistent filings invite IRS audit
- If the parties cannot agree on allocation, each files its own Form 8594 and discloses the disagreement

## Common Patterns

- **Cash-Free, Debt-Free with Working Capital Adjustment**: The most common pricing construct in private M&A. The purchase price assumes zero cash and zero funded debt at closing. Actual cash is retained by (or distributed to) the seller pre-closing, and all funded debt is repaid at closing from the purchase price. Working capital is adjusted to the peg. This isolates the enterprise value negotiation from the capital structure.
- **Locked-Box Mechanism**: An alternative to the traditional closing accounts approach. The purchase price is fixed based on a balance sheet at a specified date (the "locked-box date") prior to signing. No post-closing adjustment. The seller provides a covenant against value leakage between the locked-box date and closing. Common in European deals and increasingly seen in US transactions.
- **Earnout as Valuation Bridge**: When the seller's price expectation exceeds the buyer's, a 2-3 year earnout bridging 15-30% of the gap is a common solution. The earnout should have clearly defined financial metrics, a sample calculation, and a guaranteed minimum floor in exchange for the seller accepting contingency.

## Common Mistakes to Avoid

1. **Failing to attach a sample working capital calculation** to the purchase agreement. Without a sample, the parties will inevitably disagree on the methodology for calculating each line item.
2. **Using an inappropriate peg period** that does not reflect normalized operations. A 3-month average during a seasonal peak will result in a peg that the seller cannot replicate at a non-peak closing.
3. **Drafting earnout provisions without explicit buyer operational covenants**. The implied covenant of good faith provides some protection, but courts vary widely in how they apply it. Explicit covenants are far more enforceable.
4. **Neglecting to address the buyer's right to set off indemnification claims against earnout payments**. Without a clear provision, the buyer may withhold earnout payments citing pending indemnification claims, creating significant seller liquidity risk.
5. **Deferring the purchase price allocation negotiation to post-closing**. The parties have maximum leverage to negotiate a mutually acceptable allocation before signing. Post-closing, the incentives diverge completely, and disputes are common.
6. **Ignoring the tax impact of purchase price adjustments** on the original allocation. Working capital true-ups and earnout payments must be properly characterized for tax purposes and may require amendment to the original Form 8594.

## Examples

**Example 1 -- Working Capital Adjustment**
Enterprise value: $50M. Net working capital peg: $4.2M (trailing 12-month average). Estimated closing NWC: $4.5M. Closing payment: $50M + $300K = $50.3M. Post-closing final NWC: $4.1M. True-up: seller owes buyer $200K ($4.1M - $4.2M = -$100K; vs. $300K overpayment at close = $200K net owed to buyer after correcting for the estimate).

**Example 2 -- Earnout Structure**
Purchase price: $30M at closing plus up to $10M in earnout. Metric: trailing 12-month revenue measured at Year 1 and Year 2 anniversaries. Year 1: if revenue >= $25M, $5M earnout payment. Year 2: if cumulative two-year revenue >= $55M, $5M earnout payment. Acceleration: if buyer materially breaches operational covenants, remaining unpaid earnout is deemed earned at maximum.

**Example 3 -- Section 1060 Allocation**
Total purchase price: $20M. Allocation: Inventory $2M (Class IV), Equipment $3M (Class V), Customer relationships $4M (Class VI, 15-year amortization), Non-compete $1M (Class VI, 5-year term but 15-year amortization), Goodwill $10M (Class VII, 15-year amortization). Seller negotiated to minimize inventory allocation (ordinary income recapture) and maximize goodwill (capital gains).
