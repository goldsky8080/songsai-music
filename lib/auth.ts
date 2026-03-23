import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

export const AUTH_COOKIE_NAME = "music-platform-session";

export type SessionUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
};

const secret = new TextEncoder().encode(env.AUTH_SECRET);

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, secret);

  return {
    id: payload.sub ?? "",
    email: String(payload.email ?? ""),
    role: payload.role === "ADMIN" ? "ADMIN" : "USER",
  } satisfies SessionUser;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
