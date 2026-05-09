/**
 * Zone — heart-rate training zones (Z1 recovery → Z5 VO2).
 *
 * Single source of truth for zone bounds, the canonical `ZoneSeconds` shape,
 * the universal Z1–Z5 colour palette, short labels, and the calculations that
 * turn a stream into time-in-zone or HR-at-power. Components import from
 * here — there are no parallel `Zones` types or hex maps elsewhere.
 *
 * See `CONTEXT.md` (Zone) for rationale and the single-discipline caveat.
 */

export type ZoneKey = "zone1" | "zone2" | "zone3" | "zone4" | "zone5";

export const ZONE_KEYS: ZoneKey[] = ["zone1", "zone2", "zone3", "zone4", "zone5"];

export type ZoneBounds = Record<ZoneKey, [number, number]>;

const DEFAULT_HR_MAX_BPM = 190;

function readMaxHr(): number {
  const raw = process.env.HR_MAX_BPM;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HR_MAX_BPM;
}

/**
 * Build zone bounds for an explicit max-HR. Used internally to derive
 * `ZONES`; exported as an escape hatch for hypothetical per-athlete profiles.
 * Adding a real per-athlete model warrants an ADR first.
 */
export function zonesFor(maxHr: number): ZoneBounds {
  const pct = (p: number) => Math.round(maxHr * p);
  return {
    zone1: [0, pct(0.6) - 1],
    zone2: [pct(0.6), pct(0.7) - 1],
    zone3: [pct(0.7), pct(0.8) - 1],
    zone4: [pct(0.8), pct(0.9) - 1],
    zone5: [pct(0.9), 999],
  };
}

/** Zone bounds for the configured `HR_MAX_BPM`. */
export const ZONES: ZoneBounds = zonesFor(readMaxHr());

/** Hex colour for each zone — the universal training palette. */
export const ZONE_COLORS: Record<ZoneKey, string> = {
  zone1: "#3b82f6",
  zone2: "#22c55e",
  zone3: "#eab308",
  zone4: "#f97316",
  zone5: "#ef4444",
};

/** Short human label for each zone. */
export const ZONE_LABELS: Record<ZoneKey, string> = {
  zone1: "Z1 Recovery",
  zone2: "Z2 Endurance",
  zone3: "Z3 Tempo",
  zone4: "Z4 Threshold",
  zone5: "Z5 VO2",
};

/** Which zone does this HR fall into, given `bounds` (default `ZONES`)? */
export function zoneOf(hr: number, bounds: ZoneBounds = ZONES): ZoneKey | null {
  for (const k of ZONE_KEYS) {
    const [lo, hi] = bounds[k];
    if (hr >= lo && hr <= hi) return k;
  }
  return null;
}

export type ZoneSeconds = Record<ZoneKey, number>;

export function emptyZoneSeconds(): ZoneSeconds {
  return { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 };
}

export function calcZoneDistribution(hr: number[], time: number[]): ZoneSeconds {
  const out = emptyZoneSeconds();
  if (!hr.length || hr.length !== time.length) return out;
  for (let i = 1; i < hr.length; i++) {
    const dt = time[i] - time[i - 1];
    if (dt <= 0) continue;
    const z = zoneOf(hr[i]);
    if (z) out[z] += dt;
  }
  return out;
}

export function totalSeconds(zs: ZoneSeconds): number {
  return ZONE_KEYS.reduce((s, k) => s + zs[k], 0);
}

export function avgHRAtPower(
  streams: { hr?: number[]; watts?: number[] },
  target: number,
  tolerance = 5
): number | null {
  const { hr, watts } = streams;
  if (!hr || !watts || hr.length !== watts.length || hr.length === 0) return null;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < hr.length; i++) {
    if (Math.abs(watts[i] - target) <= tolerance && hr[i] > 0) {
      sum += hr[i];
      count++;
    }
  }
  if (count < 30) return null;
  return Math.round(sum / count);
}
