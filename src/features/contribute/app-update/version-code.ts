/** The largest major version: its code stays under Android's limit of 2,147,483,647. */
const MAX_MAJOR = 2100;

/**
 * The version code of a version name such as 1.2.3: major * 1,000,000 + minor * 1,000 + patch,
 * the formula the release workflow gives the APK, so a newer name is always a higher code.
 * Null for a name that is not major (up to 2100).minor (up to 999).patch (up to 999).
 */
export function versionCodeOf(versionName: string): number | null {
  const parts = /^([0-9]{1,4})\.([0-9]{1,3})\.([0-9]{1,3})$/.exec(versionName);
  if (!parts || Number(parts[1]) > MAX_MAJOR) return null;
  return Number(parts[1]) * 1_000_000 + Number(parts[2]) * 1_000 + Number(parts[3]);
}
