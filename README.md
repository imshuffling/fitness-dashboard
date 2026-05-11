# Fitness Dashboard

Self-hosted Next.js dashboard that pulls your data from Strava, Garmin
Connect, and Intervals.icu, and exposes a Model Context Protocol (MCP)
server so Claude can answer questions about your training.

<img width="3024" height="5410" alt="image" src="https://github.com/user-attachments/assets/cb7046c9-45e7-44ef-8b1c-48d20cce8ade" />

- HR-at-power trend, zone 2 volume, weekly rollups
- Garmin wellness panel (HRV, sleep, body battery, readiness, stress)
- Training load + ramp rate from Intervals.icu
- MCP endpoint for `claude.ai`

> Single-user app gated by one password. Forks welcome.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · `@upstash/redis` ·
`@modelcontextprotocol/sdk` · `garmin-connect` · `recharts` · `zod`.

## Quick start

```bash
git clone <your-fork>
cd fitness-dashboard
pnpm install
cp .env.example .env.local
# at minimum set DASHBOARD_PASSWORD
pnpm dev
```

Open <http://localhost:3000>, log in with `DASHBOARD_PASSWORD`, then
connect any integrations you want from `/auth/*`.

## Integrations

| Integration | Required env vars | What you get | Setup |
|---|---|---|---|
| **Strava** | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI` | Activities, HR/power streams, zone 2 trend | <https://www.strava.com/settings/api> |
| **Garmin Connect** | none — log in at `/auth/garmin` | Sleep, HRV, body battery, readiness, daily summary | Use your Garmin Connect email + password |
| **Intervals.icu** | `INTERVALS_ICU_API_KEY`, `INTERVALS_ICU_ATHLETE_ID` | Fitness/fatigue/form, ramp rate, athlete profile (FTP, weight) | <https://intervals.icu/settings> |
| **Redis cache** | `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Token persistence + cached responses | Upstash, Vercel KV, or any Upstash-compatible REST API. Required in production. |

All integrations except `DASHBOARD_PASSWORD` are optional. The dashboard
degrades gracefully — connect only what you use.

> **Garmin auth note**: there's no official public Garmin Connect API.
> The `garmin-connect` package logs in with your username/password using
> the same flow the mobile app uses. Credentials are sent only to your
> own backend; the resulting OAuth1/OAuth2 tokens are persisted in your
> own KV store. Enabling 2FA on your Garmin account currently breaks
> this flow.

## Profile config

Tune zones and defaults to your physiology via env vars:

```
HR_MAX_BPM=185           # used to derive HR zones (Z1<60% .. Z5>=90%)
DEFAULT_TARGET_WATTS=190 # default for HR-at-power trend
```

For non-standard zone bands (e.g. Coggan, lactate-tested) edit
`lib/zones.ts` directly.

## MCP endpoint

`POST /api/mcp` (also `GET`/`DELETE` per MCP spec). Auth via either:

- `Authorization: Bearer <MCP_SECRET_TOKEN>` (legacy / Claude Desktop)
- Dynamic OAuth tokens issued at `/api/mcp/authorize` (PKCE)

### Tools

| Tool | Args | Purpose |
|---|---|---|
| `get_fitness_summary` | `days?`, `watts?` | All-sport weekly volume + Z2 adherence, HR-at-power trend, recent activities, fitness trajectory. Weekly buckets include `activities`, `rides` (cycling-only), and `byType` |
| `get_recent_activities` | `limit?`, `days?` | Recent activities (any sport) with HR/power/Z2% and `type` field |
| `get_hr_at_power_trend` | `watts`, `days?` | HR samples filtered to a target wattage over time |
| `get_zone2_trend` | `weeks?` | Weekly zone 2 minutes / percentage across all sports |
| `get_garmin_wellness` | — | Last 7 days of sleep, RHR, steps |
| `get_training_load` | `days?` | Intervals.icu CTL/ATL/TSB ramp |

### Local smoke test

```sh
TOKEN=$(grep MCP_SECRET_TOKEN .env.local | cut -d= -f2)

curl -s -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Connect to Claude

Settings → Integrations → Add MCP Server.

- URL: `https://<your-app>.vercel.app/api/mcp`
- Header: `Authorization: Bearer <MCP_SECRET_TOKEN>`

Try: *"How has my zone 2 training been this week?"* or *"Has my HR at
190W trended down over the last month?"*

## Deploy to Vercel

1. Push to GitHub, import to Vercel.
2. Storage → Marketplace → install **Upstash Redis** (or any provider
   exposing `KV_REST_API_URL` / `KV_REST_API_TOKEN`). Link it to the
   project — env vars are auto-injected.
3. Add the rest of your env vars from `.env.example` in Project
   Settings.
4. Update Strava's **Authorization Callback Domain** to your Vercel
   domain and set `STRAVA_REDIRECT_URI` accordingly.
5. Deploy. Visit `/auth/strava` and `/auth/garmin` once to authorise.

## Project layout

```
app/
  page.tsx                       # Home dashboard (server-rendered)
  garmin/page.tsx                # Garmin Health detail page
  auth/{strava,garmin}/...       # OAuth + login flows
  api/mcp/route.ts               # MCP transport endpoint
  api/health/route.ts            # Aggregated summary (HTTP)
  api/strava|garmin/...          # Provider proxies
lib/
  tokens.ts        # KV/file token store + refresh
  strava.ts        # Strava client w/ 429 backoff
  garmin.ts        # Garmin Connect client + dashboard builder
  garminTokens.ts  # Garmin OAuth1/2 token persistence
  intervals.ts     # Intervals.icu client
  zones.ts         # HR zone bands derived from HR_MAX_BPM
  health.ts        # buildHealthSummary() — KV-cached 15min
  oauth.ts         # MCP bearer middleware + PKCE flow
  mcp.ts           # Tool registrations
components/        # Recharts + Garmin-style cards
```

## Customising

- `lib/zones.ts` — non-standard zone math
- `components/garmin/*` — card layouts and colours
- `app/page.tsx` — what shows on the home grid

## License

[MIT](./LICENSE)
