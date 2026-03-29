import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  AUTH_COOKIE_NAME,
  buildOAuthStateCookieOptions,
  buildSessionCookieOptions,
  createSessionToken,
  GOOGLE_AUTH_STATE_COOKIE_NAME,
} from "@/lib/auth";
import { env } from "@/lib/env";
import { grantSignupCredits } from "@/server/credits/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GoogleTokenResponse = {
  access_token: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

function buildGoogleRedirectUri() {
  if (!env.APP_URL) {
    throw new Error("APP_URL is required for Google login.");
  }

  return `${env.APP_URL}/api/auth/google/callback`;
}

function buildErrorRedirect(message: string) {
  const url = new URL(env.APP_URL ?? "http://localhost:3000");
  url.searchParams.set("authError", message);
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: NextRequest) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "Google login is not configured." }, { status: 500 });
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_AUTH_STATE_COOKIE_NAME)?.value;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  console.info("[auth/google/callback] received", {
    hasCode: Boolean(code),
    hasState: Boolean(state),
    hasExpectedState: Boolean(expectedState),
    statePreview: state?.slice(0, 8) ?? null,
    expectedStatePreview: expectedState?.slice(0, 8) ?? null,
    cookieNames: cookieStore.getAll().map((cookie) => cookie.name),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    userAgent: request.headers.get("user-agent"),
  });

  if (oauthError) {
    console.warn("[auth/google/callback] oauth provider error", { oauthError });
    return buildErrorRedirect("google_login_cancelled");
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    console.warn("[auth/google/callback] state validation failed", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasExpectedState: Boolean(expectedState),
      statePreview: state?.slice(0, 8) ?? null,
      expectedStatePreview: expectedState?.slice(0, 8) ?? null,
    });
    return buildErrorRedirect("google_state_invalid");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: buildGoogleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    console.warn("[auth/google/callback] token exchange failed", {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
    });
    return buildErrorRedirect("google_token_failed");
  }

  const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!userInfoResponse.ok) {
    console.warn("[auth/google/callback] userinfo failed", {
      status: userInfoResponse.status,
      statusText: userInfoResponse.statusText,
    });
    return buildErrorRedirect("google_userinfo_failed");
  }

  const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

  if (!userInfo.email || !userInfo.email_verified) {
    console.warn("[auth/google/callback] email not verified", {
      hasEmail: Boolean(userInfo.email),
      emailVerified: userInfo.email_verified,
    });
    return buildErrorRedirect("google_email_not_verified");
  }

  const email = userInfo.email.trim().toLowerCase();

  const user = await db.$transaction(async (tx) => {
    const linkedUser = await tx.user.findUnique({
      where: { googleId: userInfo.sub },
    });

    if (linkedUser) {
      return linkedUser;
    }

    const existingUser = await tx.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return tx.user.update({
        where: { id: existingUser.id },
        data: {
          googleId: userInfo.sub,
        },
      });
    }

    const createdUser = await tx.user.create({
      data: {
        email,
        googleId: userInfo.sub,
        passwordHash: `google-oauth:${randomUUID()}`,
      },
    });

    await grantSignupCredits(createdUser.id, tx);

    return createdUser;
  });

  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const response = NextResponse.redirect(new URL("/", env.APP_URL ?? "http://localhost:3000"));
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    ...buildSessionCookieOptions(60 * 60 * 24 * 7),
  });

  response.cookies.set({
    name: GOOGLE_AUTH_STATE_COOKIE_NAME,
    value: "",
    ...buildOAuthStateCookieOptions(0),
  });

  console.info("[auth/google/callback] login success", {
    userId: user.id,
    email,
  });

  return response;
}
