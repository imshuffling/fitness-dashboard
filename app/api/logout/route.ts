import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/session";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.cookies.delete(COOKIE_NAME);
  return res;
}
