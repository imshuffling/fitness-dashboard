import { NextResponse } from "next/server";
import { clearSummaryCache } from "@/lib/health";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await clearSummaryCache();
  return NextResponse.redirect(new URL("/", req.url), 303);
}
