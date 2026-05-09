/**
 * TrainingDay — the canonical "calendar day" used across all data sources.
 *
 * One source of truth for `YYYY-MM-DD` formatting, day arithmetic, and week
 * boundaries. Every Strava / Garmin / intervals.icu call funnels through here
 * so a date can never disagree across sources for the same training day.
 *
 * The athlete's local timezone is `ATHLETE_TZ` (env, default `UTC`). All
 * formatting and parsing is done in that zone — never the server's locale.
 *
 * See `CONTEXT.md` (TrainingDay) for the rationale.
 */

export const ATHLETE_TZ: string = process.env.ATHLETE_TZ || "UTC";

const ISO_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: ATHLETE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: ATHLETE_TZ,
  weekday: "short",
});

const WEEKDAY_OFFSET: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Format a Date as `YYYY-MM-DD` in `ATHLETE_TZ`. */
export function formatTrainingDay(d: Date): string {
  return ISO_FORMATTER.format(d);
}

/**
 * Parse a `YYYY-MM-DD` (or longer ISO) string into a Date that represents
 * midnight on that day in `ATHLETE_TZ`. Tolerant of full ISO timestamps —
 * only the first 10 chars are inspected.
 */
export function parseTrainingDay(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d);
  return new Date(utcGuess - tzOffsetAt(utcGuess));
}

/** Today, anchored at midnight in `ATHLETE_TZ`. */
export function today(): Date {
  return parseTrainingDay(formatTrainingDay(new Date()));
}

/**
 * Add `n` calendar days to `d`. DST-safe — operates on the calendar Y/M/D in
 * `ATHLETE_TZ`, not on raw milliseconds.
 */
export function addDays(d: Date, n: number): Date {
  const [y, m, day] = formatTrainingDay(d).split("-").map(Number);
  const targetMs = Date.UTC(y, m - 1, day + n);
  const targetStr = new Date(targetMs).toISOString().slice(0, 10);
  return parseTrainingDay(targetStr);
}

/** N days before `from` (default today). Equivalent to `addDays(from, -n)`. */
export function daysAgo(n: number, from: Date = today()): Date {
  return addDays(from, -n);
}

/**
 * The last `n` training days ending at `end` (inclusive), in ascending order.
 * Useful for week / month rollups.
 */
export function pastDays(n: number, end: Date = today()): Date[] {
  return Array.from({ length: n }, (_, i) => addDays(end, -(n - 1 - i)));
}

/** Monday of the week containing `d`, at midnight in `ATHLETE_TZ`. */
export function weekStart(d: Date): Date {
  const wd = WEEKDAY_FORMATTER.format(d);
  return addDays(d, -(WEEKDAY_OFFSET[wd] ?? 0));
}

/** Compare training days. Operates on Y-M-D, ignores sub-day drift. */
export function isSameTrainingDay(a: Date, b: Date): boolean {
  return formatTrainingDay(a) === formatTrainingDay(b);
}

/* -------------------------------------------------------------------------- */

/** Offset (ms) such that `utcMs + offset` is the local time in `ATHLETE_TZ`. */
function tzOffsetAt(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ATHLETE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcMs));
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  const localMs = Date.UTC(
    Number(m.year),
    Number(m.month) - 1,
    Number(m.day),
    Number(m.hour) === 24 ? 0 : Number(m.hour),
    Number(m.minute),
    Number(m.second)
  );
  return localMs - utcMs;
}
