import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canAccessAdminPage, isOperator } from "@/server/auth/guards";
import { generateUniqueCouponCode } from "@/server/coupons/service";

const createCouponSchema = z.object({
  amount: z.number().int().min(1).max(1_000_000),
  maxUses: z.number().int().min(1).max(100_000),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !canAccessAdminPage(sessionUser.role)) {
    return unauthorized();
  }

  const coupons = await db.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
      _count: {
        select: {
          redemptions: true,
        },
      },
    },
  });

  return NextResponse.json({
    items: coupons.map((coupon) => ({
      id: coupon.id,
      code: coupon.code,
      amount: coupon.amount,
      remainingUses: coupon.remainingUses,
      maxUses: coupon.maxUses,
      isActive: coupon.isActive,
      usedCount: coupon._count.redemptions,
      createdAt: coupon.createdAt,
      createdBy: coupon.createdBy,
    })),
  });
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !isOperator(sessionUser.role)) {
    return unauthorized();
  }

  const parsed = createCouponSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "금액과 사용 횟수를 확인해 주세요." }, { status: 400 });
  }

  const coupon = await db.$transaction(async (tx) => {
    const code = await generateUniqueCouponCode(tx);

    return tx.coupon.create({
      data: {
        code,
        amount: parsed.data.amount,
        remainingUses: parsed.data.maxUses,
        maxUses: parsed.data.maxUses,
        createdById: sessionUser.id,
      },
    });
  });

  return NextResponse.json({ item: coupon }, { status: 201 });
}
