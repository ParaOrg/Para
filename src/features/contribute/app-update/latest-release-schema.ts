import * as z from 'zod/mini';

import { versionCodeOf } from './version-code';

/**
 * latest.json, a GitHub Release asset written by the release workflow
 * (scripts/publish/app-release.mjs): the newest signed APK, and the oldest version that may still
 * record. The download link opens in the browser, so only https on GitHub is accepted.
 */
export const latestReleaseSchema = z.object({
  version: z.string().check(z.minLength(1)),
  versionCode: z.int().check(z.positive()),
  url: z.url({ protocol: /^https$/, hostname: /^github\.com$/ }),
  minVersion: z.string().check(z.refine((name) => versionCodeOf(name) !== null)),
});

export type LatestRelease = z.infer<typeof latestReleaseSchema>;
