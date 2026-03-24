import { CreditGrantStatus, CreditKind, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  FREE_CREDIT_DAYS,
  FREE_SIGNUP_CREDITS,
  PAID_CREDIT_DAYS,
} from "@/server/credits/constants";
import { getMusicGenerationCost } from "@/server/music/constants";

// 만료일 계산을 공통화하기 위한 유틸리티.
function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

/**
 * CreditGrant 원장을 기준으로 실제 사용 가능한 잔액을 다시 계산해 user 테이블에 반영한다.
 * User.freeCredits / paidCredits 는 조회 성능용 캐시 필드이므로 중요한 작업 전 동기화가 필요하다.
 */
export async function syncUserCreditBalances(userId: string, tx?: Prisma.TransactionClient) {
  const client = tx ?? db;
  const now = new Date();

  await client.creditGrant.updateMany({
    where: {
      userId,
      status: CreditGrantStatus.ACTIVE,
      expiresAt: {
        lte: now,
      },
      remainingAmount: {
        gt: 0,
      },
    },
    data: {
      remainingAmount: 0,
      status: CreditGrantStatus.EXPIRED,
      updatedAt: now,
    },
  });

  const grants = await client.creditGrant.findMany({
    where: {
      userId,
      status: CreditGrantStatus.ACTIVE,
      remainingAmount: {
        gt: 0,
      },
      expiresAt: {
        gt: now,
      },
    },
    select: {
      creditKind: true,
      remainingAmount: true,
    },
  });

  const freeCredits = grants
    .filter((grant) => grant.creditKind === CreditKind.FREE)
    .reduce((sum, grant) => sum + grant.remainingAmount, 0);

  const paidCredits = grants
    .filter((grant) => grant.creditKind === CreditKind.PAID)
    .reduce((sum, grant) => sum + grant.remainingAmount, 0);

  await client.user.update({
    where: { id: userId },
    data: {
      freeCredits,
      paidCredits,
    },
  });

  return {
    freeCredits,
    paidCredits,
    totalCredits: freeCredits + paidCredits,
  };
}

/**
 * 회원가입 즉시 지급되는 무료 크레딧을 생성한다.
 * 원장(CreditGrant), 회계 로그(Transaction), 캐시 잔액(User)을 함께 맞춰 둔다.
 */
export async function grantSignupCredits(userId: string, tx: Prisma.TransactionClient) {
  const now = new Date();
  const expiresAt = addDays(now, FREE_CREDIT_DAYS);

  await tx.creditGrant.create({
    data: {
      userId,
      creditKind: CreditKind.FREE,
      amount: FREE_SIGNUP_CREDITS,
      remainingAmount: FREE_SIGNUP_CREDITS,
      expiresAt,
      source: "signup_bonus",
    },
  });

  await tx.transaction.create({
    data: {
      userId,
      amount: FREE_SIGNUP_CREDITS,
      creditKind: CreditKind.FREE,
      type: "DEPOSIT",
      status: "COMPLETED",
      balanceAfter: FREE_SIGNUP_CREDITS,
      memo: "회원가입 무료 크레딧 지급",
    },
  });

  await tx.user.update({
    where: { id: userId },
    data: {
      freeCredits: FREE_SIGNUP_CREDITS,
      paidCredits: 0,
    },
  });

  return {
    expiresAt,
  };
}

export function getCreditExpiryDays(creditKind: CreditKind) {
  return creditKind === CreditKind.FREE ? FREE_CREDIT_DAYS : PAID_CREDIT_DAYS;
}

/**
 * 음악 생성 시점에 크레딧을 선차감한다.
 * 정책상 무료 크레딧을 먼저 쓰고, 부족하면 유료 크레딧을 이어서 차감한다.
 */
