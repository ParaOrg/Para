import type { LatestRelease } from './latest-release-schema';

/**
 * The version code of a version name such as 1.2.3: major * 1,000,000 + minor * 1,000 + patch,
 * the formula the release workflow gives the APK, so a newer name is always a higher code.
 * Null for a name that is not major.minor.patch.
 */
export function versionCodeOf(versionName: string): number | null {
  const parts = /^(\d+)\.(\d+)\.(\d+)$/.exec(versionName);
  if (!parts) return null;
  return Number(parts[1]) * 1_000_000 + Number(parts[2]) * 1_000 + Number(parts[3]);
}

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
