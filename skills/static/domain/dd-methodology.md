---
skill_id: domain/dd-methodology
version: "1.0"
type: domain
applicable_agents: [specialist, manager]
applicable_tasks: [dd_analysis, risk_assessment]
depends_on: []
quality_score: 0.85
source: static
---

# Due Diligence Methodology

## Purpose

Due diligence is the systematic investigation of a target company conducted by or on behalf of a prospective acquirer to confirm assumptions underlying the transaction, identify risks that may affect valuation or deal structure, and inform the negotiation of representations, warranties, indemnities, and closing conditions. The quality of due diligence directly determines whether deal-specific risks are identified before signing, allocated appropriately in the definitive agreement, and priced into the transaction.

This skill defines the methodology for conducting, organizing, and documenting due diligence across all workstreams in an M&A transaction. It covers document review priorities, risk classification, exposure quantification, finding documentation standards, workstream categories, and interview protocols. Agents use this skill when analyzing DD materials, generating findings, assessing risks, and producing DD reports.

## Methodology

### Step 1: Document Review Prioritization

Not all documents in a data room deserve equal attention. Prioritize review based on materiality and risk potential:

**Tier 1 — Immediate Review (Day 1-3):**
- Organizational documents (certificate of incorporation, bylaws, operating agreements)
- Material contracts (contracts exceeding the materiality threshold, typically $250K+ annual value or strategic significance)
- Financial statements (audited and interim) for the last 3 fiscal years
- Tax returns and tax-sharing agreements for the last 3-5 years
- Pending or threatened litigation, arbitration, and regulatory proceedings
- Outstanding debt instruments, security agreements, and guarantees
- Intellectual property registrations and key license agreements
- Employment agreements with C-suite and key employees
- Real property leases for principal operating locations
- Insurance policies (D&O, general liability, product liability, cyber)

**Tier 2 — Priority Review (Day 3-7):**
- Customer contracts (top 20 by revenue contribution)
- Supplier and vendor agreements (top 10 by spend)
- Government permits, licenses, and regulatory filings
- Environmental reports and assessments
- Employee benefit plans and ERISA compliance documents
- Standard form contracts and terms of service
- Recent board minutes and written consents (last 24 months)
- Capitalization table and equity grant documentation

**Tier 3 — Comprehensive Review (Day 7-14):**
- Remaining commercial contracts
- Historical board minutes (beyond 24 months)
- Corporate minute books and subsidiary documentation
- Historical correspondence with regulators
- Product liability and warranty claims history
- Data privacy and cybersecurity policies and incident reports
- Union agreements and labor relations history

### Step 2: Risk Classification Framework

Classify each identified risk into one of four severity levels. The classification drives how the risk is addressed in the transaction documentation:

**Critical Risk:**
- Could result in a loss exceeding 10% of enterprise value
- Could fundamentally change the target's business operations or viability
- Could create regulatory liability that prevents closing
- Could constitute a breach of law that exposes the acquirer to successor liability
- Examples: undisclosed environmental contamination requiring $50M+ remediation, pending government investigation that could result in debarment, undisclosed tax liability exceeding $20M, title defects affecting core operating assets

**High Risk:**
- Could result in a loss between 2% and 10% of enterprise value
- Affects a material business line or customer relationship
- Requires specific indemnification or purchase price adjustment
- Examples: key customer contract with unfavorable change-of-control provision, material IP owned by a founder personally rather than the company, pending litigation with realistic adverse exposure of $5-15M, non-compliance with data privacy regulations affecting significant customer base

**Medium Risk:**
- Could result in a loss between 0.5% and 2% of enterprise value
- Affects operations but is manageable with appropriate protections
- Can be addressed through representations, covenants, or disclosure schedules
- Examples: employee benefit plan requiring amendment for compliance, lease with above-market rent and no termination right, minor environmental condition requiring monitoring, customer concentration risk (single customer representing 15-20% of revenue)

**Low Risk:**
- Could result in a loss below 0.5% of enterprise value
- Represents a compliance gap or administrative deficiency
- Can be addressed post-closing through integration planning
- Examples: missing corporate formalities for dormant subsidiaries, expired business licenses requiring routine renewal, outdated employee handbook provisions, minor inconsistencies in standard form contracts

### Step 3: Exposure Quantification

Every material finding must include a quantified exposure estimate. Use these methods:

