# PepPilot — Section 05: Health Journal

**Purpose:** Build one private health journal shared across all of a member's protocols, with consistent measurements and low-friction, adaptive check-ins. This section collects data for later effectiveness analysis; it does **not** implement charts, community statistics or public publishing.

**References:** `AGENTS.md`, relevant sections of `docs/PROJECT_CONTEXT.md`, and the existing authentication, catalogue, protocols/cycles and injection infrastructure.

**Prerequisite:** Sections 01–04 complete. Implement **one task at a time** (H01–H06), with owner-scoped data access, versioned Drizzle migrations, and unit/PostgreSQL integration tests. Preserve existing data and workflows.

## Shared principles

- **Enter once, reuse across cycles:** Measurements belong to the member's shared journal, not duplicated into each active protocol.
- **Standardised metrics:** Use stable identifiers, units, question wording, rating direction and scales for metrics intended to support future aggregate comparisons. Permit member customisation without silently treating different definitions as identical.
- **Dates matter:** Preserve observation timestamp, member's local observation date/time zone as needed, and creation/update metadata. Corrections should not quietly rewrite protocol/injection history.
- **Private by default:** Never expose journal entries through public profiles or catalogue routes. Administrators have no implicit access to private health data.
- **Do not fabricate measurements:** No assumed values for missing check-ins or retrospective baselines. Respect the member's choice to skip questions.
- **Keep scope narrow:** No analytics charts, final cycle reports, community aggregation, seeded demo histories, prescribed doses, stock management, external health integrations or push/email reminders in this section.

## H01 — Structured health measurements

**Implement**
- Define an extensible, typed metric catalogue with stable keys, labels, canonical units, allowed values and validation. Start with **weight, waist circumference and other member-selected body measurements**; prepare support for standard rating metrics without implementing their check-in interface yet.
- Store time-stamped observations in a member-owned journal. Support multiple readings on different days and intentional corrections, with no duplicate records caused by repeated form submissions.
- Provide simple authenticated create/read/edit/delete operations for observations, with server-side validation and account isolation.
- Allow explicit unit selection/entry where useful (e.g. kg/lb, cm/in), converting to canonical storage values rather than mixing units silently. Keep original user input/display preference where appropriate.
- Preserve source information (manual entry initially) and distinguish missing from zero.

**Acceptance criteria**
- Multiple measurements are stored accurately, including conversions, decimals and dates.
- One observation may be reused by several concurrent cycles without copying it.
- Cross-account requests and invalid metric values are rejected; migrations are repeatable.

## H02 — Adaptive daily check-ins

**Implement**
- Create a compact shared daily check-in with initial standard rating metrics: **sleep quality, energy and recovery**. Add protocol-focused questions for **appetite/weight management**, **waist/body composition**, **pain/mobility/recovery**, and **focus/stress** where relevant to the selected catalogue entries and active cycles.
- Define stable question IDs, answer types, rating scales, direction and applicability; keep wording neutral (tracking experiences, not promising effects).
- Determine applicable questions from **all active cycles** while deduplicating shared questions. Provide user preferences to hide/enable optional questions and permit skipping without inventing values.
- Record answers into the shared journal once per applicable check-in/question/date; support editing and avoid duplicate check-ins from simultaneous protocols.
- Keep default completion short, accessible and mobile-friendly. Do not introduce a complicated form builder.

**Acceptance criteria**
- Concurrent protocols produce one consolidated check-in, not multiple copies of the same question.
- User preferences and skipped answers persist; corrected responses remain appropriately scoped.
- Standard question identifiers/scales are validated, and account isolation is tested.

## H03 — Symptoms and side-effect diary

**Implement**
- Allow dated symptoms/side effects with a standard symptom identifier where applicable, **severity on a documented consistent scale**, optional free-text notes and optional start/end timing.
- Permit multiple symptoms on one day, editing/correction, and a clear *no symptoms reported* versus *no entry made* distinction.
- Support a short optional symptom prompt in daily check-ins without forcing a symptom record every day.
- Keep symptoms private and connected to the member's shared journal; do not infer which peptide caused a symptom.

**Acceptance criteria**
- Multiple symptom records, severity validation, missing-vs-none semantics and corrections behave consistently.
- Notes cannot be exposed in public profiles or to other accounts.
- Unit and integration tests cover access control and typical edge cases.

## H04 — Protocol goals and baseline eligibility

**Implement**
- Allow each independent cycle to select outcome metrics and optional personal goals using stable standard metric definitions (including **waist as a primary suggested tracking focus for Tesamorelin**).
- Allow members to customise/disable goals without changing the global journal or another cycle's settings.
- Implement the confirmed baseline rule: **latest recorded observation within the seven days before cycle start**, per metric. Use the cycle's local start date consistently; do not use a reading collected after starting as a substitute.
- Expose reusable server-side baseline lookup and **eligibility/status** for future analytics: valid baseline, missing baseline, or unsuitable baseline for percentage calculations (e.g. zero).
- Preserve cycle independence: a repeated protocol has its own baseline and goals. Do not create public statistics or progress charts here.

**Acceptance criteria**
- Date-boundary and competing-observation cases select the correct baseline.
- Missing/zero baselines yield an explicit unavailable status, not a fabricated percentage or division by zero.
- Goal management and baseline lookups are member-scoped and cycle-independent.

## H05 — Journal history and member interfaces

**Implement**
- Build a responsive private **Health Journal** view to review recorded measurements, check-ins and symptoms; provide useful date and metric filters.
- Provide straightforward editing/correction and clear states for empty, skipped and completed entries.
- Connect daily check-in access from the member dashboard without changing existing injection pending-dot behaviour; a check-in must not be conflated with an overdue injection action.
- Where useful, display a cycle's selected goals and baseline availability as **text/status only**, not analytical charts.
- Use existing UI primitives, server-side services and authorisation patterns; minimise dependencies.

**Acceptance criteria**
- All journal entry types can be reached and corrected on narrow mobile and desktop layouts.
- Filtering, date localisation, permission checks and empty states work.
- Injection tracking, calendar and dashboard pending indicators remain unaffected.

## H06 — Tests, quality and concise documentation

**Implement**
- Review the full Section 05 data flow: metric definitions, unit conversion, adaptive question selection/deduplication, symptom entry, cycle-specific goals and seven-day baseline selection.
- Add focused tests only for uncovered cases, including multiple active protocols, missing dates, different time zones, duplicate submissions, account isolation and invalid/zero baselines.
- Review mobile accessibility, keyboard controls, validation and error states; verify authenticated journal workflows in a browser where available.
- Document canonical metrics/scales, recording semantics, privacy, baseline lookup and any unresolved decisions in a concise health-journal guide; reference existing documentation rather than copying it.
- Check all current automated tests, ESLint, TypeScript, migrations and production Docker build.

**Acceptance criteria**
- Existing protocol, injection and privacy flows remain functional.
- No analytics engine, aggregate computation, publication mechanism or unrelated scope is introduced.
- Report verified tests separately from unverified/browser-only checks and technical debt.

## Section complete when

Members can record objective measurements, complete a short protocol-aware daily check-in, log symptoms, select independent cycle goals, and review or correct entries in **one private journal**. Valid pre-cycle baselines can be queried consistently for later percentage-based effectiveness analysis.
