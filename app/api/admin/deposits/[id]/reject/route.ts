import { NextRequest, NextResponse } from "next/server";
import { DepositRequestStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isOperator } from "@/server/auth/guards";

const rejectDepositSchema = z.object({
  memo: z.string().trim().min(1).max(300),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !isOperator(sessionUser.role)) {
    return unauthorized();
  }

  const { id } = await context.params;
  const parsed = rejectDepositSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "반려 사유를 입력해 주세요." }, { status: 400 });
  }

  try {
    const updated = await db.depositRequest.update({
      where: { id },
      data: {
        status: DepositRequestStatus.REJECTED,
        rejectedAt: new Date(),
        approvedBy: sessionUser.id,
        memo: parsed.data.memo,
      },
    });

    return NextResponse.json({
      item: updated,
      message: "입금 요청을 반려했습니다.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "입금 요청 반려에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}

