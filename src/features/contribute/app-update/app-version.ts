import type { LatestRelease } from './latest-release-schema';
import { versionCodeOf } from './version-code';

export type AppUpdate = 'current' | 'available' | 'required';

/**
 * Whether the installed app, known by its version code, is up to date, behind the latest release,
 * or below the version the release says it still supports.
 */
export function updateOf(installedCode: number, latest: LatestRelease): AppUpdate {
  const minimumCode = versionCodeOf(latest.minVersion);
  if (minimumCode !== null && installedCode < minimumCode) return 'required';
  return installedCode < latest.versionCode ? 'available' : 'current';
}
