import { requireBearer } from "@/lib/oauth";
import { buildHealthSummary } from "@/lib/health";

export async function GET(req: Request) {
  const unauth = await requireBearer(req);
  if (unauth) return unauth;

  const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
  const watts = Number(new URL(req.url).searchParams.get("watts") ?? 190);

  try {
    const summary = await buildHealthSummary({ days, targetWatts: watts });
    return Response.json(summary);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
