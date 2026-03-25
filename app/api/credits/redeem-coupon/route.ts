import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redeemCouponCode } from "@/server/coupons/service";

const redeemCouponSchema = z.object({
  code: z.string().trim().min(1).max(20),
});

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = redeemCouponSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "쿠폰 번호를 입력해 주세요." }, { status: 400 });
  }

  try {
    const result = await db.$transaction((tx) =>
      redeemCouponCode(sessionUser.id, parsed.data.code, tx),
    );

    return NextResponse.json({
      item: result,
      message: `${result.amount.toLocaleString("ko-KR")} 무료크레딧이 충전되었습니다.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "쿠폰을 사용할 수 없습니다.",
      },
      { status: 400 },
    );
  }
}
