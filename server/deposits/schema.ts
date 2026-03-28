import { z } from "zod";

export const createDepositRequestSchema = z.object({
  requestedAmount: z.number().int().min(5000).max(1_000_000),
  requestedCredits: z.number().int().min(1).max(1_000_000),
  depositorName: z.string().trim().min(2).max(40),
});

