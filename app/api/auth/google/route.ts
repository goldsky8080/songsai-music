import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { buildOAuthStateCookieOptions, GOOGLE_AUTH_STATE_COOKIE_NAME } from "@/lib/auth";
import { env } from "@/lib/env";

function buildGoogleRedirectUri() {
  if (!env.APP_URL) {
    throw new Error("APP_URL is required for Google login.");
  }

  return `${env.APP_URL}/api/auth/google/callback`;
}

export async function GET() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "Google login is not configured." }, { status: 500 });
  }

  const state = randomUUID();
  const redirectUri = buildGoogleRedirectUri();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(url);
  response.cookies.set({
    name: GOOGLE_AUTH_STATE_COOKIE_NAME,
    value: state,
    ...buildOAuthStateCookieOptions(60 * 10),
  });

  return response;
}
