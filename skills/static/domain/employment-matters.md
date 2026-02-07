---
skill_id: domain/employment-matters
version: "1.0"
type: domain
applicable_agents: [specialist]
applicable_tasks: [dd_analysis, document_drafting]
depends_on: [domain/dd-methodology]
quality_score: 0.75
source: static
---

# Employment Matters in M&A Transactions

## Purpose

Employment-related issues pervade every M&A transaction. Whether structured as a stock purchase, asset purchase, or merger, the transaction will affect the target's workforce and give rise to a complex web of legal obligations under federal and state employment law, ERISA, the Internal Revenue Code, and individual employment agreements. Failure to properly analyze and address employment matters can result in significant post-closing liabilities, loss of key talent, and operational disruption.

This skill provides the framework for conducting employment-related due diligence, structuring key employee retention arrangements, analyzing restrictive covenant enforceability, managing WARN Act obligations, and addressing benefit plan continuation and equity treatment in the transaction context.

## Methodology

### Step 1: Conduct Employment Due Diligence

Assemble a complete picture of the target's workforce and employment-related obligations:

**Workforce Composition Analysis**:
- Total headcount by location, classification (exempt vs. non-exempt, full-time vs. part-time, employee vs. independent contractor), and function
- Independent contractor classification risk assessment: apply the IRS 20-factor test and applicable state tests (ABC test in California and other states adopting the Dynamex standard)
- Identify any joint employer or co-employment arrangements (PEOs, staffing agencies)
- Review organizational chart and reporting structures
- Assess any unionized workforce: collective bargaining agreements, pending grievances, organizing activity, successorship obligations under NLRA

**Individual Employment Agreement Review**:
- Catalog all written employment agreements, offer letters, and side agreements
- Identify provisions triggered by the transaction: change-in-control payments, severance obligations, acceleration of equity, enhanced benefits
- Quantify the aggregate cost of change-in-control obligations (the "deal tax")
- Flag any agreements with non-standard terms: guaranteed employment periods, special bonus arrangements, retention payments, supplemental retirement benefits
- Review arbitration clauses, forum selection, and governing law provisions

**Compensation and Benefits Overview**:
- Base salary and bonus structure for all employees (or by tier for large workforces)
- Commission plans and their treatment post-closing
- Equity compensation plans: stock options, restricted stock, RSUs, phantom equity, profits interests
- Deferred compensation arrangements subject to Section 409A
- Benefit plans: health, dental, vision, life insurance, disability, retirement (401(k), pension, profit sharing)
- Perquisites: car allowances, housing, club memberships, tuition reimbursement

**Pending Employment Litigation and Claims**:
- Active lawsuits: wrongful termination, discrimination (Title VII, ADA, ADEA), harassment, wage and hour (FLSA and state law), ERISA claims
- Administrative charges: EEOC, state human rights agencies, DOL investigations
- Internal complaints: HR records of grievances, internal investigations, whistleblower reports
- Workers' compensation claims and experience modification rates

### Step 2: Structure Key Employee Retention Agreements

Retaining critical talent through closing and the integration period is often essential to preserving the value of the acquisition.

**Identification of Key Employees**:
- Revenue-generating roles: top sales performers, key account managers
- Knowledge-critical roles: lead engineers, product architects, trade secret holders
- Relationship-critical roles: customer-facing executives, vendor relationship managers
- Operational-critical roles: plant managers, IT administrators, compliance officers
- Use a tiered approach: Tier 1 (must retain -- transaction fails without them), Tier 2 (strongly preferred), Tier 3 (desirable)

**Retention Agreement Components**:
- Cash retention bonus: typically 25-100% of annual base salary, paid in installments (50% at closing, 50% at 6 or 12 months)
- Continued employment requirement: forfeiture if the employee voluntarily resigns or is terminated for cause before the vesting date
- "Good reason" protection: if the buyer materially changes the employee's role, compensation, or location, the employee can resign and still receive the retention payment
- Non-compete and non-solicitation provisions: tie new restrictive covenants to the retention payment as additional consideration
- Section 280G analysis: for C-corporation targets, retention payments combined with other change-in-control payments may trigger the parachute payment excise tax; model the aggregate payments against the safe harbor threshold (3x base amount)

**Timing Considerations**:
- Pre-signing retention agreements signal deal certainty to key employees but risk leaks
- Signing-to-closing retention agreements are more common; executed simultaneously with the purchase agreement
- Post-closing retention is riskier (employees may depart before agreements are in place)
- Coordinate with the buyer's integration plan and the target's existing severance obligations

