# Catalogue and protocol workflows

Section 03 provides the planning layer. Injection records build on that schedule without recommending doses, deducting inventory, or collecting health measurements.

## Available workflows

- `/catalogue` exposes the 16 seeded catalogue entries and approved blend ingredients. Reference data is applied idempotently with `npm run db:seed`; see [Database workflows](DATABASE_WORKFLOWS.md).
- `/templates` exposes published template versions read-only. Administrators manage drafts under `/admin/templates`. Editing published content creates a new version; the published record remains unchanged.
- `/protocols` contains private member drafts created manually or copied from a published template. Exact copies remain classified as template-matching; schedule or duration changes retain provenance but become customised.
- `/cycles` starts independent cycle snapshots from saved protocols. Pauses and effective-dated schedule revisions are appended without rewriting earlier history.
- `/dashboard`, `/calendar/week`, and `/calendar/month` derive planned occurrences from active and paused cycles. Events are calculated on demand rather than stored as duplicate rows.
- Scheduled dashboard occurrences can be recorded as completed, skipped, or missed. Each private record snapshots its planned dose separately from any completed dose, and later corrections retain an audit entry.

All private protocol, cycle, and calendar queries require a verified session and scope database access to the member ID. Administrator status does not grant access to another member's private protocol records. See [Authentication and authorisation](AUTHENTICATION.md).

## Schedule conventions

Schedule steps support daily, selected-weekday, and every-N-days frequencies, with authored dose, unit, optional local time, and inclusive cycle-day bounds. Calendar dates use `YYYY-MM-DD` and UTC-only date arithmetic to avoid shifting a member's local calendar day; authored times remain wall-clock values.

A pause suppresses occurrences from its pause date up to, but not including, its resume date. For any calendar date, the latest revision whose effective date is on or before that date is used. Earlier dates therefore continue to use the historical revision.

### Make an active cycle ongoing

Open the active cycle → **Revise schedule** → **Make this active cycle ongoing**. Choose the effective date and review the complete schedule before saving. Each compound's final stage continues without an end day; earlier stages keep their bounds. The active cycle has no planned end after saving, while the source draft, older revisions and injection logs remain unchanged. Dates after a former end but before the new effective date remain unscheduled, including when the effective date is in the future.

Migration `0019_flowery_tony_stark.sql` adds a nullable prior-end date to revision records for this audit and calendar behavior. Existing rows remain unchanged apart from the new null field. Conversion requires an active, owner-scoped cycle and an effective date after the latest revision and no earlier than the latest interruption. Completed and cancelled cycles cannot be converted.

## Injection adherence

Each scheduled occurrence can have at most one injection record. Completed records require an actual date, time, positive dose, and unit; skipped and missed records intentionally have no actual administration values. Updates may change the outcome or actual values, but never rewrite the scheduled snapshot.

Completed records may also include one optional actual injection site selected from the fixed five-region, fourteen-subzone front/rear body map. Site identifiers remain stable in storage, while interfaces show a readable label such as `Zone 1 — Abdomen · Left lower`. Skipped and missed records never retain a site.

### Injection storage

- `injection_record` is private to `owner_user_id`, has one row per scheduled occurrence, and stores immutable scheduled identifiers/dose/date alongside the current status and optional actual administration values.
- `injection_record_history` receives the previous mutable values before every correction. Corrections do not overwrite scheduled values or remove the audit trail.
- `member_injection_site_preference` stores each member's disabled subzones. Rotation and history queries are owner-scoped independently of cycle ownership checks.
- `/injections` searches and filters the member's current records across cycles. Calendar cards continue to use the scheduled date while showing corrected actual values, so a correction cannot move or duplicate its planned occurrence.

The stable subzone IDs are:

```text
abdomen_left_upper       abdomen_left_lower
abdomen_right_upper      abdomen_right_lower
love_handle_left         love_handle_right
thigh_left_upper         thigh_left_lower
thigh_right_upper        thigh_right_lower
upper_arm_left           upper_arm_right
upper_buttock_left       upper_buttock_right
```

### Rotation reference

The next-site reference uses the member's completed injection records with actual sites across every cycle and peptide. Disabled subzones are excluded. It deterministically prefers a never-used site, then the least recently used site, then the site with fewer recorded uses, and finally the stable catalogue order. A site only affects the next suggestion after an injection is saved; viewing a suggestion does not reserve it. Members may always record a different actual site.

Map colours describe history only: red means used on the reference date, yellow means used one or two calendar days earlier, green marks the current history-based suggestion, and neutral means no activity in that window. These are interface cut-offs, not medical spacing, suitability, or safety guidance. When no enabled subzone is available, no suggestion is made.

Route/product eligibility, clinical spacing thresholds, and whether members need a separate override reason remain unresolved product decisions. Until approved, the application treats enabled subzones as member preferences, permits a manual site choice, and presents colour/suggestion output only as a history reference.

### Daily actions

The dashboard groups the selected local date's scheduled injections separately from earlier unlogged occurrences. An unrecorded item today is pending; an earlier unrecorded item is overdue. Completed, skipped, and explicitly missed records are resolved. The in-app bell shows a red dot only while pending or overdue actions remain. These actions are derived from the calendar and injection records on demand—no reminder queue, background worker, or duplicate event table is used.

Cycle adherence is completed occurrences divided by applicable scheduled occurrences. Prior calendar days are applicable even when still unrecorded, while future days are excluded. On the current day, resolved occurrences are included and time-aware callers may also include occurrences whose scheduled time has passed; untimed unresolved occurrences are not marked overdue prematurely. Pauses suppress planned occurrences, and cancelled cycles do not produce an adherence result.

## Development checks

Apply committed migrations and the repeatable catalogue seed before integration tests:

```sh
npm run db:migrate
npm run db:seed
npm run test:integration
```

For Docker networking, host execution, and production deployment commands, use the existing [local development](LOCAL_DEVELOPMENT.md) and [Coolify deployment](COOLIFY_DEPLOYMENT.md) guides.
