# Phase 13: Mobile Approval Interface

## Prerequisites
- Phase 4 complete (approval framework and queue web UI)
- Approval queue API fully functional
- Action chain and proposed action pipeline working

## What You're Building

A mobile-optimized approval interface so the partner can manage the deal from their phone:
1. **Responsive approval queue** — card-based layout optimized for phone screens
2. **Swipe-to-approve** — gesture-based approval for Tier 2 items
3. **Push notifications** — (infrastructure only; actual push requires service worker + VAPID keys)
4. **Deal status dashboard** — mobile-friendly overview
5. **Voice annotation** — (infrastructure only; speech-to-text API integration)

## Reference
- SPEC-V2-COMPLETE.md Section 6.4 (Mobile-First Design), 19.2 (Pages)

## Steps

### Step 13.1: Mobile Layout Foundation

**What:** Create a mobile-specific layout and responsive breakpoints for the approval interface.

**Files to create/modify:**
- `apps/web/src/components/mobile/MobileLayout.tsx` — Mobile container with bottom nav
- `apps/web/src/components/mobile/MobileNav.tsx` — Bottom navigation (Queue, Deals, Settings)
- Update `apps/web/src/app/layout.tsx` — Add mobile detection and responsive container

**Implementation details:**
- Use Tailwind's responsive breakpoints: `sm:`, `md:`, `lg:`
- Below `md` breakpoint: show mobile layout with bottom nav
- Above `md`: show existing desktop layout
- Bottom nav items: Approval Queue, Active Deals, Agent Chat, Settings
- Mobile container: full-width, no sidebar, card-based content

**Test:**
```bash
pnpm dev &
sleep 5
# Test mobile viewport
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/approval-queue
kill %1
```
**Expected:** Approval queue page returns 200 and is responsive.
**Severity:** 🔴 CRITICAL

### Step 13.2: Mobile Approval Queue Cards

**What:** Redesign approval queue cards for mobile interaction.

**Files to create/modify:**
- `apps/web/src/components/mobile/ApprovalCard.mobile.tsx` — Mobile-optimized approval card
- `apps/web/src/components/mobile/SwipeableCard.tsx` — Swipe gesture wrapper

**Implementation details:**
- Card layout optimized for touch:
  - Large touch targets (minimum 44px)
  - Significance badge (color-coded) prominently displayed
  - Deal name and summary visible without scrolling
  - Action count badge
  - Expand/collapse for action details
- Swipe gesture:
  - Swipe right = Approve All (Tier 2 items)
  - Swipe left = Open for Review
  - Use CSS transforms + touch event handlers (no heavy gesture library)
  - Visual feedback: green slide for approve, yellow for review
  - Haptic feedback if supported (`navigator.vibrate`)
- For Tier 3 items: swipe disabled, only "Review" button available

**Test:**
```bash
# Verify component exists and renders
pnpm build
```
**Expected:** Build succeeds with mobile components.
**Severity:** 🔴 CRITICAL

### Step 13.3: Mobile Action Preview

**What:** Touch-friendly expandable action previews.

**Files to create/modify:**
- `apps/web/src/components/mobile/ActionPreview.mobile.tsx` — Mobile action preview

**Implementation details:**
- Accordion-style expansion (tap to expand/collapse)
- Each action shows:
  - Action type icon
  - Title and description
  - Preview content (document diff, email draft, schedule entry)
- Individual action controls: Approve (green), Modify (blue), Reject (red)
- "Modify" opens a text editor sheet (bottom sheet pattern)
- Font sizes appropriate for mobile (16px minimum for body text)

**Test:**
```bash
pnpm build
```
**Expected:** Build succeeds.
**Severity:** 🟡 HIGH

### Step 13.4: Push Notification Infrastructure

**What:** Service worker and notification infrastructure for push notifications.

**Files to create/modify:**
- `apps/web/public/sw.js` — Service worker for push notifications
- `apps/web/src/lib/notifications.ts` — Notification registration and sending utilities
- `apps/web/src/components/mobile/NotificationPermission.tsx` — Permission request UI

**Implementation details:**
- Service worker registers for push events
- When a Tier 2 or Tier 3 action chain is created, generate a notification payload:
  - Title: "{Deal Name}: {Significance} Priority"
  - Body: Action chain summary
  - Action buttons: "Approve" (for Tier 2), "Review"
- `requestNotificationPermission()`: Asks user for notification permission
- `sendNotification(chain)`: Creates local notification (for now; web push requires server-side VAPID keys)
- This is infrastructure — actual push delivery via a push service (e.g., web-push npm package) is deferred

**Test:**
```bash
# Verify service worker file exists
ls -la apps/web/public/sw.js
pnpm build
```
**Expected:** Service worker file exists. Build succeeds.
**Severity:** 🟡 HIGH

### Step 13.5: Mobile Deal Status Dashboard

**What:** Quick-glance deal overview optimized for phone.

**Files to create/modify:**
- `apps/web/src/components/mobile/DealStatusCard.mobile.tsx` — Compact deal status card
- `apps/web/src/components/mobile/DealsDashboard.mobile.tsx` — All deals overview

**Implementation details:**
- Each deal shows as a compact card:
  - Deal name + code name
  - Status badge (active, closing, etc.)
  - Pending approval count (red badge if > 0)
  - Critical deadline (if within 7 days)
  - Health indicator: green/yellow/red based on overdue items
- Tapping a deal goes to the deal dashboard
- Pull-to-refresh gesture

**Test:**
```bash
pnpm build
```
**Expected:** Build succeeds.
**Severity:** 🟡 HIGH

### Step 13.6: Voice Annotation Support (Infrastructure)

**What:** Infrastructure for voice note recording on Tier 3 review items.

**Files to create/modify:**
- `apps/web/src/components/mobile/VoiceNote.tsx` — Voice recording component
- `apps/web/src/lib/audio-recorder.ts` — Web Audio API recorder utility

**Implementation details:**
- Voice recording using Web Audio API / MediaRecorder
- Record button (hold-to-record pattern)
- Playback preview before submitting
- Store as audio blob
- Transcription: placeholder for Whisper API or similar (actual transcription is future work)
- For now: record audio, store blob, display "Voice note attached" in the approval

**Test:**
```bash
pnpm build
```
**Expected:** Build succeeds. Audio recorder utility exports functions.
**Severity:** 🟢 MEDIUM

### Step 13.7: Build Verification

**Test:**
```bash
pnpm build
pnpm dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/approval-queue
kill %1
```
**Expected:** Build succeeds. Approval queue page responsive and mobile-ready.
**Severity:** 🔴 CRITICAL

## Phase Gate
- [ ] Mobile layout with responsive breakpoints and bottom nav
- [ ] Approval cards optimized for touch with large targets
- [ ] Swipe-to-approve gesture working on Tier 2 items
- [ ] Push notification infrastructure (service worker, permission request)
- [ ] Mobile deal status dashboard with health indicators
- [ ] Voice note recording component (infrastructure)
- [ ] `pnpm build` succeeds
- [ ] Approval queue page works at mobile viewport widths
