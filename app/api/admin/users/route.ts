import { CreditKind, type Prisma, type UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicUser } from "@/server/auth/user";
import { canAccessAdminPage, isOperator } from "@/server/auth/guards";
import { grantCredits, syncUserCreditBalances } from "@/server/credits/service";

const updateUserSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["USER", "DEVELOPER", "ADMIN"]).optional(),
  tier: z.string().trim().max(40).nullable().optional(),
  freeCredits: z.number().int().min(0).max(1_000_000).optional(),
  paidCredits: z.number().int().min(0).max(1_000_000).optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !canAccessAdminPage(sessionUser.role)) {
    return unauthorized();
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      freeCredits: true,
      paidCredits: true,
      tier: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          musics: true,
          transactions: true,
        },
      },
    },
  });

  return NextResponse.json({
    items: users.map((user) => ({
      id: user.id,
      email: user.email,
      freeCredits: user.freeCredits,
      paidCredits: user.paidCredits,
      totalCredits: user.freeCredits + user.paidCredits,
      tier: user.tier,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      musicCount: user._count.musics,
      transactionCount: user._count.transactions,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !isOperator(sessionUser.role)) {
    return unauthorized();
  }

  const parsed = updateUserSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { userId, role, tier, freeCredits = 0, paidCredits = 0 } = parsed.data;

  const updatedUser = await db.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (typeof role === "string") {
      updateData.role = role as UserRole;
    }

    if (tier !== undefined) {
      updateData.tier = tier;
    }

    if (Object.keys(updateData).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    if (freeCredits > 0) {
      await grantCredits(
        userId,
        freeCredits,
        CreditKind.FREE,
        `admin-grant:${sessionUser.id}`,
        "admin granted free credits",
        tx,
      );
    }

    if (paidCredits > 0) {
      await grantCredits(
        userId,
        paidCredits,
        CreditKind.PAID,
        `admin-grant:${sessionUser.id}`,
        "admin granted paid credits",
        tx,
      );
    }

    await syncUserCreditBalances(userId, tx);

    return tx.user.findUniqueOrThrow({
      where: { id: userId },
    });
  });

  return NextResponse.json({ item: toPublicUser(updatedUser) });
}
