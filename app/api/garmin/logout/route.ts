import { NextResponse } from "next/server";
import { clearGarminTokens } from "@/lib/garminTokens";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await clearGarminTokens();
  return NextResponse.redirect(new URL("/", req.url), 303);
}
