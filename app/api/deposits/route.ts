import { NextResponse } from "next/server";
import { DepositRequestStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getSessionUser } from "@/lib/auth";
import { createDepositRequestSchema } from "@/server/deposits/schema";

const DEFAULT_BANK_NAME = "입금계좌 준비중";
const DEFAULT_ACCOUNT_NUMBER = "운영자 설정 필요";

function getDepositAccountSnapshot() {
  return {
    bankName: env.BANK_TRANSFER_BANK_NAME ?? DEFAULT_BANK_NAME,
    accountNumber: env.BANK_TRANSFER_ACCOUNT_NUMBER ?? DEFAULT_ACCOUNT_NUMBER,
  };
}

function toDepositRequestItem(
  item: {
    id: string;
    requestedAmount: number;
    requestedCredits: number;
    depositorName: string;
    bankName: string;
    accountNumberSnapshot: string;
    status: DepositRequestStatus;
    autoMatchedAt: Date | null;
    matchedNotificationId: string | null;
    approvedBy: string | null;
    approvedAt: Date | null;
    rejectedAt: Date | null;
    memo: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
) {
  return {
    id: item.id,
    requestedAmount: item.requestedAmount,
    requestedCredits: item.requestedCredits,
    depositorName: item.depositorName,
    bankName: item.bankName,
    accountNumberSnapshot: item.accountNumberSnapshot,
    status: item.status,
    autoMatchedAt: item.autoMatchedAt,
    matchedNotificationId: item.matchedNotificationId,
    approvedBy: item.approvedBy,
    approvedAt: item.approvedAt,
    rejectedAt: item.rejectedAt,
    memo: item.memo,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db.depositRequest.findMany({
    where: { userId: sessionUser.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    account: getDepositAccountSnapshot(),
    items: items.map(toDepositRequestItem),
  });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createDepositRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "잘못된 요청입니다.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { requestedAmount, requestedCredits, depositorName } = parsed.data;

  if (requestedCredits < requestedAmount) {
    return NextResponse.json(
      {
        error: "지급 예정 크레딧은 요청 금액보다 작을 수 없습니다.",
      },
      { status: 400 },
    );
  }

  const account = getDepositAccountSnapshot();

  const created = await db.depositRequest.create({
    data: {
      userId: sessionUser.id,
      requestedAmount,
      requestedCredits,
      depositorName,
      bankName: account.bankName,
      accountNumberSnapshot: account.accountNumber,
      status: DepositRequestStatus.PENDING,
    },
  });

  return NextResponse.json(
    {
      message: "입금 요청이 등록되었습니다. 입금 후 관리자 확인을 기다려 주세요.",
      account,
      item: toDepositRequestItem(created),
    },
    { status: 201 },
  );
}

