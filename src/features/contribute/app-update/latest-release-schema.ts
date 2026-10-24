import * as z from 'zod/mini';

/**
 * /app/latest.json, written by the release workflow (scripts/publish/app-release.mjs): the newest
 * signed APK, and the oldest version that may still record.
 */
export const latestReleaseSchema = z.object({
  version: z.string().check(z.minLength(1)),
  versionCode: z.int().check(z.positive()),
  url: z.url(),
  minVersion: z.string().check(z.regex(/^\d+\.\d+\.\d+$/)),
});

export type LatestRelease = z.infer<typeof latestReleaseSchema>;
