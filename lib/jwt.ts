import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "billam_session";

// Resolved lazily, not at module load: throwing here would break the Next
// build's page-data collection. A missing secret instead fails loudly at the
// point of use (sign) or fails closed (verify returns false).
function encodedKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Set it in .env.local (local) or the Vercel " +
        "project environment variables (production)."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(remember: boolean): Promise<string> {
  return new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "30d" : "12h")
    .sign(encodedKey());
}

export async function verifySession(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, encodedKey(), {
      algorithms: ["HS256"],
    });
    return payload.authenticated === true;
  } catch {
    return false;
  }
}
