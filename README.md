# Fitness Dashboard + Claude MCP

Personal Next.js app that pulls Strava data, renders a dashboard (HR-at-power trend, zone 2 volume, activity feed, zone donut), and exposes an MCP server so Claude.ai can query your fitness data conversationally.

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind v4
- `@upstash/redis` for token persistence (Vercel marketplace Redis integration)
- `@modelcontextprotocol/sdk` (Streamable HTTP transport, stateless mode)
- `recharts`, `date-fns`, `zod`

## Local development

1. Create a Strava API app at <https://www.strava.com/settings/api>. Set the **Authorization Callback Domain** to `localhost`.
2. Copy `.env.example` to `.env.local` and fill in:
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `STRAVA_REDIRECT_URI=http://localhost:3000/auth/strava/callback`
   - `MCP_SECRET_TOKEN` — generate with `openssl rand -hex 32`
   - Leave `KV_REST_API_URL` / `KV_REST_API_TOKEN` empty for local dev — tokens fall back to `.data/tokens.json`.
3. `npm run dev`, then visit <http://localhost:3000/auth/strava> to authorise.
4. Reload `/` to see the dashboard.

## MCP endpoint

`POST /api/mcp` (also `GET`/`DELETE` per MCP spec). Requires `Authorization: Bearer <MCP_SECRET_TOKEN>`.

### Tools

| Tool | Args | Purpose |
|---|---|---|
| `get_fitness_summary` | `days?`, `watts?` | Aggregated weekly volume, Z2 adherence, HR-at-power trend, recent activities, fitness trajectory |
| `get_recent_rides` | `limit?`, `days?` | Recent activities with HR/power/Z2% |
| `get_hr_at_power_trend` | `watts`, `days?` | HR samples filtered to a target wattage over time |
| `get_zone2_trend` | `weeks?` | Weekly zone 2 minutes and percentage |

### Local smoke test

```sh
TOKEN=$(grep MCP_SECRET_TOKEN .env.local | cut -d= -f2)

# list tools
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# call a tool
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_fitness_summary","arguments":{"days":30}}}'
```

## Deploy to Vercel

1. Push to GitHub, import to Vercel.
2. Storage tab → Marketplace → install **Upstash Redis** (or any Redis provider that exposes `KV_REST_API_URL`/`KV_REST_API_TOKEN`). Link it to the project — env vars are auto-injected.
3. Add the rest of the env vars in Project Settings:
   - `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`
   - `STRAVA_REDIRECT_URI=https://<your-app>.vercel.app/auth/strava/callback`
   - `MCP_SECRET_TOKEN` (the same one from `.env.local`, or a fresh prod-only secret)
4. Update the Strava app's **Authorization Callback Domain** to your Vercel domain.
5. Deploy. Visit `/auth/strava` once to authorise the production app.

## Connect to Claude.ai

Settings → Integrations → Add MCP Server.

- URL: `https://<your-app>.vercel.app/api/mcp`
- Header: `Authorization: Bearer <MCP_SECRET_TOKEN>`

Try: *"How has my zone 2 training been this week?"* or *"Has my HR at 190W trended down over the last month?"*

## Project layout

```
app/
  page.tsx                       # Dashboard (server-rendered)
  auth/strava/page.tsx           # "Connect Strava" CTA
  auth/strava/callback/route.ts  # OAuth code → tokens
  api/mcp/route.ts               # MCP transport endpoint
  api/health/route.ts            # Aggregated summary (HTTP)
  api/strava/{athlete,activities,streams}/route.ts
lib/
  tokens.ts   # Upstash Redis (or .data/tokens.json fallback) + refresh
  strava.ts   # API client w/ 429 backoff
  zones.ts    # HR zone bands + math
  health.ts   # buildHealthSummary() — shared by route + MCP, KV-cached 15min
  auth.ts     # requireBearer middleware
  mcp.ts      # Tool registrations
components/   # Recharts chart components + ActivityFeed/StatCard
```

## Editing HR zones

`lib/zones.ts` — adjust the `ZONES` constant. Defaults: Z1 0–115, Z2 116–130, Z3 131–150, Z4 151–165, Z5 166+. Bump the Z2 upper bound to your actual aerobic threshold.

## Future extensions

- Garmin direct integration (currently relies on Garmin → Strava sync)
- Weekly summary email via Resend
- Claude-driven training recommendations (write tool: `set_training_target`)
- Threshold alerts on HR-at-power drift
