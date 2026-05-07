import { requireBearer } from "@/lib/oauth";
import { buildHealthSummary, defaultTargetWatts } from "@/lib/health";

export async function GET(req: Request) {
  const unauth = await requireBearer(req);
  if (unauth) return unauth;

  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? 30);
  const wattsParam = url.searchParams.get("watts");
  const watts = wattsParam !== null ? Number(wattsParam) : defaultTargetWatts();

  try {
    const summary = await buildHealthSummary({ days, targetWatts: watts });
    return Response.json(summary);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
