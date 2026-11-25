# Peptide Tracker — Project Context and Confirmed Product Decisions

**Status:** Planning baseline  
**Updated:** 1 November 2026  
**Purpose:** Shared context for planning a multi-user peptide tracking website and installable Progressive Web App (PWA). This document records decisions agreed in discussion. It is not a protocol dosing guide.

## 1. Product vision

Build a **multi-user website and installable PWA** with two equally important pillars:

1. **Protocol management:** create and follow peptide schedules, see today's injections, log completed/skipped/missed events, review a weekly/monthly calendar, and track injection sites across all protocols.
2. **Effectiveness analysis:** maintain one private health journal, collect adaptive peptide-specific outcome metrics, display percentage-change progress, and compare individual results against community medians for matching protocol templates.

Add a **publicly browsable, community-first website** with public member usernames, searchable posts, optional sharing of personal progress reports, and aggregated protocol statistics from participating users' structured tracking data.

**Product principle:** community-reported experiences and practical usability take precedence over building a scientific research platform. Avoid unnecessary complexity in comparing combinations of peptides. Charts describe users' recorded experiences; they do not establish causation.

## 2. Confirmed platform and account behaviour

- Works as both a regular responsive website and an installable PWA.
- Multi-user accounts with strong separation of each member's private records.
- **Passwordless login** via email code or magic link; no password required.
- Every member chooses a **unique public username**, used for community posts and comments. Personal emails and private health records are not displayed publicly.
- The public can browse the community, published results, posts, peptide pages, statistics, and public profiles without registering. Registration is required to publish, comment, or like.
- Private journals, protocols, and measurements are **not automatically published as individual reports**.
- Members may explicitly publish selected reports or write their own posts; preview/approval is required for publishing.
- During account creation, members can **opt out of anonymous aggregate statistics**. Participation defaults on with clear explanation; opt-out must remain available in settings. Opting out excludes their data from future aggregate calculations.
- Public aggregate statistics expose no usernames or individual source records. The backend accesses private structured records to calculate and publish only permitted aggregates.
- Moderation: posts/comments publish immediately unless caught by basic spam filtering; members can report content; admins can review, hide/remove and suspend accounts.

## 3. Peptide catalogue and community-first library

**Initial proposed catalogue: 16 entries** (confirmed direction; final detailed catalogue metadata and protocol templates are not drafted here):

**Weight management**
1. Retatrutide
2. Tirzepatide
3. Semaglutide
4. Cagrilintide

**Healing / skin / recovery**
5. BPC-157
6. TB-500
7. GHK-Cu
8. KLOW blend
9. Wolverine blend (BPC-157 + TB-500)

**Growth / body composition**
10. CJC-1295 (no DAC) + Ipamorelin blend
11. Tesamorelin — track **waist reduction** as its main community outcome in this product context

**Metabolic / wellness**
12. MOTS-c
13. NAD+ (tracked compound though not itself a peptide)
14. SS-31

**Cognitive**
15. Semax
16. Selank

Peptide pages are **community-focused**, with shared experiences, searchable/tagged posts, member reports, protocol listings and aggregate charts where sufficient data exists. Published research/reference material can be secondary rather than the primary purpose of these pages. Peptide-specific questions and outcome metrics are used to enable consistent charts.

Blends should retain their ingredient identities in the data model. **Do not create protocol templates or dosing instructions in this document; they will be developed in a separate thread.**

## 4. Protocols and lifecycle

- **Hybrid protocol creation:** members can create custom protocols or start from editable templates.
- Support multiple concurrently active protocols and multiple injections on the same day.
- Record protocol start, end and pause dates; scheduled injections and actual administration history must be distinct records.
- **Template/version matching** is needed for protocol-specific community aggregate charts.
- Custom and modified protocols remain eligible for **personal charts and optional individual community posts** but not for later weeks of template-specific aggregate results.
- If someone modifies a template protocol after following it, **earlier matching weeks remain** in its template aggregate, while subsequent modified weeks are excluded.
- Both **active and completed** protocol cycles contribute weekly results when otherwise eligible.
- Every new/repeated/extended cycle is **independent**, with its own dates, baseline, records and final report. Previous cycles remain accessible in the account but are not automatically linked as a continuous cycle.
- Explicitly converting an existing active cycle to **ongoing** is an effective-dated schedule revision, not a new cycle. Preserve recorded injections, earlier revisions and any gap after its former planned end; continue the final stage of each compound from the chosen effective date without changing the source draft.
- Do not compare or segment by every possible combination of overlapping peptides. A member following a matching Retatrutide template can contribute to that template's statistics even if they also follow other peptides. No combined-peptide warnings/counts are required in public charts.

## 5. Daily tracking, calendar and reminders

