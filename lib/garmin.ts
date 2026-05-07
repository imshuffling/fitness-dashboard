import { GarminConnect } from "garmin-connect";
import { loadGarminTokens, saveGarminTokens } from "./garminTokens";
import { cacheGetOrSet } from "./kv";

let _client: GarminConnect | null = null;
let _displayName: string | null = null;

async function getClient(): Promise<GarminConnect> {
  if (_client) return _client;
  const tokens = await loadGarminTokens();
  if (!tokens) throw new Error("Garmin not connected");
  const client = new GarminConnect({ username: "", password: "" });
  client.loadToken(tokens.oauth1, tokens.oauth2);
  _client = client;
  return client;
}

/**
 * Many Garmin endpoints accept the user's displayName in the path. Cache it
 * once per cold start to avoid an extra round-trip per call.
 */
async function displayName(c: GarminConnect): Promise<string | null> {
  if (_displayName) return _displayName;
  try {
    const profile = (await c.getUserProfile()) as { displayName?: string };
    _displayName = profile?.displayName ?? null;
  } catch {
    _displayName = null;
  }
  return _displayName;
}

/** Persist any token refresh that happened during use. */
async function persist(client: GarminConnect): Promise<void> {
  try {
    const fresh = client.exportToken();
    if (fresh?.oauth1 && fresh?.oauth2) await saveGarminTokens(fresh);
  } catch {
    // ignore
  }
}

export async function loginAndSaveGarmin(username: string, password: string): Promise<void> {
  const client = new GarminConnect({ username, password });
  await client.login(username, password);
  const tokens = client.exportToken();
  await saveGarminTokens(tokens);
  _client = client;
}

async function getGarminUserProfile() {
  const c = await getClient();
  const profile = await c.getUserProfile();
  await persist(c);
  return profile;
}

async function getGarminSteps(date: Date) {
  const c = await getClient();
  const steps = await c.getSteps(date);
  await persist(c);
  return steps;
}

async function getGarminSleep(date: Date) {
  const c = await getClient();
  const sleep = await c.getSleepData(date);
  await persist(c);
  return sleep;
}

async function getGarminHeartRate(date: Date) {
  const c = await getClient();
  const hr = await c.getHeartRate(date);
  await persist(c);
  return hr;
}

export type GarminDailySummary = {
  date: string;
  steps: number | null;
  sleepHours: number | null;
  restingHR: number | null;
};

async function getGarminDailySummary(date: Date): Promise<GarminDailySummary> {
  const c = await getClient();
  const dateStr = date.toISOString().slice(0, 10);

  const [steps, sleep, hr] = await Promise.allSettled([
    c.getSteps(date),
    c.getSleepData(date),
    c.getHeartRate(date),
  ]);

  await persist(c);

  return {
    date: dateStr,
    steps: steps.status === "fulfilled" ? steps.value : null,
    sleepHours:
      sleep.status === "fulfilled" && (sleep.value as { dailySleepDTO?: { sleepTimeSeconds?: number } })?.dailySleepDTO?.sleepTimeSeconds
        ? Math.round(
            ((sleep.value as { dailySleepDTO: { sleepTimeSeconds: number } }).dailySleepDTO
              .sleepTimeSeconds /
              3600) *
              10
          ) / 10
        : null,
    restingHR:
      hr.status === "fulfilled" && (hr.value as { restingHeartRate?: number })?.restingHeartRate
        ? (hr.value as { restingHeartRate: number }).restingHeartRate
        : null,
  };
}

