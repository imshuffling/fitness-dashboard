import { NextResponse } from "next/server";
import { loginAndSaveGarmin } from "@/lib/garmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");

  if (!username || !password) {
    const url = new URL("/auth/garmin", req.url);
    url.searchParams.set("error", encodeURIComponent("missing credentials"));
    return NextResponse.redirect(url, 303);
  }

  try {
    await loginAndSaveGarmin(username, password);
    return NextResponse.redirect(new URL("/", req.url), 303);
  } catch (e) {
    const url = new URL("/auth/garmin", req.url);
    url.searchParams.set("error", encodeURIComponent((e as Error).message));
    return NextResponse.redirect(url, 303);
  }
}