- **Direct Calculation** — Where the exposure has a determinable value (e.g., a tax liability based on filed returns, a contract termination payment, a known environmental remediation cost), calculate the direct dollar exposure.
- **Range Estimation** — Where the exposure depends on contingencies, provide a low-mid-high range. The low estimate assumes favorable resolution of all contingencies; the high estimate assumes unfavorable resolution. Example: pending litigation with damages claimed of $10M, estimated range of $2M (settlement) to $8M (adverse judgment after appeal).
- **Probability-Weighted Exposure** — Multiply the potential loss by the estimated probability of occurrence. A $20M potential environmental liability with a 25% probability of materialization has a probability-weighted exposure of $5M.
- **Recurring vs. One-Time** — Distinguish between one-time exposures (a single litigation matter) and recurring exposures (an annual compliance cost that will persist post-closing). Recurring exposures should be capitalized at an appropriate multiple to derive the present value.

### Step 4: Finding Documentation Standards

Each due diligence finding must be documented in a structured format that enables consistent tracking, prioritization, and resolution. Required fields for every finding:

- **Finding ID** — Unique identifier following the format DD-[Workstream]-[Sequential Number] (e.g., DD-TAX-007, DD-IP-003).
- **Title** — Concise descriptive title (e.g., "Undisclosed Sales Tax Nexus in California").
- **Workstream** — The DD workstream that identified the finding (Financial, Tax, Legal, IP, Employment, Environmental, Regulatory, IT/Cyber, Insurance, Real Estate).
- **Severity** — Critical, High, Medium, or Low per the classification framework.
- **Description** — Detailed narrative of the finding, including the specific documents reviewed, the issue identified, and the factual basis for the conclusion.
- **Exposure Estimate** — Quantified exposure using the methods described above.
- **Source Documents** — List of data room document IDs that support the finding.
- **Recommended Action** — How the finding should be addressed in the transaction (specific indemnity, representation, closing condition, purchase price adjustment, post-closing covenant, or acceptance of risk).
- **Status** — Open, Under Discussion, Resolved, or Accepted.
- **Resolution** — If resolved, how it was addressed (specific agreement provision, purchase price reduction, escrow, insurance, etc.).

### Step 5: Workstream Categories and Focus Areas

Due diligence is organized into specialized workstreams, each with distinct objectives:

**Financial Due Diligence:**
- Quality of earnings analysis — normalize EBITDA for non-recurring items, related-party transactions, and accounting policy choices
- Working capital analysis — identify seasonal patterns, calculate normalized working capital for the peg amount
- Revenue sustainability — assess customer concentration, contract renewal rates, and pipeline quality
- Cost structure analysis — identify fixed vs. variable costs, margin trends, and cost reduction opportunities
- Capital expenditure requirements — maintenance capex vs. growth capex, deferred maintenance obligations

**Tax Due Diligence:**
- Federal, state, and local income tax compliance review
- Sales and use tax nexus analysis across all jurisdictions
- Transfer pricing documentation and intercompany transaction review
- Tax attribute analysis (NOLs, credits, Section 382 limitations)
- Structure optimization — asset vs. stock, Section 338(h)(10) election analysis
- Unclaimed property / escheatment compliance

**Legal Due Diligence:**
- Corporate organization and good standing in all jurisdictions
- Material contract review (change of control, assignment, termination provisions)
- Litigation and claims history (pending, threatened, and historical)
- Regulatory compliance (industry-specific licenses, permits, and approvals)
- Capitalization and equity grant review (fully diluted share count, outstanding options/warrants)

**Intellectual Property Due Diligence:**
- Patent portfolio review (validity, enforceability, freedom-to-operate)
- Trademark portfolio review (registrations, common law marks, domain names)
- Trade secret protection assessment (policies, NDAs, access controls)
- Open source software audit (license compliance, copyleft contamination risk)
- IP ownership chain (assignments from founders, contractors, and employees)

**Employment Due Diligence:**
- Key employee identification and retention risk assessment
- Employment agreement review (non-competes, severance, change-of-control provisions)
- Employee benefit plan compliance (ERISA, ACA, 401(k) audit status)
- Wage and hour compliance (exempt/non-exempt classification, overtime practices)
- Independent contractor classification review
- Union and collective bargaining agreement analysis