export async function getGarminWeekSummary(): Promise<GarminDailySummary[]> {
  const today = new Date();
  return cacheGetOrSet(`garmin:week:${today.toISOString().slice(0, 10)}`, 30 * 60, async () => {
    const dates = Array.from(
      { length: 7 },
      (_, i) => new Date(today.getTime() - (6 - i) * 86400_000)
    );
    const results = await Promise.allSettled(dates.map((d) => getGarminDailySummary(d)));
    return results.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : {
            date: dates[i].toISOString().slice(0, 10),
            steps: null,
            sleepHours: null,
            restingHR: null,
          }
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Extended Garmin endpoints (unofficial — defensive, returns null on error). */
/* -------------------------------------------------------------------------- */

const GARMIN_API_BASE = "https://connectapi.garmin.com";

async function tryGet<T>(c: GarminConnect, path: string): Promise<T | null> {
  const url = path.startsWith("http") ? path : `${GARMIN_API_BASE}${path}`;
  try {
    return (await c.get<T>(url)) ?? null;
  } catch (e) {
    console.warn(`[garmin] GET ${url} failed:`, (e as Error).message);
    return null;
  }
}

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

type IntradayPoint = { ts: number; value: number };

function pairsToPoints(arr: unknown): IntradayPoint[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((p) => Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number")
    .map((p) => ({ ts: p[0] as number, value: p[1] as number }));
}

type StressDay = {
  date: string;
  avg: number | null;
  max: number | null;
  intraday: IntradayPoint[];
};

async function getGarminStress(date: Date): Promise<StressDay> {
  const c = await getClient();
  const dateStr = fmtDate(date);
  const data = await tryGet<{
    avgStressLevel?: number;
    maxStressLevel?: number;
    stressValuesArray?: [number, number][];
  }>(c, `/wellness-service/wellness/dailyStress/${dateStr}`);
  await persist(c);
  return {
    date: dateStr,
    avg: data?.avgStressLevel ?? null,
    max: data?.maxStressLevel ?? null,
    intraday: pairsToPoints(data?.stressValuesArray).filter((p) => p.value >= 0),
  };
}

type BodyBatteryDay = {
  date: string;
  start: number | null;
  end: number | null;
  charged: number | null;
  drained: number | null;
  intraday: IntradayPoint[];
};

async function getGarminBodyBattery(date: Date): Promise<BodyBatteryDay> {
  const c = await getClient();
  const dateStr = fmtDate(date);
  const data = await tryGet<{
    bodyBatteryValuesArray?: Array<[number, string | null, number | null, number | null]>;
    bodyBatteryValueDescriptorsDTOList?: Array<{ bodyBatteryValueDescriptorIndex: number; bodyBatteryValueDescriptorKey: string }>;
  }>(c, `/wellness-service/wellness/dailyStress/${dateStr}`);
  await persist(c);

  const descriptors = data?.bodyBatteryValueDescriptorsDTOList ?? [];
  const levelIdx = descriptors.find((d) => d.bodyBatteryValueDescriptorKey === "bodyBatteryLevel")?.bodyBatteryValueDescriptorIndex ?? 2;

  const rows = Array.isArray(data?.bodyBatteryValuesArray) ? data.bodyBatteryValuesArray : [];
  const points: IntradayPoint[] = rows
    .filter((row) => Array.isArray(row) && typeof row[0] === "number" && typeof row[levelIdx] === "number")
    .map((row) => ({ ts: row[0] as number, value: row[levelIdx] as number }));

  const charged = points.length
    ? points.reduce((sum, p, i) => (i === 0 ? 0 : sum + Math.max(0, p.value - points[i - 1].value)), 0)
    : null;
  const drained = points.length
    ? points.reduce((sum, p, i) => (i === 0 ? 0 : sum + Math.max(0, points[i - 1].value - p.value)), 0)
    : null;

  return {
    date: dateStr,
    start: points[0]?.value ?? null,
    end: points[points.length - 1]?.value ?? null,
    charged,
    drained,
    intraday: points,
  };
}

export type HRVDay = {
  date: string;
  lastNightAvg: number | null;
  weeklyAvg: number | null;
  status: string | null; // BALANCED, UNBALANCED, LOW, POOR, NONE
  baseline: { lowUpper: number | null; balancedLow: number | null; balancedUpper: number | null };
};

async function getGarminHRV(date: Date): Promise<HRVDay> {
  const c = await getClient();
  const dateStr = fmtDate(date);
  const data = await tryGet<{
    hrvSummary?: {
      lastNightAvg?: number;
      weeklyAvg?: number;
      status?: string;
      baseline?: {
        lowUpper?: number;
        balancedLow?: number;
        balancedUpper?: number;
        markerValue?: number;
      };
    };
  }>(c, `/hrv-service/hrv/${dateStr}`);
  await persist(c);
  const s = data?.hrvSummary;
  return {
    date: dateStr,
    lastNightAvg: s?.lastNightAvg ?? null,
    weeklyAvg: s?.weeklyAvg ?? null,
    status: s?.status ?? null,
    baseline: {
      lowUpper: s?.baseline?.lowUpper ?? null,
      balancedLow: s?.baseline?.balancedLow ?? null,
      balancedUpper: s?.baseline?.balancedUpper ?? null,
    },
  };
}

type ReadinessDay = {
  date: string;
  score: number | null;
  level: string | null;
  feedbackLong: string | null;
  factors: { sleep: number | null; recovery: number | null; hrv: number | null; acuteLoad: number | null };
};

async function getGarminReadiness(date: Date): Promise<ReadinessDay> {
  const c = await getClient();
  const dateStr = fmtDate(date);
  const data = await tryGet<
    Array<{
      score?: number;
      level?: string;
      feedbackLong?: string;
      sleepScore?: number;
      recoveryTime?: number;
      hrvWeeklyAverage?: number;
      acuteLoad?: number;
    }>
  >(c, `/metrics-service/metrics/trainingreadiness/${dateStr}`);
  await persist(c);
  const r = Array.isArray(data) ? data[0] : null;
  return {
    date: dateStr,
    score: r?.score ?? null,
    level: r?.level ?? null,
    feedbackLong: r?.feedbackLong ?? null,
    factors: {
      sleep: r?.sleepScore ?? null,
      recovery: r?.recoveryTime ?? null,
      hrv: r?.hrvWeeklyAverage ?? null,
      acuteLoad: r?.acuteLoad ?? null,
    },
  };
}

export type DailyFull = {
  date: string;
  totalSteps: number | null;
  stepGoal: number | null;
  totalDistanceMeters: number | null;
  activeKilocalories: number | null;
  bmrKilocalories: number | null;
  floorsAscended: number | null;
  intensityMinutes: number | null;
  vigorousIntensityMinutes: number | null;
  moderateIntensityMinutes: number | null;
  averageStressLevel: number | null;
  bodyBatteryHighestValue: number | null;
  bodyBatteryLowestValue: number | null;
  restingHeartRate: number | null;
  minHeartRate: number | null;
  maxHeartRate: number | null;
  averageSpo2: number | null;
  lowestSpo2: number | null;
  latestSpo2: number | null;
  bodyBatteryChargedValue: number | null;
  bodyBatteryDrainedValue: number | null;
};

async function getGarminDailyFull(date: Date): Promise<DailyFull> {
  const c = await getClient();
  const dateStr = fmtDate(date);
  const name = await displayName(c);

  // Try displayName-scoped path first (current Garmin API), fall back to the
  // older path-less form if the profile lookup failed.
  const path = name
    ? `/usersummary-service/usersummary/daily/${name}?calendarDate=${dateStr}`
    : `/usersummary-service/usersummary/daily?calendarDate=${dateStr}`;
  const data = await tryGet<Record<string, unknown>>(c, path);
  await persist(c);
  const get = <T>(k: string): T | null => (data?.[k] as T | undefined) ?? null;
  return {
    date: dateStr,
    totalSteps: get<number>("totalSteps"),
    stepGoal: get<number>("dailyStepGoal"),
    totalDistanceMeters: get<number>("totalDistanceMeters"),
    activeKilocalories: get<number>("activeKilocalories"),
    bmrKilocalories: get<number>("bmrKilocalories"),
    floorsAscended: get<number>("floorsAscended"),
    intensityMinutes: get<number>("intensityMinutes"),
    vigorousIntensityMinutes: get<number>("vigorousIntensityMinutes"),
    moderateIntensityMinutes: get<number>("moderateIntensityMinutes"),
    averageStressLevel: get<number>("averageStressLevel"),
    bodyBatteryHighestValue: get<number>("bodyBatteryHighestValue"),
    bodyBatteryLowestValue: get<number>("bodyBatteryLowestValue"),
    restingHeartRate: get<number>("restingHeartRate"),
    minHeartRate: get<number>("minHeartRate"),
    maxHeartRate: get<number>("maxHeartRate"),
    averageSpo2: get<number>("averageSpo2"),
    lowestSpo2: get<number>("lowestSpo2"),
    latestSpo2: get<number>("latestSpo2"),
    bodyBatteryChargedValue: get<number>("bodyBatteryChargedValue"),
    bodyBatteryDrainedValue: get<number>("bodyBatteryDrainedValue"),
  };
}

export type SleepLevelPoint = {
  start: number;
  end: number;
  level: number;
};

export type SleepStages = {
  date: string;
  totalHours: number | null;
  deepHours: number | null;
  lightHours: number | null;
  remHours: number | null;
  awakeHours: number | null;
  sleepScore: number | null;
  avgSleepHR: number | null;
  avgRespiration: number | null;
  startTs: number | null;
  endTs: number | null;
  intraday: SleepLevelPoint[];
};

async function getGarminSleepStages(date: Date): Promise<SleepStages> {
  const c = await getClient();
  const sleep = await c.getSleepData(date).catch(() => null);
  await persist(c);
  const dateStr = fmtDate(date);
  const empty: SleepStages = {
    date: dateStr,
    totalHours: null,
    deepHours: null,
    lightHours: null,
    remHours: null,
    awakeHours: null,
    sleepScore: null,
    avgSleepHR: null,
    avgRespiration: null,
    startTs: null,
    endTs: null,
    intraday: [],
  };
  if (!sleep) return empty;
  const dto = sleep.dailySleepDTO as unknown as {
    sleepTimeSeconds?: number;
    deepSleepSeconds?: number;
    lightSleepSeconds?: number;
    remSleepSeconds?: number;
    awakeSleepSeconds?: number;
    sleepStartTimestampGMT?: number;
    sleepEndTimestampGMT?: number;
    sleepScores?: { overall?: { value?: number } };
    averageRespirationValue?: number;
  };
  const toH = (s: number | undefined) =>
    s === undefined ? null : Math.round((s / 3600) * 10) / 10;
  const hr = sleep.sleepHeartRate as Array<{ value: number }> | undefined;
  const avgHR =
    hr && hr.length > 0
      ? Math.round(hr.reduce((sum, p) => sum + p.value, 0) / hr.length)
      : null;
  const levels = (sleep.sleepLevels as Array<{
    startGMT: string;
    endGMT: string;
    activityLevel: number;
  }> | undefined) ?? [];
  const intraday: SleepLevelPoint[] = levels
    .filter((l) => l && l.startGMT && l.endGMT)
    .map((l) => ({
      start: new Date(l.startGMT).getTime(),
      end: new Date(l.endGMT).getTime(),
      level: l.activityLevel,
    }));
  return {
    date: dateStr,
    totalHours: toH(dto?.sleepTimeSeconds),
    deepHours: toH(dto?.deepSleepSeconds),
    lightHours: toH(dto?.lightSleepSeconds),
    remHours: toH(dto?.remSleepSeconds),
    awakeHours: toH(dto?.awakeSleepSeconds),
    sleepScore: dto?.sleepScores?.overall?.value ?? null,
    avgSleepHR: avgHR,
    avgRespiration: dto?.averageRespirationValue ?? null,
    startTs: dto?.sleepStartTimestampGMT ?? null,
    endTs: dto?.sleepEndTimestampGMT ?? null,
    intraday,
  };
}

type HRDay = {
  date: string;
  resting: number | null;
  min: number | null;
  max: number | null;
  intraday: IntradayPoint[];
};

async function getGarminHRDetail(date: Date): Promise<HRDay> {
  const c = await getClient();
  const hr = (await c.getHeartRate(date).catch(() => null)) as
    | {
        restingHeartRate?: number;
        minHeartRate?: number;
        maxHeartRate?: number;
        heartRateValues?: [number, number | null][];
      }
    | null;
  await persist(c);
  const dateStr = fmtDate(date);
  const intraday: IntradayPoint[] = Array.isArray(hr?.heartRateValues)
    ? hr!
        .heartRateValues!.filter((row) => row[1] !== null && row[1] !== undefined)
        .map((row) => ({ ts: row[0], value: row[1] as number }))
    : [];
  return {
    date: dateStr,
    resting: hr?.restingHeartRate ?? null,
    min: hr?.minHeartRate ?? null,
    max: hr?.maxHeartRate ?? null,
    intraday,
  };
}

type RestingHRPoint = { date: string; resting: number | null; min: number | null; max: number | null };

async function getGarminRestingHRTrend(days = 14): Promise<RestingHRPoint[]> {
  const today = new Date();
  const dates = Array.from(
    { length: days },
    (_, i) => new Date(today.getTime() - (days - 1 - i) * 86400_000)
  );
  const results = await Promise.allSettled(dates.map((d) => getGarminDailyFull(d)));
  return results.map((r, i) =>
    r.status === "fulfilled"
      ? {
          date: r.value.date,
          resting: r.value.restingHeartRate,
          min: r.value.minHeartRate,
          max: r.value.maxHeartRate,
        }
      : { date: fmtDate(dates[i]), resting: null, min: null, max: null }
  );
}

export type RestingHRStats = {
  trend: RestingHRPoint[];
  avg: number | null;
  min: number | null;
  max: number | null;
};

export type PulseOxDay = {
  date: string;
  avg: number | null;
  lowest: number | null;
  latest: number | null;
};

function pulseOxFromDaily(daily: DailyFull): PulseOxDay {
  return {
    date: daily.date,
    avg: daily.averageSpo2,
    lowest: daily.lowestSpo2,
    latest: daily.latestSpo2,
  };
}

export type HRVHistoryPoint = {
  date: string;
  lastNightAvg: number | null;
  weeklyAvg: number | null;
  status: string | null;
};

async function getGarminHRVHistory(days = 28): Promise<HRVHistoryPoint[]> {
  const today = new Date();
  const dates = Array.from(
    { length: days },
    (_, i) => new Date(today.getTime() - (days - 1 - i) * 86400_000)
  );
  const results = await Promise.allSettled(dates.map((d) => getGarminHRV(d)));
  return results.map((r, i) =>
    r.status === "fulfilled"
      ? {
          date: r.value.date,
          lastNightAvg: r.value.lastNightAvg,
          weeklyAvg: r.value.weeklyAvg,
          status: r.value.status,
        }
      : { date: fmtDate(dates[i]), lastNightAvg: null, weeklyAvg: null, status: null }
  );
}

export type WeekRollup = {
  steps: { avg: number | null; total: number | null };
  sleep: { scoreAvg: number | null; durationAvgHours: number | null };
  restingHR: { avg: number | null };
  stress: { avg: number | null };
  floors: { avg: number | null };
  pulseOx: { avg: number | null };
};

export type GarminDashboard = {
  date: string;
  daily: DailyFull;
  sleep: SleepStages;
  stress: StressDay;
  bodyBattery: BodyBatteryDay;
  hr: HRDay;
  hrv: HRVDay;
  hrvHistory: HRVHistoryPoint[];
  pulseOx: PulseOxDay;
  readiness: ReadinessDay;
  restingHRTrend: RestingHRPoint[];
  restingHRStats: RestingHRStats;
  weekDaily: DailyFull[];
  weekSleep: SleepStages[];
  weekPulseOx: PulseOxDay[];
  weekRollup: WeekRollup;
};

function aggregateRestingHR(trend: RestingHRPoint[]): RestingHRStats {
  const valid = trend.filter((p) => p.resting !== null);
  if (valid.length === 0) {
    return { trend, avg: null, min: null, max: null };
  }
  const values = valid.map((p) => p.resting as number);
  return {
    trend,
    avg: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export async function getGarminDashboard(date: Date = new Date()): Promise<GarminDashboard> {
  return cacheGetOrSet(`garmin:dash:${fmtDate(date)}`, 10 * 60, () => buildGarminDashboard(date));
}

function avg(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((s, v) => s + v, 0) / valid.length);
}

function avgFloat(values: Array<number | null | undefined>, decimals = 1): number | null {
  const valid = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (valid.length === 0) return null;
  const m = Math.pow(10, decimals);
  return Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * m) / m;
}

function buildWeekRollup(
  daily: DailyFull[],
  sleep: SleepStages[],
  pulseOx: PulseOxDay[]
): WeekRollup {
  const stepValues = daily.map((d) => d.totalSteps);
  return {
    steps: {
      avg: avg(stepValues),
      total: stepValues.every((v) => v === null)
        ? null
        : stepValues.reduce<number>((s, v) => s + (v ?? 0), 0),
    },
    sleep: {
      scoreAvg: avg(sleep.map((d) => d.sleepScore)),
      durationAvgHours: avgFloat(sleep.map((d) => d.totalHours)),
    },
    restingHR: { avg: avg(daily.map((d) => d.restingHeartRate)) },
    stress: { avg: avg(daily.map((d) => d.averageStressLevel)) },
    floors: { avg: avg(daily.map((d) => d.floorsAscended)) },
    pulseOx: { avg: avg(pulseOx.map((d) => d.avg)) },
  };
}

async function buildGarminDashboard(date: Date): Promise<GarminDashboard> {
  const yesterday = new Date(date.getTime() - 86400_000);
  const weekDates = Array.from(
    { length: 7 },
    (_, i) => new Date(date.getTime() - (6 - i) * 86400_000)
  );
  const [
    dailyToday,
    sleepToday,
    stressToday,
    bodyBatteryToday,
    hr,
    hrvToday,
    readiness,
    restingHRTrend,
    hrvHistory,
    weekDaily,
    weekSleep,
  ] = await Promise.all([
    getGarminDailyFull(date),
    getGarminSleepStages(date),
    getGarminStress(date),
    getGarminBodyBattery(date),
    getGarminHRDetail(date),
    getGarminHRV(date),
    getGarminReadiness(date),
    getGarminRestingHRTrend(14),
    getGarminHRVHistory(28),
    Promise.all(weekDates.map((d) => getGarminDailyFull(d))),
    Promise.all(weekDates.map((d) => getGarminSleepStages(d))),
  ]);

  const dailyEmpty = dailyToday.totalSteps === null && dailyToday.restingHeartRate === null;
  const sleepEmpty = sleepToday.totalHours === null;
  const stressEmpty = stressToday.avg === null;
  const bodyBatteryEmpty = bodyBatteryToday.intraday.length === 0;
  const hrvEmpty = hrvToday.lastNightAvg === null && hrvToday.weeklyAvg === null;

  const [
    dailyFallback,
    sleepFallback,
    stressFallback,
    bodyBatteryFallback,
    hrvFallback,
  ] = await Promise.all([
    dailyEmpty ? getGarminDailyFull(yesterday) : Promise.resolve(dailyToday),
    sleepEmpty ? getGarminSleepStages(yesterday) : Promise.resolve(sleepToday),
    stressEmpty ? getGarminStress(yesterday) : Promise.resolve(stressToday),
    bodyBatteryEmpty ? getGarminBodyBattery(yesterday) : Promise.resolve(bodyBatteryToday),
    hrvEmpty ? getGarminHRV(yesterday) : Promise.resolve(hrvToday),
  ]);

  const daily = dailyFallback;
  const sleep = sleepFallback;
  const stress = stressFallback;
  const bodyBattery: BodyBatteryDay = {
    ...bodyBatteryFallback,
    charged: daily.bodyBatteryChargedValue ?? bodyBatteryFallback.charged,
    drained: daily.bodyBatteryDrainedValue ?? bodyBatteryFallback.drained,
  };
  const pulseOx = pulseOxFromDaily(daily);
  const hrv = hrvFallback;
  const weekPulseOx = weekDaily.map(pulseOxFromDaily);
  return {
    date: fmtDate(date),
    daily,
    sleep,
    stress,
    bodyBattery,
    hr,
    hrv,
    hrvHistory,
    pulseOx,
    readiness,
    restingHRTrend,
    restingHRStats: aggregateRestingHR(restingHRTrend),
    weekDaily,
    weekSleep,
    weekPulseOx,
    weekRollup: buildWeekRollup(weekDaily, weekSleep, weekPulseOx),
  };
}
