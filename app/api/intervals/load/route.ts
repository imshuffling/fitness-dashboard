import { requireBearer } from "@/lib/auth";
import { getTrainingLoadTrend } from "@/lib/intervals";

export async function GET(req: Request) {
  const unauth = await requireBearer(req);
  if (unauth) return unauth;
  const days = Number(new URL(req.url).searchParams.get("days") ?? 90);
  try {
    return Response.json(await getTrainingLoadTrend(days));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
