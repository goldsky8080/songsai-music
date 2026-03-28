import { z } from "zod";

const emptyStringToUndefined = z.preprocess((value) => {
  if (value === "") {
    return undefined;
  }

  return value;
}, z.string().optional());

const providerModeSchema = z.preprocess((value) => {
  if (value === "suno") {
    return "songs";
  }

  return value;
}, z.enum(["mock", "songs"]).default("mock"));

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).optional(),
  SONGS_COOKIE: emptyStringToUndefined,
  SONGS_API_BASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
  MUSIC_PROVIDER_MODE: providerModeSchema,
  APP_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(16),
  GOOGLE_CLIENT_ID: emptyStringToUndefined,
  GOOGLE_CLIENT_SECRET: emptyStringToUndefined,
  BANK_TRANSFER_BANK_NAME: emptyStringToUndefined,
  BANK_TRANSFER_ACCOUNT_NUMBER: emptyStringToUndefined,
  SONGSAI_INTERNAL_SECRET: emptyStringToUndefined,
});

const parsedEnv = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  SONGS_COOKIE: process.env.SONGS_COOKIE ?? process.env.SUNO_COOKIE,
  SONGS_API_BASE_URL: process.env.SONGS_API_BASE_URL ?? process.env.SUNO_API_BASE_URL,
  MUSIC_PROVIDER_MODE: process.env.MUSIC_PROVIDER_MODE,
  APP_URL: process.env.APP_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  BANK_TRANSFER_BANK_NAME: process.env.BANK_TRANSFER_BANK_NAME,
  BANK_TRANSFER_ACCOUNT_NUMBER: process.env.BANK_TRANSFER_ACCOUNT_NUMBER,
  SONGSAI_INTERNAL_SECRET: process.env.SONGSAI_INTERNAL_SECRET,
});

if (!parsedEnv.success) {
  throw new Error(`Invalid environment variables: ${parsedEnv.error.message}`);
}

export const env = parsedEnv.data;
