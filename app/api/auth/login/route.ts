import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Email/password login has been disabled. Please sign in with Google." },
    { status: 410 },
  );
}
