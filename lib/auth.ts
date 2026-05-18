import "server-only";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { isAuthenticated } from "./session";

const BCRYPT_SHAPE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

// A correct bcrypt hash is `$2b$12$...` and 60 chars. If it is missing or the
// wrong shape it is almost always because the `$` were eaten by
// dotenv-expand in .env.local (escape them as \$), or the var is unset.
// Logging loudly here turns a silent "password always wrong" into an
// obvious, actionable server log.
export function validatePasswordHash(): { ok: boolean; reason?: string } {
  const hash = process.env.SITE_PASSWORD_HASH;
  if (!hash) return { ok: false, reason: "SITE_PASSWORD_HASH is not set" };
  if (!BCRYPT_SHAPE.test(hash)) {
    return {
      ok: false,
      reason:
        "SITE_PASSWORD_HASH is not a valid bcrypt hash (expected $2b$12$… 60 chars). " +
        "In .env.local escape each $ as \\$; in Vercel paste the raw hash unescaped.",
    };
  }
  return { ok: true };
}

export async function checkPassword(plaintext: string): Promise<boolean> {
  const check = validatePasswordHash();
  if (!check.ok) {
    console.error(`[auth] Login cannot succeed: ${check.reason}`);
    return false;
  }
  try {
    return await bcrypt.compare(plaintext, process.env.SITE_PASSWORD_HASH!);
  } catch {
    return false;
  }
}

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, 12);
}

// Server-side guard for protected pages. Proxy handles the fast path; this is
// the authoritative check before any data is read.
export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}

// Simple in-memory rate limiter. Resets on cold start, which is acceptable for
// a single-tenant household app: it only needs to blunt brute force.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function rateLimit(ip: string): { allowed: boolean; retryAfterMins: number } {
  const nowMs = Date.now();
  const entry = attempts.get(ip);
  if (!entry || nowMs > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: nowMs + WINDOW_MS });
    return { allowed: true, retryAfterMins: 0 };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterMins: Math.ceil((entry.resetAt - nowMs) / 60000),
    };
  }
  entry.count += 1;
  return { allowed: true, retryAfterMins: 0 };
}

export function clearRateLimit(ip: string): void {
  attempts.delete(ip);
}
