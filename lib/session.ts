import "server-only";
import { cookies } from "next/headers";
import { signSession, verifySession, COOKIE_NAME } from "./jwt";

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export async function createSession(remember: boolean): Promise<void> {
  const token = await signSession(remember);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: THIRTY_DAYS_SECONDS } : {}),
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(COOKIE_NAME)?.value);
}

export { COOKIE_NAME };
