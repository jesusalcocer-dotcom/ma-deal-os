---
skill_id: process/approval-queue-formatting
version: 1.0
type: process
applicable_agents: [manager]
applicable_tasks: [action_planning, approval_routing]
depends_on: [process/action-chain-creation]
quality_score: 0.75
source: static
---

# Approval Queue Formatting

## Purpose

The approval queue is the primary interface between the AI system and human decision
makers. Every action chain that requires human sign-off passes through this queue.
The quality of the queue presentation directly determines approval speed and accuracy.
A well-formatted queue item lets a partner approve or reject in 10 seconds. A poorly
formatted one forces them to dig into details, slowing the entire deal. This skill
defines how to write summaries, calibrate significance, structure preview content, and
route items to the correct approval tier.

## Procedure

### Step 1: Write the Summary Line

The summary line is the single most important piece of text in the approval queue. It
must convey what will happen and why in under 120 characters. Structure it as:

**[Action verb] [target] [reason/trigger]**

Good examples:
- "Revise indemnity cap in SPA s4.12 — new environmental liability from DD Phase II"
- "Draft disclosure schedule update — three new material contracts identified"
- "Send follow-up to counterparty counsel — IP rep markup 5 days overdue"

Bad examples:
- "Update document" (no specificity)
- "Environmental issue response action chain for deal Project Mercury" (too long, buries the action)
- "Important — needs review" (no content whatsoever)

### Step 2: Calibrate Significance

Assign a significance level to each queue item. This controls visual prominence and
notification behavior:

- **Critical**: Affects deal economics, timeline, or closing conditions. Examples:
  purchase price adjustment, MAC clause trigger, regulatory filing deadline.
  Notification: immediate push to approver.
- **High**: Affects material deal terms or counterparty relationship. Examples:
  rep/warranty revision, indemnity basket change, key employee term modification.
  Notification: included in next hourly digest + badge in UI.
- **Standard**: Routine deal execution. Examples: checklist item completion,
  disclosure schedule addition, internal memo distribution.
  Notification: included in daily digest + visible in queue.
- **Low**: Housekeeping and administrative. Examples: document formatting,
  filing organization, internal status updates.
  Notification: visible in queue only, no push notification.

Err toward higher significance. A partner who sees a Critical item that turns out to
be merely High will not complain. A partner who misses a Critical item marked Standard
will have serious concerns.

### Step 3: Structure Preview Content

The preview block appears when the approver expands a queue item. It must contain
exactly these sections in this order:

1. **Context** (2-3 sentences): What triggered this action and what deal state it
   relates to. Reference the specific deal, phase, and any prior actions.
2. **Proposed Actions** (bulleted list): Each action in the chain, described in
   verb-noun format with expected output. Number them to match the chain sequence.
3. **Impact Assessment** (1-2 sentences): What changes in the deal if this chain
   executes. What documents are modified, what terms shift, what parties are affected.
4. **Risk Note** (1 sentence): The primary risk if the chain is approved, and the
   primary risk if it is rejected or delayed.
5. **Reversibility** (1 word + optional note): "Full", "Partial", or "None". If
   partial, specify what cannot be reversed.

Do not add extra sections. Do not include raw data dumps. The preview is a decision
aid, not a comprehensive report.

### Step 4: Set the Approval Tier

Tiers are defined in action-chain-creation. When formatting for the queue, translate
tiers into routing rules:

- **Tier 0**: Does not enter the approval queue. Executes automatically. Log only.
- **Tier 1**: Routes to the assigned associate on the deal team. 4-hour auto-escalation
  to partner if no response.
- **Tier 2**: Routes to the assigned partner. 8-hour auto-escalation to engagement
  partner if no response.
- **Tier 3**: Routes to the client contact via the deal's designated communication
  channel. No auto-escalation — partner is notified after 24 hours of no response.

Include the tier number and the specific approver name (or role if unassigned) in the
queue item metadata.

### Step 5: Handle Escalation Criteria

An item escalates when:
- The auto-escalation timer expires without a decision
- The original approver explicitly escalates
- A subsequent event increases the significance of a pending item
- Multiple related items accumulate without approval (3+ related items in queue)

When escalating, prepend the summary line with "[ESCALATED]" and add a one-line
escalation reason to the preview content. Do not modify the original preview structure.

## Guidelines

- Never batch unrelated items into a single approval request. Each action chain gets
  its own queue entry, even if they were triggered by the same event.
- Timestamp all queue entries in the deal's local timezone, not UTC.
- Include a "requested by" field showing which agent or pipeline generated the item.
- If an item has been in the queue for more than its tier's escalation window without
  action, flag it in the daily deal status report.
- Queue items for the same deal should be visually grouped in the UI. Include the
  deal identifier prominently in the metadata.
- When an approver rejects an item, require a one-line rejection reason. Log it and
  route it back to the originating agent for revision.

## Common Mistakes to Avoid

- **Wall of text in the preview**: If the preview exceeds 15 lines, it is too long.
  The approver will skip it entirely and approve blind or delay indefinitely.
- **Burying the ask**: The summary line must make the required action obvious. Do not
  make the approver read the preview to understand what they are approving.
- **Significance inflation**: Marking everything as Critical desensitizes approvers.
  Reserve Critical for items that genuinely affect deal outcome or timeline.
- **Missing reversibility note**: Approvers weigh risk differently for reversible
  vs irreversible actions. Always include this field.
- **Stale queue items**: Items older than 48 hours without action indicate a process
  failure. Escalate or withdraw them — do not let them accumulate silently.
- **Omitting the trigger reference**: Every queue item must trace back to the event
  or finding that caused it. Orphaned items erode trust in the system.
