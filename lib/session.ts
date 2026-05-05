import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "dashboard_auth";

export function expectedToken(): string | null {
  const pw = process.env.DASHBOARD_PASSWORD;
  if (!pw) return null;
  return createHmac("sha256", pw).update("session-v1").digest("hex");
}

export function isValid(cookieValue: string | undefined | null): boolean {
  const expected = expectedToken();
  if (!expected || !cookieValue) return false;
  const a = Buffer.from(cookieValue, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function checkPassword(input: string): boolean {
  const pw = process.env.DASHBOARD_PASSWORD;
  if (!pw) return false;
  const a = Buffer.from(input, "utf8");
  const b = Buffer.from(pw, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
