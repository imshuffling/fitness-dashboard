import { requireBearer } from "@/lib/auth";
import { getGarminWeekSummary } from "@/lib/garmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const unauth = await requireBearer(req);
  if (unauth) return unauth;
  try {
    return Response.json(await getGarminWeekSummary());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
