# PepPilot — Section 04: Injection Tracker & Body Map

**Purpose:** Record actual injections and provide a simple, shared injection-site history and suggested zone across a member's concurrent protocols.

**References:** `AGENTS.md`, relevant parts of `docs/PROJECT_CONTEXT.md`, and the existing protocol/calendar implementation (`docs/PROTOCOLS.md`).
**Prerequisite:** Sections 01–03 complete. Reuse existing authentication, owner-scoped authorisation, cycle revisions, scheduling and calendar services.

## Working rules

Implement **one task at a time** (I01–I06). Keep planned calendar occurrences distinct from actual injections. Every private read/write must be scoped to the authenticated member. Support multiple injections on the same day, including overlapping cycles. Avoid new background services, push/email reminders, automatic inventory deductions, and unrelated health/community features. Use versioned Drizzle migrations and preserve historic data. Do not invent medical rotation rules: if a precise threshold or route suitability rule is not approved, make it configurable/undecided instead of treating it as clinical advice.

## I01 — Injection logging and adherence

**Implement**
- Record an actual injection against a planned occurrence/cycle, including **actual date/time, dose, unit, catalogue item(s)** and optional notes. Preserve the original scheduled details separately from the recorded action.
- Support **completed, skipped, missed** states, distinguishing automatically *overdue/unlogged* occurrences from an explicitly recorded missed injection. Avoid prematurely marking today's future appointments as missed.
- Prevent duplicate completion of the same scheduled occurrence while allowing legitimate multiple planned injections on one day; support correction of a mistaken log with appropriate history.
- Calculate per-cycle adherence from due, applicable scheduled events and their resolved states. Exclude paused/cancelled or future events from the denominator; document the precise counting rule.
- Add minimal authenticated member actions/interfaces for logging from a scheduled entry; postpone site selection UI to I02.

**Acceptance criteria**
- A saved administration is linked to the correct member, cycle and scheduled occurrence; planned history remains unchanged.
- Multiple concurrent cycles and multiple occurrences on a date are logged independently.
- Duplicate submissions, cross-account access, revised schedules, skipped/missed states and adherence edge cases are tested.

## I02 — Body map and 14 subzones

**Implement**
- Provide a body-map reference with these fixed **five regions and fourteen subzones**:
  1. **Abdomen:** left upper, left lower, right upper, right lower (4).
  2. **Love handles / flanks:** left, right (2).
  3. **Thighs:** left upper, left lower, right upper, right lower (4; suitable front/outer region only).
  4. **Upper arms:** left, right (2; back of upper arm).
  5. **Upper buttocks:** left, right (2; upper outer region).
- Keep stable zone identifiers and human-readable labels, e.g. **“Zone 1 — Abdomen · Left lower”**. A schematic front/back reference is sufficient; **no precise pin-placement UI**.
- Add an optional *actual site used* field to each injection log. Store a member's disabled/unavailable subzones as private preferences.
- Show recent site use and the associated peptide/date on a mobile-friendly view. Do not interpret colour as confirmation of safety.

**Acceptance criteria**
- Exactly 14 stable subzones exist, with no extra subdivisions of love handles.
- Site records are private and tied to actual injections; a member can review their own combined history across all cycles.
- Display and selection work at mobile and desktop sizes; private preferences are ownership-protected.

## I03 — Shared history and next-zone suggestions

**Implement**
- Build a deterministic, testable **next-zone suggestion** service using a member's combined actual injection history **across all protocols and all injections that day**.
- Consider only eligible/enabled subzones; do not assume every zone works for every injection route/product. Avoid proposing a zone when suitability is unknown; show a clear fallback rather than guessing.
- Prefer less recently used eligible zones, and recalculate suggestions after a site is recorded. Support multiple suggestions during the same day without silently reserving a site until an actual injection is logged.
- Expose the suggested readable zone and a short reason based on history, while retaining the actual site selected/recorded by the user.
- Keep precise site-reuse time thresholds, red/yellow recency cut-offs and manual override interaction **explicitly unresolved** until approved. Do not hardcode a purported medical spacing policy.

**Acceptance criteria**
- Two injections on the same day influence subsequent suggestions after logging, even if they belong to different cycles.
- Disabled or incompatible subzones are not recommended; missing eligibility results in no suggestion rather than an unsafe default.
- Suggestion logic is independent of the peptide-specific protocol and covered by deterministic unit tests.

## I04 — Daily actions and in-app pending indicator

**Implement**
- Connect actual injection statuses to the existing `/dashboard` daily schedule.
- Let members open a due entry, record completion or skip it, and see overdue/unresolved entries from previous dates.
- Display a **red dot on the in-app bell/notification icon only when an action is pending**; clear it when all relevant actions have been resolved.
- Display accurate completed, skipped, missed, pending and overdue statuses without adding a notification delivery system.

**Acceptance criteria**
- Actions and red-dot state update after logs/corrections without page state becoming inconsistent.
- Multiple same-day entries appear independently, and old unresolved entries remain reachable.
- No push notifications, email reminders, cron reminders or external notification service are added.

## I05 — Injection history and calendar integration

**Implement**
- Provide a private, date-ordered injection history showing actual peptide, recorded dose/unit, time, status and (when supplied) body subzone.
- Add useful filters (date, peptide/cycle, status) without exposing other members' records.
- Reflect actual statuses in existing **daily, weekly and monthly** calendar views; preserve differences between scheduled and administered data.
- Show recent subzone activity and allow the member to open relevant history from the body map.

**Acceptance criteria**
- Historical views reflect actual logs, including corrections, skipped/missed entries and changing cycle schedules.
- Concurrent cycles and multiple injections on one day are represented correctly.
- Tests cover cross-account isolation, filters and calendar/status consistency.

## I06 — Tests, accessibility and concise documentation

**Implement**
- Add focused unit and PostgreSQL integration tests for occurrence-to-log links, duplicate prevention, adherence, history isolation, site eligibility/selection, multiple same-day injections and dashboard pending actions.
- Review mobile and desktop flows, accessible form labels, error states and touch-friendly zone selection.
- Document the schema, status/adherence semantics, body-zone IDs and **unresolved** rotation/colour/override decisions. Reference existing docs instead of copying them.
- Verify existing migrations, seeds, local Docker and production Docker behaviour remain unaffected.

**Acceptance criteria**
- Tests, ESLint, TypeScript and production Docker build pass (or accurately report environmental limitations).
- No speculative medical thresholds, unapproved dosing schedules, automatic stock deductions or notification infrastructure have been introduced.
- The member can see today's entries, log injections, review combined site history, and access a straightforward body-zone suggestion when its eligibility is known.

## Section complete when

A member can log each planned injection (including several per day), see completion and adherence status, inspect their own combined fourteen-subzone site history, receive a history-based next-zone suggestion where eligible, and view accurate pending actions and calendar history — all without exposing private records or adding external reminders.
