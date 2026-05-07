export type ZoneKey = "zone1" | "zone2" | "zone3" | "zone4" | "zone5";

const DEFAULT_HR_MAX_BPM = 190;

function readMaxHr(): number {
  const raw = process.env.HR_MAX_BPM;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HR_MAX_BPM;
}

function computeZones(maxHr: number): Record<ZoneKey, [number, number]> {
  const pct = (p: number) => Math.round(maxHr * p);
  return {
    zone1: [0, pct(0.6) - 1],
    zone2: [pct(0.6), pct(0.7) - 1],
    zone3: [pct(0.7), pct(0.8) - 1],
    zone4: [pct(0.8), pct(0.9) - 1],
    zone5: [pct(0.9), 999],
  };
}

export const ZONES: Record<ZoneKey, [number, number]> = computeZones(readMaxHr());

const ZONE_KEYS: ZoneKey[] = ["zone1", "zone2", "zone3", "zone4", "zone5"];

function zoneOf(hr: number): ZoneKey | null {
  for (const k of ZONE_KEYS) {
    const [lo, hi] = ZONES[k];
    if (hr >= lo && hr <= hi) return k;
  }
  return null;
}

export type ZoneSeconds = {
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
};

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
