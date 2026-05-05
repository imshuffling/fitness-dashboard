import { requireBearer } from "@/lib/auth";
import { getActivities } from "@/lib/strava";

export async function GET(req: Request) {
  const unauth = requireBearer(req);
  if (unauth) return unauth;
  const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
  try {
    return Response.json(await getActivities({ days }));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
