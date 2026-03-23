import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { syncUserCreditBalances } from "@/server/credits/service";
import { toPublicUser } from "@/server/auth/user";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.$transaction(async (tx) => {
    await syncUserCreditBalances(sessionUser.id, tx);
    return tx.user.findUnique({
      where: { id: sessionUser.id },
    });
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ item: toPublicUser(user) });
}
