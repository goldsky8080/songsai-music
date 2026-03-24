import { z } from "zod";

/**
 * 음악 생성 요청 검증 스키마.
 * 프론트 검증이 있어도 서버에서 한 번 더 막아야 DB와 외부 API가 안전해진다.
 */
export const createMusicSchema = z.object({
  title: z.string().min(1).max(120),
  lyrics: z.string().min(10).max(5000),
  stylePrompt: z.string().min(2).max(500),
  lyricMode: z.enum(["manual", "auto"]).default("manual"),
  vocalGender: z.enum(["auto", "female", "male"]).default("auto"),
  trackCount: z.union([z.literal(1), z.literal(2)]).default(2),
  modelVersion: z.enum(["v4_5_plus", "v5"]).default("v5"),
});

export type CreateMusicRequest = z.infer<typeof createMusicSchema>;
