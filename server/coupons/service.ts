import { CreditKind, Prisma, type UserRole } from "@prisma/client";
import { grantCredits } from "@/server/credits/service";

const COUPON_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCouponCode(length = 6) {
  let code = "";

  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * COUPON_CODE_CHARS.length);
    code += COUPON_CODE_CHARS[randomIndex];
  }

  return code;
}

export async function generateUniqueCouponCode(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomCouponCode();
    const existingCoupon = await tx.coupon.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existingCoupon) {
      return code;
    }
  }

  throw new Error("쿠폰 코드를 생성하지 못했습니다. 다시 시도해 주세요.");
}

export function roleLabel(role: UserRole) {
  switch (role) {
    case "ADMIN":
      return "운영자";
    case "DEVELOPER":
      return "개발자";
    default:
      return "일반유저";
  }
}

export async function redeemCouponCode(
  userId: string,
  code: string,
  tx: Prisma.TransactionClient,
) {
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    throw new Error("쿠폰 번호를 입력해 주세요.");
  }

  const coupon = await tx.coupon.findUnique({
    where: { code: normalizedCode },
  });

  if (!coupon || !coupon.isActive) {
    throw new Error("사용할 수 없는 쿠폰입니다.");
  }

  if (coupon.remainingUses <= 0) {
    throw new Error("이미 모두 사용된 쿠폰입니다.");
  }

  const existingUse = await tx.couponRedemption.findUnique({
    where: {
      couponId_userId: {
        couponId: coupon.id,
        userId,
      },
    },
  });

  if (existingUse) {
    throw new Error("이 쿠폰은 계정당 1회만 사용할 수 있습니다.");
  }

  await tx.couponRedemption.create({
    data: {
      couponId: coupon.id,
      userId,
    },
  });

  await tx.coupon.update({
    where: { id: coupon.id },
    data: {
      remainingUses: {
        decrement: 1,
      },
      isActive: coupon.remainingUses - 1 > 0,
    },
  });

  await grantCredits(
    userId,
    coupon.amount,
    CreditKind.FREE,
    `coupon:${coupon.code}`,
    `coupon redeem ${coupon.code}`,
    tx,
  );

  return {
    amount: coupon.amount,
    remainingUses: coupon.remainingUses - 1,
    code: coupon.code,
  };
}