- Dashboard shows **today's scheduled injections**, with dose and status.
- Separate **weekly and monthly calendar views** show scheduled and historical injections.
- Injection log records **actual date, time and dose**, as well as completed/skipped/missed status and cycle adherence percentage.
- Unlogged previous injections remain visible as overdue until resolved according to the app's status rules.
- **In-app reminders only:** a red dot on the notification/bell icon signals pending actions and disappears when no action remains. No external push/email reminder service or background notification worker in the current scope.
- Support a quick completion/skip action, with ability to record what actually happened rather than assuming it matched the schedule.

## 6. Shared health journal and adaptive check-in

- One **shared private health journal**, with metrics entered once and reused across protocol outcome reports.
- Each protocol can have its own goals and relevant metrics, but users do not need to duplicate entries between active protocols.
- **Adaptive daily check-in:** short default questions plus protocol-specific questions chosen from relevant metric sets. Members can customise/skip metrics; aim for a low-friction daily experience.
- Support objective metrics (weight, waist/body measurements, possibly blood tests where relevant) and subjective metrics (sleep quality, energy, recovery, appetite, symptoms, pain, focus etc.).
- In particular, **Tesamorelin tracking emphasises waist measurements** rather than assuming muscle growth is its principal goal.
- Custom metrics and goals may be supported, with standardised metric definitions used for aggregate comparisons.
- User-entered actual measurements remain private and are used for percentage calculations; **all personal and community progress charts display percentages only**, rather than raw kg/cm measurements.
- A metric with zero or otherwise unsuitable baseline needs a defined calculation rule; do not silently divide by zero or fabricate a percentage.

## 7. Personal charts and cycle reports

- **One progress chart per selected metric**, not multiple disparate metrics overlaid on one chart.
- Each chart shows **the member's percentage change and the matching protocol's community median percentage change together**, where a community statistic is available.
- Automatically generate a **private effectiveness report at completion** of a protocol cycle, including progress by goal/metric, injection history/adherence and relevant charts.
- Members can review and **optionally publish** selected details in a community post; publishing is never automatic.
- If matching community data is unavailable, the private progress chart still works without its community overlay.

## 8. Community content and results explorer

**Community features in current scope**
- Public member profiles using usernames.
- Manual posts and optional app-generated interactive progress reports.
- Likes, comments, peptide tags and searchable topics/posts.
- Community-first peptide pages with associated reports and discussions.
- Public **Community Results Explorer:** individual published reports, interactive protocol comparisons and aggregate statistics; search/filter by peptide, protocol template and selected metric.
- Do not add private messaging, following, or separate discussion groups to the current scope.

**Two distinct contributions**
1. **Published content** is user-approved and linked to the public username; members can write stories even without structured tracking data.
2. **Aggregate data** comes from eligible private structured tracking records of accounts that have not opted out. Publishing a post is **not** necessary for aggregate participation. Aggregates do not expose individuals.

**Strict aggregate rules agreed**
- Group by **peptide → named protocol template/version → metric → protocol week**.
- Only matching template weeks contribute; custom schedules and modified later weeks do not.
- Do not track combinations of overlapping peptides for comparison eligibility.
- Protocol week = a **seven-day window from that cycle's start date** (not Monday–Sunday calendar weeks).
- Each member contributes **one weekly value** for each metric, calculated as the mean of that member's recorded observations during that week. Missing weeks are **not interpolated or estimated**.
- Baseline = **latest recorded value within the seven days before that cycle begins**. If absent, no percentage result is calculated for that metric until there is a valid baseline under the agreed rule; do not invent a baseline retroactively.
- Community charts show **median of contributors' weekly percentage changes from baseline** (not mean across contributors).
- At least **10 eligible contributors per displayed metric/week data point**. Otherwise show no public aggregate for that point (gap or insufficient-data state).
- Both active and completed cycle data may contribute.
- Community aggregates **recalculate daily**, and updated results must reflect opt-outs.
- Public charts show **percentage changes and contributor counts**, not raw personal measurements.
- Personal vs community overlays use compatible metric definitions, matching template/version and matching week.
- These are **self-reported observational experiences**, not independently verified clinical findings.

**Important implementation interpretation:** an individual member's weekly mean is calculated first; the published statistic is the **median across eligible members' percentage changes**, not the mean of all raw readings pooled together.

## 9. Injection body map and site history — high-priority current feature

The map is primarily a **visual reference**. The app should suggest a readable zone name such as **“Zone 1 — Abdomen · Left lower”** rather than requiring users to place a tiny pin.

**Five regions, 14 subzones (confirmed):**

| Zone | Region | Subzones | Count |
|---|---|---|---:|
| 1 | Abdomen | Left upper, left lower, right upper, right lower | 4 |
| 2 | Love handles / flanks | Left, right | 2 |
| 3 | Thighs | Left upper, left lower, right upper, right lower (within suitable thigh region) | 4 |
| 4 | Upper arms | Left, right (back of upper arm) | 2 |
| 5 | Upper buttocks | Left, right (upper outer) | 2 |
| | **Total** | | **14** |

