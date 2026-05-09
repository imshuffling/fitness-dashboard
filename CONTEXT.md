# Domain glossary

Names used across `lib/`, `app/`, `components/`. Keep in sync with code.

## Zone

A heart-rate training zone, derived from `HR_MAX_BPM` (env, default 190). Five
zones: `zone1` (recovery, <60% max), `zone2` (endurance, 60–70%), `zone3`
(tempo, 70–80%), `zone4` (threshold, 80–90%), `zone5` (VO2, ≥90%).

- `ZoneKey` — `"zone1" | "zone2" | "zone3" | "zone4" | "zone5"`.
- `ZoneSeconds` — minutes-in-zone tally for a single activity or window.
- Bounds, palette (hex), short labels, and `zoneOf(hr)` all live in
  `lib/zones.ts`. Components import; no local redefinition.

**Single-discipline caveat.** Zones are computed against one global max-HR.
Cycling and running share the same bands. If a user runs and rides with
materially different LTHRs the running zones will be off — accepted for now.

**Per-athlete max-HR** is not supported. `zonesFor(maxHr)` exists as an escape
hatch so a future per-athlete profile can build zones without forking
`lib/zones.ts`. Add an ADR before introducing per-athlete max in earnest.

## TrainingDay

A calendar day in the **athlete's local timezone** (`ATHLETE_TZ` env, default
`UTC`). Canonical wire format `YYYY-MM-DD`. Used as a cache key, an API path
segment (Garmin), and the join key when stitching Strava + Garmin + intervals.icu.

- All ISO formatting, day arithmetic, and range building goes through
  `lib/trainingDay.ts`. No inline `toISOString().slice(0, 10)`.
- Week starts Monday (locked — matches intervals.icu and Strava conventions).
- Parsing `YYYY-MM-DD` returns a `Date` at local midnight in `ATHLETE_TZ`,
  so `getTime()` arithmetic is safe.

**Why a module.** `toISOString()` returns UTC; for a European athlete riding
after midnight local, the UTC slice can disagree with Garmin's training day.
Funnelling every source through one module pins the policy in one place.

## EnrichedActivity (planned, not yet a module)

A Strava activity plus stream-derived `ZoneSeconds` and average-HR-at-power.
Currently lives inline in `lib/health.ts:enrichActivity`. Candidate for the
"Activity intake" deepening (#2).

## Wellness (planned, not yet a module)

The Garmin daily snapshot composite — daily summary, sleep stages, stress,
body battery, HRV, readiness, pulse-ox. Currently lives in `lib/garmin.ts`
as `GarminDashboard`. Candidate for the "Garmin grouped seams" deepening (#1).
