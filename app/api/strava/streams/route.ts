import { requireBearer } from "@/lib/auth";
import { getActivityStreams } from "@/lib/strava";

export async function GET(req: Request) {
  const unauth = await requireBearer(req);
  if (unauth) return unauth;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  try {
    return Response.json(await getActivityStreams(id));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
