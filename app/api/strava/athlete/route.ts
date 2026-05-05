import { requireBearer } from "@/lib/auth";
import { getAthleteProfile } from "@/lib/strava";

export async function GET(req: Request) {
  const unauth = requireBearer(req);
  if (unauth) return unauth;
  try {
    return Response.json(await getAthleteProfile());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
