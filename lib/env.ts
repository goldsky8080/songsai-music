import { z } from "zod";

const emptyStringToUndefined = z.preprocess((value) => {
  if (value === "") {
    return undefined;
  }

  return value;
}, z.string().optional());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).optional(),
  SUNO_COOKIE: emptyStringToUndefined,
  SUNO_API_BASE_URL: z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional()),
  MUSIC_PROVIDER_MODE: z.enum(["mock", "suno"]).default("mock"),
  APP_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(16),
});

const parsedEnv = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  SUNO_COOKIE: process.env.SUNO_COOKIE,
  SUNO_API_BASE_URL: process.env.SUNO_API_BASE_URL,
  MUSIC_PROVIDER_MODE: process.env.MUSIC_PROVIDER_MODE,
  APP_URL: process.env.APP_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
});

if (!parsedEnv.success) {
  throw new Error(`Invalid environment variables: ${parsedEnv.error.message}`);
}

export const env = parsedEnv.data;