- Use a front/back anatomical illustration with colour-coded visual history: **red = recently used; yellow = used earlier (e.g. two days ago); green = suggested next suitable zone**. The precise time thresholds have not yet been finalised; colours should not be treated as a medical safety guarantee.
- Each injection log records the **actual zone/subzone used**, the peptide and date/time.
- The suggestion logic consults **one combined injection-site history across all protocols**, not a separate site history per peptide. This matters when users have multiple injections on the same day.
- Suggestions should update once an injection is recorded, so another scheduled injection considers the newly used site.
- Users can disable sites they do not use. Appropriate sites depend on the product/route; the map should not assume every zone is suitable for every injection.
- **Not yet explicitly decided:** whether the user may manually override the suggested location (recommended), exact colour/time thresholds, or the final selection/confirmation interaction. Do not mark these as confirmed decisions.
- A sample infographic has been generated to illustrate the proposed region layout; it is a concept, not a final reusable UI asset.

## 10. Demo / seed data

- Seed **20 clearly fictional accounts**, each with a unique public username/profile, at least one post, and at least one protocol.
- Target **30+ total protocols** and **25+ posts** across the seeded community.
- Include several months of coherent, genuinely varied **synthetic** logs, measurements, check-ins, symptoms and progress histories, including mixed outcomes, incomplete check-ins and missed injections. Do **not** make everybody improve in an implausibly uniform way.
- Ensure realistic variation without falsely representing the data as real patient reports.
- Explicitly label demo profiles/results and **exclude seed users from genuine public community aggregates after launch**. A distinct demo mode or demo-only environment can show full populated statistics during development.
- Seed histories should exercise template matching, independent cycles, missing baselines, weekly gaps, and the 10-contributor threshold.

## 11. Current product boundaries and deferred choices

- **Do not include automatic vial inventory management in current requirements.** Inventory deductions, stock calculations and reconstitution-driven vial workflows were explicitly set aside while simplifying the first release.
- Do not draft any peptide protocol templates or dosage guidance here; that work belongs in another thread.
- No push notifications, email reminders or reminder worker.
- No private messaging, follow system or separate community groups.
- No advanced combination-peptide analytics or scientific-style causal attribution.
- Do not add features simply because other market apps have them; this file reflects what has been actually chosen.

## 12. Technical direction (suggested, not a confirmed final architecture)

The user has existing Next.js/PostgreSQL/Docker/Coolify development experience. An appropriate **proposal**, subject to technical planning, is:

- Next.js + TypeScript + Tailwind CSS + shadcn/ui for responsive website/PWA.
- PostgreSQL + Drizzle ORM for users, protocols, templates, actual injection logs, metric observations, contributions, public posts and aggregate snapshots.
- Passwordless email authentication and secure server-side authorisation.
- Daily scheduled aggregate recomputation in the deployment infrastructure.
- Docker/Coolify deployment.
- Strong private/public separation: published report snapshots versus private journal records; aggregate endpoints return no underlying personal rows.

## 13. Suggested project decomposition (planning, not yet an approved task list)

1. Product rules and UX flows: onboarding, private/public boundaries, publishing and dashboards.
2. Data model and authentication: accounts, usernames, preferences, template/version data, independent cycles, health observations and permissions.
3. Protocol calendar and injection logs: schedule generator, today/weekly/monthly views, adherence and in-app pending actions.
4. Injection-site map: 14-subzone reference map, combined history and suggestions.
5. Health journal and adaptive check-ins: metric catalogue, goals, observations and baseline logic.
6. Personal analytics and cycle completion reports: percentage charting and report generation.
7. Community website: searchable posts, tags, likes/comments, peptide pages and moderated publication.
8. Aggregate statistics and Results Explorer: strict template/week grouping, opt-outs, privacy thresholds, daily calculation and community overlays.
9. Demo data, tests and deployment: 20 seeded accounts, synthetic histories, validation, PWA and Coolify release.

## 14. Open implementation questions to decide during section/task planning

- Injection-site rotation: selection/override behaviour, precise colour/recency windows, safe region eligibility by route and available regions.
- Registration opt-out wording and precise consent/privacy handling, including how aggregate removal is applied to cached public statistics.
- Treatment-template change semantics where a change occurs mid-week (how to treat partially matching weeks).
- How to present metrics with zero, negative or inappropriate percentage baselines (especially rating scales).
- Final catalogue and community metric questions for each of the 16 entries; actual named schedule templates will be authored separately.
- What to show in demo statistics where fewer than 10 genuine contributors exist.
- Moderation permissions, spam controls and reporting workflow details.
- Final API/database structure, deployment and testing design.

---

**Workflow agreed for the project:** first establish this context document; next review and divide the project into sections; then create actionable tasks per section. Keep confirmed requirements distinct from proposals and unresolved decisions.
