import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  buildHealthSummary,
  calcHRAtPowerTrend,
  calcZone2Trend,
  defaultTargetWatts,
} from "./health";
import {
  getIntervalsAthlete,
  getTrainingLoadTrend,
  isIntervalsConfigured,
} from "./intervals";
import { getGarminWeekSummary } from "./garmin";
import { isGarminConnected } from "./garminTokens";

export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: "fitness-dashboard", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.registerTool(
    "get_fitness_summary",
    {
      title: "Get fitness summary",
      description:
        "Aggregated fitness summary across all sports. `thisWeek.activities` = total sessions, `thisWeek.rides` = cycling-only count. `weekly[]` buckets include `activities`, `rides`, and a `byType` breakdown keyed by sport type. Also returns HR-at-power trend, recent activities, and overall fitness trajectory (improving/stable/declining).",
      inputSchema: {
        days: z
          .number()
          .int()
          .min(7)
          .max(365)
          .optional()
          .describe("How many days of activity to include (default 30)"),
        watts: z
          .number()
          .int()
          .min(50)
          .max(500)
          .optional()
          .describe("Target wattage for the HR-at-power trend (defaults to DEFAULT_TARGET_WATTS env var, or 190)"),
      },
    },
    async ({ days, watts }) => {
      const summary = await buildHealthSummary({ days, targetWatts: watts });
      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    }
  );

  server.registerTool(
    "get_recent_activities",
    {
      title: "Get recent activities",
      description:
        "List of recent activities (any sport — rides, runs, gym, walks, etc.) with HR, power, duration, and zone 2 percentage. Each entry has a `type` field (sport type, e.g. VirtualRide, Ride, Run, Walk, Workout, WeightTraining) — filter on that if you only want cycling.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Max activities to return (default 10)"),
        days: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe("Lookback window in days (default 30)"),
      },
    },
    async ({ limit, days }) => {
      const summary = await buildHealthSummary({ days: days ?? 30 });
      const activities = summary.recentActivities.slice(0, limit ?? 10);
      return { content: [{ type: "text", text: JSON.stringify(activities, null, 2) }] };
    }
  );

  server.registerTool(
    "get_hr_at_power_trend",
    {
      title: "Get HR-at-power trend",
      description:
        "Heart rate at a specific target power output over time. Falling HR at fixed watts indicates improving aerobic fitness.",
      inputSchema: {
        watts: z.number().int().min(50).max(500).describe(`Target wattage (e.g. ${defaultTargetWatts()})`),
        days: z
          .number()
          .int()
          .min(14)
          .max(365)
          .optional()
          .describe("Lookback window in days (default 90)"),
      },
    },
    async ({ watts, days }) => {
      const points = await calcHRAtPowerTrend(watts, days ?? 90);
      return { content: [{ type: "text", text: JSON.stringify(points, null, 2) }] };
    }
  );

  server.registerTool(
    "get_zone2_trend",
    {
      title: "Get zone 2 weekly trend",
      description:
        "Weekly zone 2 minutes and percentage of total training time (all sports), useful for tracking aerobic base adherence. Each bucket also includes `activities`, `rides` (cycling-only), and a `byType` breakdown.",
      inputSchema: {
        weeks: z
          .number()
          .int()
          .min(1)
          .max(52)
          .optional()
          .describe("Number of weeks to include (default 8)"),
      },
    },
    async ({ weeks }) => {
      const buckets = await calcZone2Trend(weeks ?? 8);
      return { content: [{ type: "text", text: JSON.stringify(buckets, null, 2) }] };
    }
  );

  if (isIntervalsConfigured()) {
    server.registerTool(
      "get_training_load",
      {
        title: "Get training load trend (CTL/ATL/TSB)",
        description:
          "Daily fitness/fatigue/form curve from intervals.icu. CTL = chronic training load (fitness), ATL = acute training load (fatigue), TSB = form (CTL - ATL). Positive TSB = fresh, negative = fatigued.",
        inputSchema: {
          days: z
            .number()
            .int()
            .min(7)
            .max(365)
            .optional()
            .describe("Days of history to return (default 90)"),
        },
      },
      async ({ days }) => {
        const points = await getTrainingLoadTrend(days ?? 90);
        return { content: [{ type: "text", text: JSON.stringify(points, null, 2) }] };
      }
    );

    server.registerTool(
      "get_intervals_athlete",
      {
        title: "Get intervals.icu athlete profile",
        description: "Athlete profile from intervals.icu including FTP, weight, threshold HR.",
        inputSchema: {},
      },
      async () => {
        const a = await getIntervalsAthlete();
        return { content: [{ type: "text", text: JSON.stringify(a, null, 2) }] };
      }
    );
  }

  server.registerTool(
    "get_garmin_wellness",
    {
      title: "Get Garmin wellness summary (last 7 days)",
      description:
        "Daily Garmin metrics for the last 7 days: steps, sleep hours, resting HR. Null fields for days the device wasn't worn or didn't sync. Requires Garmin Connect linked at /auth/garmin.",
      inputSchema: {},
    },
    async () => {
      if (!(await isGarminConnected())) {
        return {
          content: [
            { type: "text", text: "Garmin Connect not linked. Visit /auth/garmin to connect." },
          ],
          isError: true,
        };
      }
      const summary = await getGarminWeekSummary();
      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    }
  );

  return server;
}
