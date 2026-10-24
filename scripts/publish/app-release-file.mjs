// latest.json as the release workflow writes it (app-release.mjs), on its own so a unit
// check can hold the very text (tests/unit/app-update-test.mjs) without a build. The file's
// shape is the app's own schema (src/features/contribute/app-update/latest-release-schema.ts):
// it is read back with it before it is written.
import { versionCodeOf } from '../../src/features/contribute/app-update/app-version.ts';
import { latestReleaseSchema } from '../../src/features/contribute/app-update/latest-release-schema.ts';

/**
 * The text of latest.json for a release. `apkUrl` is where the APK is downloaded from.
 * A version that is major.minor.patch must carry the code the workflow derives from it, and may
 * not sit below its own minimum: either would strand or nag every phone.
 */
export function latestReleaseText({ version, versionCode, minVersion, apkUrl }) {
  const derived = versionCodeOf(version);
  if (derived !== null && derived !== versionCode) {
    throw new Error(`version ${version} has code ${derived}, not ${versionCode}`);
  }
  const minimumCode = versionCodeOf(minVersion);
  if (minimumCode !== null && minimumCode > versionCode) {
    throw new Error(`minVersion ${minVersion} is newer than the release ${version}`);
  }
  const file = { version, versionCode, url: apkUrl, minVersion };
  const read = latestReleaseSchema.safeParse(file);
  if (!read.success) {
    throw new Error(`not a release file the app reads: ${read.error.issues[0]?.message}`);
  }
  return JSON.stringify(file, null, 2) + '\n';
}