export async function consumeMusicGenerationCredits(
  userId: string,
  musicId: string,
  trackCount: 1 | 2,
  tx: Prisma.TransactionClient,
) {
  const generationCost = getMusicGenerationCost(trackCount);
  const balances = await syncUserCreditBalances(userId, tx);

  if (balances.totalCredits < generationCost) {
    throw new Error("크레딧이 부족합니다.");
  }

  let remainingCost = generationCost;

  const grants = await tx.creditGrant.findMany({
    where: {
      userId,
      status: CreditGrantStatus.ACTIVE,
      remainingAmount: {
        gt: 0,
      },
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: [
      { creditKind: "asc" },
      { expiresAt: "asc" },
      { createdAt: "asc" },
    ],
  });

  let freeSpent = 0;
  let paidSpent = 0;

  // grant 단위 차감을 유지해야 만료/환불 이력이 정확해진다.
  for (const grant of grants) {
    if (remainingCost <= 0) {
      break;
    }

    const deductAmount = Math.min(grant.remainingAmount, remainingCost);
    const nextRemaining = grant.remainingAmount - deductAmount;

    await tx.creditGrant.update({
      where: { id: grant.id },
      data: {
        remainingAmount: nextRemaining,
        lastUsedAt: new Date(),
        status: nextRemaining === 0 ? CreditGrantStatus.CONSUMED : CreditGrantStatus.ACTIVE,
      },
    });

    if (grant.creditKind === CreditKind.FREE) {
      freeSpent += deductAmount;
    } else {
      paidSpent += deductAmount;
    }

    remainingCost -= deductAmount;
  }

  const nextFreeCredits = balances.freeCredits - freeSpent;
  const nextPaidCredits = balances.paidCredits - paidSpent;

  if (freeSpent > 0) {
    await tx.transaction.create({
      data: {
        userId,
        amount: -freeSpent,
        creditKind: CreditKind.FREE,
        type: "USAGE",
        status: "COMPLETED",
        balanceAfter: nextFreeCredits,
        memo: `music_generation:${musicId}`,
      },
    });
  }

  if (paidSpent > 0) {
    await tx.transaction.create({
      data: {
        userId,
        amount: -paidSpent,
        creditKind: CreditKind.PAID,
        type: "USAGE",
        status: "COMPLETED",
        balanceAfter: nextPaidCredits,
        memo: `music_generation:${musicId}`,
      },
    });
  }

  await tx.user.update({
    where: { id: userId },
    data: {
      freeCredits: nextFreeCredits,
      paidCredits: nextPaidCredits,
    },
  });

  return {
    chargedAmount: generationCost,
    freeSpent,
    paidSpent,
  };
}

/**
 * provider 요청 실패 시 선차감한 크레딧을 되돌린다.
 * 단순 숫자 복원이 아니라 새로운 refund grant 와 refund transaction 을 남겨 회계 이력을 보존한다.
 */
export async function refundMusicGenerationCredits(userId: string, musicId: string) {
  const usageTransactions = await db.transaction.findMany({
    where: {
      userId,
      type: "USAGE",
      status: "COMPLETED",
      memo: `music_generation:${musicId}`,
    },
  });

  if (usageTransactions.length === 0) {
    return;
  }

  await db.$transaction(async (tx) => {
    await syncUserCreditBalances(userId, tx);

    const currentUser = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        freeCredits: true,
        paidCredits: true,
      },
    });

    let freeCredits = currentUser.freeCredits;
    let paidCredits = currentUser.paidCredits;

    for (const entry of usageTransactions) {
      const refundAmount = Math.abs(entry.amount);
      const creditKind = entry.creditKind ?? CreditKind.PAID;

      await tx.creditGrant.create({
        data: {
          userId,
          creditKind,
          amount: refundAmount,
          remainingAmount: refundAmount,
          expiresAt: addDays(new Date(), getCreditExpiryDays(creditKind)),
          source: `refund:${musicId}`,
        },
      });

      if (creditKind === CreditKind.FREE) {
        freeCredits += refundAmount;
      } else {
        paidCredits += refundAmount;
      }

      await tx.transaction.create({
        data: {
          userId,
          amount: refundAmount,
          creditKind,
          type: "REFUND",
          status: "COMPLETED",
          balanceAfter: creditKind === CreditKind.FREE ? freeCredits : paidCredits,
          memo: `music_generation_refund:${musicId}`,
        },
      });

      await tx.transaction.update({
        where: { id: entry.id },
        data: {
          status: "CANCELLED",
          memo: `music_generation:${musicId}:refunded`,
        },
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        freeCredits,
        paidCredits,
      },
    });
  });
}