### Step 3: Analyze Non-Compete and Restrictive Covenant Enforceability

**Existing Covenants (Target's Employees)**:
- Review all non-compete, non-solicitation, and confidentiality agreements with current employees
- Assess enforceability under applicable state law (note: California generally prohibits non-competes; other states vary significantly in their reasonableness analysis)
- Determine whether existing covenants survive the transaction (assignment clauses, change-of-control language)
- In an asset purchase, existing employment agreements do not automatically transfer; the buyer must enter new agreements or rely on common law protections

**New Covenants (Post-Closing)**:
- Continued employment alone may not constitute sufficient consideration for new restrictive covenants in many states
- Provide independent consideration: retention bonus, equity grant, signing bonus, severance commitment
- Geographic scope: must be reasonably related to the business's actual market
- Temporal scope: 12-24 months is generally enforceable; longer periods face increasing scrutiny
- Activity scope: must be narrowly tailored to the employee's actual role and the employer's legitimate business interests
- Non-solicitation of customers: generally more enforceable than broad non-competes
- Non-solicitation of employees: increasingly scrutinized but generally enforceable if reasonable in scope
- FTC Non-Compete Rule: monitor the evolving federal regulatory landscape regarding non-compete restrictions; as of this writing, the FTC's proposed ban faces legal challenges but could fundamentally change enforceability

### Step 4: WARN Act Analysis

The Worker Adjustment and Retraining Notification Act (WARN) and its state equivalents (mini-WARN statutes) impose notice requirements for mass layoffs and plant closings.

**Federal WARN Requirements**:
- Applies to employers with 100+ full-time employees (or 100+ employees working an aggregate of 4,000+ hours per week)
- 60-day advance written notice required for: (a) plant closings affecting 50+ employees at a single site, or (b) mass layoffs affecting 500+ employees or 50-499 employees if they constitute 33%+ of the workforce at a site
- Notice must be provided to: affected employees (or their union representatives), the state dislocated worker unit, and the chief elected official of the local government
- Exceptions: faltering company (seeking capital), unforeseeable business circumstances, natural disaster
- Remedy for violation: back pay and benefits for up to 60 days, plus $500/day civil penalty for failure to notify local government

**State Mini-WARN Statutes**:
- Many states impose lower thresholds, longer notice periods, or broader definitions of covered events
- California (Cal-WARN): 75+ employees, covers relocations of 100+ miles, no exceptions for unforeseeable circumstances
- New York: 25+ employees, 90-day notice period
- New Jersey: broader definition of mass layoff, includes transfer of operations
- Illinois: 75+ full-time employees, 60-day notice

**Transaction-Specific WARN Issues**:
- In a stock purchase or merger, the buyer succeeds to the seller's WARN obligations; aggregation of pre- and post-closing layoffs may trigger WARN
- In an asset purchase, pre-closing layoffs are the seller's responsibility, post-closing layoffs are the buyer's; coordinate to avoid both parties assuming the other will provide notice
- The purchase agreement should include representations about compliance with WARN, an indemnification provision for WARN liabilities, and a cooperation covenant for the notice period

### Step 5: Benefit Plan Continuation and COBRA

**ERISA-Governed Plans**:
- In a stock purchase, all benefit plans continue with the target entity; the buyer assumes sponsorship
- In an asset purchase, the buyer is not required to assume the seller's plans but may choose to do so
- 401(k) plans: determine whether to merge into the buyer's plan, maintain as a separate plan, or terminate and distribute; if terminating, ensure no successor plan is adopted within 12 months (to avoid prohibited partial termination treatment)
- Defined benefit pension plans: assess funded status, PBGC reporting obligations, and potential withdrawal liability (for multiemployer plans)
- Health and welfare plans: coordinate transition timing to avoid gaps in coverage

**COBRA Obligations**:
- A "qualifying event" includes termination of employment; M&A transactions do not independently trigger COBRA, but associated layoffs do
- In an asset purchase where the seller ceases to maintain a group health plan, the seller has COBRA obligations for pre-closing qualifying events, and the buyer has obligations for post-closing qualifying events if it maintains a group health plan
- Coordinate COBRA administration between buyer and seller during the transition period

### Step 6: Equity Treatment

**Stock Options**:
- Vested options: typically cashed out at closing (spread between exercise price and per-share merger consideration), or rolled into buyer equity
- Unvested options: may be accelerated (single or double trigger), assumed by the buyer with adjusted terms, or cancelled (with or without consideration)
- Section 409A implications: ensure option treatment does not create a deferral of compensation that violates Section 409A
- Section 280G: option acceleration is a parachute payment component; include in the aggregate analysis

**Restricted Stock and RSUs**:
- Vested RSUs: cashed out at the per-share merger consideration
- Unvested RSUs: accelerated, assumed, or cancelled per the plan terms and the transaction agreement
- Restricted stock: if accelerated, the Section 83(b) election analysis is relevant; if repurchased, the repurchase price and forfeiture terms apply

**Change-in-Control Provisions**:
- Review equity plan definitions of "change in control" to confirm the transaction qualifies
- Single-trigger acceleration: vesting accelerates solely upon the change in control
- Double-trigger acceleration: vesting accelerates only if the holder is terminated without cause or resigns for good reason within a specified period (typically 12-24 months) after the change in control
- The purchase agreement should specify the equity treatment and prevail over inconsistent plan terms (to the extent permitted)

## Common Patterns

- **Assume and Continue**: In stock deals, all employment relationships and benefit plans continue. The buyer's primary concern is integration planning and retention of key talent. Minimal WARN risk unless post-closing restructuring is planned.
- **Hire and Terminate**: In asset deals, the buyer makes offers to selected employees; the seller terminates remaining employees. WARN analysis is critical. New employment agreements and restrictive covenants are required. Benefit plan continuation requires affirmative action by the buyer.
- **Retention-First Strategy**: Pre-signing, identify the top 10-20 employees critical to deal value. Structure retention agreements concurrently with the purchase agreement. Include representations about the execution and enforceability of these agreements as a closing condition.

## Common Mistakes to Avoid

1. **Ignoring independent contractor misclassification risk**. If the target treats workers as independent contractors who should be classified as employees, the buyer inherits liability for unpaid employment taxes, overtime, and benefits. This is a significant and often underestimated due diligence issue.
2. **Failing to model Section 280G exposure before signing**. Parachute payment excise taxes can be material and are often a surprise to both seller management and the buyer. Model the aggregate payments early and negotiate a cap or cutback provision if necessary.
3. **Assuming existing non-competes automatically transfer in an asset deal**. They do not. The buyer must obtain new agreements with adequate consideration or risk losing the ability to enforce post-closing restrictions.
4. **Overlooking state-specific WARN requirements**. Federal WARN is the floor, not the ceiling. State mini-WARN statutes frequently apply to smaller layoffs and require longer notice periods.
5. **Neglecting to coordinate benefit plan transition timing**. A gap in health insurance coverage -- even a few days -- creates employee relations problems and potential COBRA compliance issues.
6. **Failing to review the target's I-9 compliance and immigration status of key employees**. In an asset purchase, the buyer must complete new I-9 forms for all hired employees. H-1B and L-1 visa holders require timely petition amendments to avoid unauthorized employment gaps.

## Examples

**Example 1 -- Key Employee Retention Package**
Target CEO has a change-in-control agreement providing 2x base salary ($600K) upon a qualifying event. The buyer wants a 2-year commitment. Structure: retention agreement providing $400K additional retention bonus (50% at closing, 50% at 12 months), subject to continued employment and compliance with a 24-month non-compete. Total CIC payout: $1M. Section 280G analysis: CEO's base amount is $350K; 3x safe harbor is $1.05M; payments of $1M are within the safe harbor.

**Example 2 -- WARN Act Coordination in Asset Deal**
Buyer acquires substantially all assets of a 200-employee manufacturing facility. Buyer intends to offer employment to 150 employees. Seller must provide 60-day WARN notice to the 50 employees who will not receive offers (plant closing threshold met: 50 employees at a single site). Notice must issue no later than 60 days before the closing date. Purchase agreement includes seller covenant to deliver timely WARN notices and buyer indemnification for any WARN liability arising from post-closing terminations.

**Example 3 -- Equity Rollover Structure**
Target has 15 employees with unvested stock options. The deal provides double-trigger acceleration: options vest only if the holder is terminated without cause within 18 months post-closing. Unvested options are converted into buyer restricted stock units with equivalent value and vesting schedule. Section 409A compliance: the conversion is treated as a substitution of equity, not a new grant, preserving the original grant date for Section 409A purposes.
