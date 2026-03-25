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
  return NextResponse.redirect(url);
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

  if (oauthError) {
    return buildErrorRedirect("google_login_cancelled");
  }

  if (!code || !state || !expectedState || state !== expectedState) {
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
    return buildErrorRedirect("google_token_failed");
  }

  const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!userInfoResponse.ok) {
    return buildErrorRedirect("google_userinfo_failed");
  }

  const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

  if (!userInfo.email || !userInfo.email_verified) {
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

  return response;
}
