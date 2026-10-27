import * as z from 'zod/mini';

const envSchema = z.object({
  VITE_APP_LATEST_URL: z.optional(z.url()),
  VITE_APP_VERSION_CODE: z.optional(z.string().check(z.regex(/^[1-9]\d*$/))),
});

const env = envSchema.safeParse(import.meta.env);

/**
 * Where the Android app looks for a newer release, and the version code it was built as. Null
 * unless the build knows both: a debug or local build then never asks. Kept apart from env.ts so
 * the web page, which never checks, does not carry it.
 */
export const appUpdateConfig: { latestUrl: string; versionCode: number } | null =
  env.success && env.data.VITE_APP_LATEST_URL && env.data.VITE_APP_VERSION_CODE
    ? {
        latestUrl: env.data.VITE_APP_LATEST_URL,
        versionCode: Number(env.data.VITE_APP_VERSION_CODE),
      }
    : null;
