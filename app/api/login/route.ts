import { NextResponse } from "next/server";
import { COOKIE_NAME, checkPassword, expectedToken } from "@/lib/session";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");

  if (!checkPassword(password)) {
    const url = new URL("/login", req.url);
    if (next !== "/") url.searchParams.set("next", next);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, 303);
  }

  const token = expectedToken();
  if (!token) {
    return new NextResponse("DASHBOARD_PASSWORD not configured", { status: 500 });
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const res = NextResponse.redirect(new URL(safeNext, req.url), 303);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
