# Health journal

PepPilot stores measurements, daily check-ins and symptoms in one private, owner-scoped journal. Entries are independent of protocols, so a record is entered once and can be associated with every cycle active on its date. `/journal` provides chronological date, type and metric filters; each entry links to its correction or deletion screen.

## Standard records

- Measurements use stable metric IDs and canonical units: weight and muscle mass in `kg`, circumferences in `cm`, and body fat in `percent`. The original entered value and unit are retained for display.
- Check-in questions use stable IDs and whole-number scores from 1–10, where higher means better. Skipped answers remain missing rather than being filled.
- Symptoms use stable identifiers where possible, a 1–10 severity scale, optional timing/notes, and an optional custom description. Symptoms are not attributed to a peptide.

All records are private. Public profiles and catalogue pages do not query journal tables, and every read/write is scoped to the authenticated owner.

## Cycle goals and baselines

Each cycle selects its own standard measurement or check-in metrics and may store an optional personal target. Repeated and overlapping cycles remain independent. Tesamorelin cycles show waist circumference as a suggested focus.

A goal baseline is the latest matching journal observation in the seven calendar days before the cycle start date, inclusive of the seventh prior day and excluding the start date. No entry produces `missing`; a zero or non-finite value is `unsuitable` for future percentage calculations. PepPilot does not estimate either case.

Saving goals stores the source identifier, date, value, unit and eligibility as a snapshot. Explicitly resaving goals on an active cycle refreshes that snapshot. Completed and cancelled cycle goals are read-only, so later journal corrections cannot silently change historical results. Percentage calculations, charts, reports and community aggregation are intentionally outside Section 05.
