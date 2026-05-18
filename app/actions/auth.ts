"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { checkPassword, rateLimit, clearRateLimit } from "@/lib/auth";
import { createSession, destroySession } from "@/lib/session";

export type LoginState = { error: string | null };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";

  const limit = rateLimit(ip);
  if (!limit.allowed) {
    return {
      error: `Too many attempts. Try again in ${limit.retryAfterMins} minutes.`,
    };
  }

  const ok = await checkPassword(password);
  if (!ok) {
    // Generic message: never reveal partial correctness.
    return { error: "Incorrect password" };
  }

  clearRateLimit(ip);
  await createSession(remember);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
