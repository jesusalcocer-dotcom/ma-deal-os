---
skill_id: process/document-versioning
version: 1.0
type: process
applicable_agents: [specialist, manager]
applicable_tasks: [document_drafting, version_management]
depends_on: []
quality_score: 0.75
source: static
---

# Document Versioning

## Purpose

M&A transactions generate dozens of document versions across multiple workstreams.
Without rigorous versioning, deal teams lose track of which version is current, what
changed between iterations, and who approved which modifications. This skill defines
the version numbering convention, change manifest requirements, major vs revision
decision criteria, markup tracking standards, and redline generation rules used
throughout the Deal OS system.

## Procedure

### Step 1: Apply Version Numbering Conventions

All deal documents follow a three-part version scheme: **Major.Minor.Patch**

- **Major** (v1, v2, v3...): A new major version indicates a substantive structural
  or content change. Examples: initial draft (v1), post-counterparty-markup revision
  (v2), post-negotiation final form (v3). Major versions reset minor and patch to 0.
- **Minor** (.1, .2, .3...): A minor version indicates a meaningful content change
  within the same structural framework. Examples: adding a new representation,
  revising an indemnity formula, updating a disclosure schedule reference. Minor
  versions reset patch to 0.
- **Patch** (.0.1, .0.2...): A patch indicates a non-substantive correction.
  Examples: fixing a cross-reference, correcting a typo, updating a defined term
  that changed elsewhere, reformatting a table.

Examples of version progression:
- v1.0.0 — Initial draft generated from template
- v1.1.0 — Added environmental representations per DD findings
- v1.1.1 — Fixed cross-reference in s4.12(b)
- v2.0.0 — Revised draft incorporating counterparty markup
- v2.1.0 — Updated indemnity cap calculation per client instruction
- v3.0.0 — Execution version after final negotiation round

### Step 2: Create Change Manifests

Every version increment must include a change manifest — a structured record of what
changed, why, and who authorized it. The manifest contains:

- **Version**: The new version number
- **Timestamp**: When the version was created (deal-local timezone)
- **Author**: The agent or human who created the version
- **Approver**: Who approved the changes (if approval was required)
- **Trigger**: What caused the change (DD finding, counterparty markup, client
  instruction, internal review, etc.)
- **Changes**: A list of specific modifications, each with:
  - Section or clause reference
  - Nature of change (added, modified, deleted, moved)
  - Brief description (one sentence)
- **Impact assessment**: Whether the change affects deal economics, material terms,
  or closing conditions

Change manifests are stored alongside the document version in the system and are
queryable by deal, document, section, and date range.

### Step 3: Decide Major vs Minor vs Patch

Use this decision tree:

1. Does the change alter document structure (new sections, reorganized articles,
   merged or split clauses)? **Yes = Major.**
2. Does the change respond to a counterparty markup or a new negotiation round?
   **Yes = Major.**
3. Does the change modify substantive legal content (terms, obligations, rights,
   conditions)? **Yes = Minor.**
4. Does the change modify numerical values (caps, baskets, thresholds, dates)?
   **Yes = Minor.**
5. Does the change affect only formatting, cross-references, defined term
   consistency, or typographical errors? **Yes = Patch.**

When a single edit session includes changes at multiple levels, use the highest
applicable level. A session that fixes a typo AND revises an indemnity formula is
a Minor version, not a Patch.

### Step 4: Track Markups

The system tracks all markups — changes proposed by any party — in a structured
format:

- **Source**: Who proposed the markup (counterparty counsel, client, internal review)
- **Status**: Pending, Accepted, Rejected, Counter-proposed
- **Sections affected**: List of clause references
- **Linked version**: Which document version incorporates the markup resolution

Markups remain in "Pending" status until explicitly accepted or rejected. Accepting
a markup triggers a version increment. Rejecting a markup triggers a response email
to the proposing party (see process/email-communication).

All markup tracking data feeds into the negotiation history, enabling the system to
identify patterns (e.g., counterparty consistently pushes back on knowledge qualifiers)
and inform strategy recommendations.

### Step 5: Generate Redlines

Redlines compare two document versions and highlight all differences. The system
generates redlines according to these standards:

- **Comparison scope**: Always compare against the last version sent to the requesting
  party. If counterparty asks for a redline, compare against the last version they
  received, not the last internal version.
- **Formatting**: Insertions in blue underline. Deletions in red strikethrough. Moved
  text indicated with double underline at new location and strikethrough at old.
- **Granularity**: Track changes at the word level, not the paragraph level. A single
  changed word should not highlight the entire paragraph.
- **Metadata**: Include a cover page listing total insertions, deletions, and moves,
  plus a section-by-section summary of changes.
- **Output format**: Generate in both DOCX (with tracked changes) and PDF (with
  visual markup) formats.

Redlines are generated automatically when a new version is created. They are also
available on demand for any two arbitrary versions of the same document.

## Guidelines

- Never overwrite a previous version. All versions are immutable once committed.
- Store version metadata in the document_versions table with foreign keys to the
  deal and the parent version.
- The "current" version is always the highest version number — do not maintain a
  separate "current" flag that could become stale.
- Increment each document's version independently. Do not synchronize version numbers
  across documents even when multiple are updated simultaneously.
- Archive superseded versions but keep them accessible for reference during negotiation.

## Common Mistakes to Avoid

- **Version number gaps**: Skipping from v1.0.0 to v1.3.0 because "a lot changed."
  Every increment must be sequential. If a lot changed, that is one Minor version
  with a detailed change manifest.
- **Stealth edits**: Modifying a document without incrementing the version. Every
  change, no matter how small, gets a version increment and a manifest entry.
- **Wrong redline base**: Generating a redline against an internal draft when the
  counterparty expects comparison against their last markup. Always confirm the
  comparison base before generating.
- **Missing manifests**: Creating a new version with a blank or generic change
  description like "updates." Every manifest must list specific changes.
- **Conflating version and approval**: A new version number means a new draft exists,
  not that the draft is approved. Version creation and approval are separate steps.
