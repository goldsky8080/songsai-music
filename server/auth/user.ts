import type { User } from "@prisma/client";

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    freeCredits: user.freeCredits,
    paidCredits: user.paidCredits,
    totalCredits: user.freeCredits + user.paidCredits,
    tier: user.tier,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
