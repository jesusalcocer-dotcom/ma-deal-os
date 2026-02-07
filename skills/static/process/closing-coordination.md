---
skill_id: process/closing-coordination
version: 1.0
type: process
applicable_agents: [specialist, manager]
applicable_tasks: [closing_mechanics, coordination]
depends_on: [domain/closing-mechanics]
quality_score: 0.80
source: static
---

# Closing Coordination

## Purpose

Closing is the culmination of every M&A transaction. A single missed signature page,
unverified funds flow, or overlooked post-closing obligation can delay or derail what
months of negotiation achieved. This skill defines the operational procedures for
coordinating a smooth closing: pre-closing call preparation, signature page logistics,
funds flow verification, post-closing obligation handoff, and closing binder assembly.

## Procedure

### Step 1: Prepare the Pre-Closing Call Agenda

The pre-closing call occurs 2-3 business days before the target closing date. The
system generates the agenda by scanning all open items. The agenda must include:

1. **Closing conditions status**: Every condition precedent with current status
   (satisfied, expected, outstanding, waived). Flag unsatisfied conditions.
2. **Document status**: Each closing deliverable — final form, under review, or still
   being negotiated. Identify items awaiting counterparty or third-party input.
3. **Funds flow summary**: Wire amounts, source/destination accounts, and timing.
   Flag amounts depending on unfinalized calculations.
4. **Signature logistics**: Execution method, all required signatories, availability.
5. **Outstanding issues**: Unresolved points with resolution plans and fallbacks.
6. **Timeline**: Hour-by-hour closing day schedule with document release sequence,
   wire initiation times, and confirmation checkpoints.

Distribute the agenda to all parties at least 24 hours before the call.

### Step 2: Manage Signature Page Logistics

Signature pages are the most operationally sensitive closing deliverable:

- **Collect in advance**: Request from all signatories 2+ business days before
  closing. Hold in escrow until closing is confirmed.
- **Track per signatory**: Maintain a matrix of document, signatory, and status
  (requested, received, released).
- **Verify completeness**: Cross-check every received page against the agreement's
  execution requirements and ancillary documents.
- **Release protocol**: Release only upon confirmation that all conditions are
  satisfied or waived and funds wired. Authorized by lead partner on each side.
- **Counterpart assembly**: Combine signature pages with final document body.
  Verify page counts and signatory completeness before distribution.

### Step 3: Verify Funds Flow

Follow a strict verification checklist:

1. **Wire instructions confirmed**: Receiving bank details verified by callback to
   known contacts. Never rely solely on emailed instructions.
2. **Amounts reconciled**: Total outgoing equals incoming plus escrow. Memo balances
   to zero.
3. **Timing confirmed**: Initiation times agreed with all sending banks. Same-day
   settlement cutoffs verified for all jurisdictions.
4. **Authorization in place**: Wire authorizations signed. Dual-authorization
   confirmed where applicable.
5. **Confirmation protocol**: Define who confirms receipt, via what channel, and
   within what timeframe.

Do not release signature pages until all wires are confirmed received.

### Step 4: Execute Post-Closing Obligation Handoff

The system generates a post-closing obligation tracker from the agreement:

- **Working capital adjustment**: Preliminary statement deadline, dispute period,
  final payment. Assign to financial advisor or accounting.
- **Earnout milestones**: Measurement periods, calculations, dispute procedures.
- **Indemnification claims**: Survival periods, notice requirements, basket and cap.
- **Regulatory filings**: Post-closing HSR, state amendments, license transfers.
- **Employee matters**: Benefit transitions, severance, retention bonuses.
- **Transition services**: TSA terms, service levels, duration, exit triggers.

Each obligation includes: description, responsible party, deadline, reminder triggers
(30 days, 7 days, 1 day before), and escalation path.

### Step 5: Assemble the Closing Binder

The closing binder is the definitive transaction record, assembled within 5 business
days of closing. Contents:

- Fully executed agreements with all exhibits and schedules
- Ancillary agreements (escrow, employment, non-competes, TSA, consulting)
- Officer certificates (closing, good standing, secretary with incumbency)
- Third-party consents organized by type
- Regulatory approvals (HSR clearance, state, industry-specific)
- Funds flow documentation and wire confirmations
- Board resolutions from all corporate parties

Generate in both digital (Google Drive folder structure) and PDF (consolidated
document with bookmarks) formats.

## Guidelines

- Begin closing preparation at least 10 business days before the target date.
- Maintain a single source of truth for closing status in the system's checklist.
  Do not allow parallel tracking in spreadsheets or email threads.
- Conduct a funds flow dry run 3 business days before closing.
- On closing day, maintain a live status thread for all deal team members.
- If closing is delayed, immediately notify all parties with a revised timeline.

## Common Mistakes to Avoid

- **Assuming wire instructions are correct**: Always verify by phone callback. Wire
  fraud in M&A transactions is a real and growing risk.
- **Releasing signature pages early**: Once released, they cannot be recalled. Never
  release until all conditions are confirmed satisfied.
- **Forgetting ancillary documents**: Employment agreements, escrow agreements, and
  other ancillaries are equally critical to closing as the main agreement.
- **Incomplete post-closing handoff**: If obligations are not formally assigned with
  deadlines and reminders, they will be missed after the team disperses.
- **Delayed binder assembly**: Start immediately after closing and complete within
  5 business days. Delays make complete assembly increasingly difficult.
