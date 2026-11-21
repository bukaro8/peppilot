# PepPilot — Section 03: Peptide Library & Protocols

**Purpose:** Build the catalogue and private protocol scheduling foundation, without implementing injection administration, health journals, community posts or analytics.

**References:** `AGENTS.md` and relevant sections of `docs/PROJECT_CONTEXT.md`.
**Prerequisite:** Sections 01 and 02 complete. Reuse existing Better Auth session/authorisation helpers, Drizzle migrations, Docker setup and testing conventions.

## Working rules

Implement **one task at a time**, in order. Keep migrations versioned and seed scripts idempotent. Protect all private protocol records by account ownership. Do not invent dosing schedules, protocol templates, efficacy claims or clinical advice. Detailed protocol templates will be authored separately; this section builds the machinery to store and use them. Keep reported outcomes and community analytics for later sections.

## P01 — Peptide catalogue

**Implement**
- Model the catalogue entries with stable IDs/slugs, display names, category, optional description and active/inactive status.
- Support **16 initial entries** defined in `docs/PROJECT_CONTEXT.md`: Retatrutide, Tirzepatide, Semaglutide, Cagrilintide, BPC-157, TB-500, GHK-Cu, KLOW, Wolverine (BPC-157 + TB-500), CJC-1295 (no DAC) + Ipamorelin, Tesamorelin, MOTS-c, NAD+, SS-31, Semax and Selank.
- Record blend-to-ingredient relationships without treating ingredients as invented dosing instructions. NAD+ is a tracked compound, although not a peptide.
- Add a repeatable **reference-data** seed to the existing `db:seed` workflow. Do not seed protocol doses or the 20 demo accounts here.
- Add a simple catalogue browse/detail UI; no claims or treatment recommendations.

**Acceptance criteria**
- Catalogue is available to anonymous visitors and signed-in members.
- Re-running reference seeding does not duplicate entries or erase managed data.
- Blend ingredient relationships remain queryable, and database changes have a versioned migration.

## P02 — Versioned protocol template framework

**Implement**
- Define schema and management services for named protocol templates, versions, linked catalogue items, and structured schedule steps (e.g. dates/days/times/doses as authored data, not generated clinical guidance).
- Support draft/published/retired template states; published versions are immutable, and editing creates a new version.
- Build basic authorised admin management for templates, including validation and preview, without authoring actual template content.
- Allow members to select a published template as the starting point of a private protocol cycle.

**Acceptance criteria**
- Different versions can coexist, and an existing cycle continues referring to its original version.
- Members cannot create or edit shared templates; only authorised admins can manage them.
- No unapproved protocol schedules or doses are inserted by seed scripts.

## P03 — Member-created custom protocols

**Implement**
- Allow authenticated members to create a protocol manually or copy a published template into a private, editable cycle.
- Support one or more catalogue entries in a protocol, and a structured schedule including days, planned times, dose amount and unit. Let users enter only what they actually intend; do not supply defaults for missing doses.
- Validate dates, schedule structure and units, but do not suggest doses.
- Preserve the distinction between a custom schedule and an unchanged template-based schedule for later analytics eligibility.

**Acceptance criteria**
- One user cannot read or modify another user's private protocol.
- Members can preview their planned schedule before saving.
- A custom protocol is never silently treated as a matching public template.

## P04 — Independent cycles and schedule revisions

**Implement**
- Give each cycle its own start/end dates, status (planned/active/paused/completed/cancelled), and independent schedule history.
- Support pause/resume and controlled schedule revisions with effective dates; preserve historical schedules rather than rewriting prior events.
- Record the point at which a template-based cycle diverges from its referenced template so future aggregate calculations can retain earlier matching weeks and exclude later modified weeks.
- Repeating a protocol starts a **fully independent** cycle, without automatically linking baselines or results.

**Acceptance criteria**
- Multiple cycles may run concurrently for a user.
- Prior schedule history remains intact after edits; template/version reference and modification date are queryable.
- No dose events are marked completed merely by changing a schedule.

## P05 — Daily, weekly and monthly schedule views

**Implement**
- Derive scheduled occurrences from saved cycles, honouring start/end dates, planned times, pauses and revisions.
- Provide a **daily dashboard list** and separate **weekly** and **monthly** calendar views with multiple entries per day.
- Show planned items and relevant protocol details; leave completed/skipped/missed administration logging and the shared body map to Section 04.
- Make the view responsive and handle local dates/time zones consistently so injection dates do not drift.

**Acceptance criteria**
- Overlapping cycles appear together without overwriting each other.
- Paused/out-of-range occurrences do not appear as due; date boundaries and schedule revisions are tested.
- Calendar is usable on mobile and desktop, and each occurrence points to its parent cycle.

## P06 — Tests, review and concise documentation

**Implement**
- Add unit/integration tests for catalogue integrity, seed idempotency, template immutability, ownership, custom schedules, independent cycles, revisions, pauses and date/time-zone boundaries.
- Review responsive interfaces and keep accessible form/error states.
- Document only the new schema, commands and major design decisions; link to existing docs rather than duplicating them.

**Acceptance criteria**
- Tests, lint, TypeScript and production Docker build pass (report any environment limitation accurately).
- Repeated migrations and reference seeding are safe.
- No injection logs, vial deductions, health metrics, community analytics or fictional treatment schedules have been added as a side effect.

## Section complete when

Members can browse the 16-entry catalogue; admins can maintain **empty/unpopulated** versioned protocol-template infrastructure; members can create custom or template-based independent cycles; and today's, weekly and monthly **planned** schedules render correctly. Actual injection recording, rotation suggestions, progress analytics and community features remain for their own sections.
