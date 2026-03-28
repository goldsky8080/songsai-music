import { type Prisma, type UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicUser } from "@/server/auth/user";
import { canAccessAdminPage, isOperator } from "@/server/auth/guards";
import { setUserCreditBalances, syncUserCreditBalances } from "@/server/credits/service";

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

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !canAccessAdminPage(sessionUser.role)) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "10", 10) || 10),
  );

  const where: Prisma.UserWhereInput = query
    ? {
        email: {
          contains: query,
          mode: "insensitive",
        },
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
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
    }),
    db.user.count({ where }),
  ]);

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
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
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

  const { userId, role, tier, freeCredits, paidCredits } = parsed.data;

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

    const currentBalances = await syncUserCreditBalances(userId, tx);
    const targetFreeCredits = freeCredits ?? currentBalances.freeCredits;
    const targetPaidCredits = paidCredits ?? currentBalances.paidCredits;

    await setUserCreditBalances(
      userId,
      targetFreeCredits,
      targetPaidCredits,
      `admin-set:${sessionUser.id}`,
      "admin updated credit balances",
      tx,
    );

    return tx.user.findUniqueOrThrow({
      where: { id: userId },
    });
  });

  return NextResponse.json({ item: toPublicUser(updatedUser) });
}