**Environmental Due Diligence:**
- Phase I and Phase II environmental site assessments
- Hazardous substance usage, storage, and disposal history
- Environmental permit compliance and renewal status
- Known contamination sites and remediation obligations
- Environmental litigation and regulatory enforcement history

**Regulatory Due Diligence:**
- Antitrust/competition analysis (HSR filing requirements, substantive risk assessment)
- CFIUS and foreign investment review requirements
- Industry-specific regulatory approvals (banking, insurance, telecom, healthcare)
- Export control and sanctions compliance (OFAC, EAR, ITAR)
- Anti-bribery and corruption compliance (FCPA, UK Bribery Act)

### Step 6: Interview Protocols

Management interviews supplement document review and should be conducted systematically:

- Prepare a written interview guide for each workstream, with specific questions tied to document review findings.
- Interview the target's CFO, General Counsel, VP of Operations, VP of Sales, and Head of HR at minimum.
- For each finding classified as High or Critical, prepare a specific question for the relevant management team member.
- Document interview responses contemporaneously. Note any inconsistencies between interview responses and data room documents.
- Follow-up requests should be submitted through the data room request list within 24 hours of the interview.
- All interview notes must be treated as confidential and stored in the deal team's privileged work product file.

## Common Patterns

1. **The Disclosure Schedule Gap** — Material findings often correspond to items that should appear in the seller's disclosure schedules but do not. Track every finding against the corresponding representation and identify disclosure gaps early.

2. **The Stub Period Problem** — Financial DD often covers only audited annual periods. The stub period between the last audit date and signing can hide deteriorating performance. Always request and review monthly financial statements for the stub period.

3. **Customer Concentration Cascades** — A single customer representing 20%+ of revenue creates risk not just from revenue loss but from the customer's leverage to extract unfavorable contract terms at renewal. Assess both the direct revenue risk and the indirect margin risk.

4. **The Contractor Misclassification Multiplier** — When a company misclassifies employees as independent contractors, the exposure includes back taxes, penalties, interest, and potential class action liability. The exposure multiple is typically 2-4x the direct tax underpayment.

## Common Mistakes to Avoid

1. **Relying solely on data room documents** — Data rooms contain what the seller chooses to provide. Conduct independent searches of public records (litigation databases, UCC filings, patent databases, regulatory enforcement actions) to identify undisclosed risks.

2. **Treating all representations as equal** — Not every representation requires the same depth of diligence. Focus investigation resources proportionally to the risk level and materiality of each area.

3. **Failing to connect findings to deal terms** — A DD finding that does not result in a specific recommendation for the transaction documents (representation, indemnity, price adjustment, or risk acceptance) is incomplete. Every material finding must have a recommended action.

4. **Underestimating integration-related risks** — Due diligence should identify not just current risks but risks that will emerge from the integration process itself (key employee flight risk, customer reaction to ownership change, system incompatibility, cultural misalignment).

5. **Incomplete jurisdictional analysis** — For targets operating in multiple states or countries, due diligence must cover all material jurisdictions. Tax nexus, employment law, environmental obligations, and regulatory requirements vary significantly by jurisdiction.

## Examples

**Example 1: Critical Finding**
DD-TAX-012: "Undisclosed Transfer Pricing Exposure." Review of intercompany service agreements reveals that the target has been charging below-market rates for management services provided to its Irish subsidiary since 2019. Estimated exposure: $8M-$14M in additional US federal and state income tax, plus penalties and interest. Recommended action: specific indemnity with no cap and no basket, plus tax representation requiring disclosure of all intercompany pricing arrangements.

**Example 2: High Finding**
DD-LEGAL-005: "Material Contract Change-of-Control Provision." The target's largest customer contract (representing 18% of annual revenue) contains a change-of-control provision that permits the customer to terminate on 30 days' notice following a change of control of the target. Estimated exposure: $12M annual revenue at risk. Recommended action: obtain customer consent as a closing condition, or negotiate a specific indemnity covering revenue loss for 24 months if the customer terminates.

**Example 3: Medium Finding**
DD-EMP-009: "Outdated Employee Handbook." The target's employee handbook has not been updated since 2020 and does not reflect current state law requirements in California, New York, and Illinois regarding paid family leave, sexual harassment training, and pay transparency. Estimated exposure: $150K-$300K in compliance remediation costs. Recommended action: seller representation regarding compliance with employment laws; post-closing integration plan item for handbook update within 90 days.
