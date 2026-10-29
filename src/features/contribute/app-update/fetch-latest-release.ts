import { latestReleaseSchema, type LatestRelease } from './latest-release-schema';
import { nativeGetText } from '../native-bridge/native-app';

/**
 * Reads and checks the release file with `getText`. Silent when the file cannot be reached (offline
 * is normal); warns when it was reached but is not what the app reads, which is a bug in the release.
 */
export async function readLatestRelease(
  url: string,
  getText: (url: string) => Promise<string>,
): Promise<LatestRelease> {
  const text = await getText(url);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    console.warn(`${url} is not JSON`);
    throw new Error(`${url} is not JSON`);
  }
  const release = latestReleaseSchema.safeParse(json);
  if (!release.success) {
    console.warn(`${url} is not a release file the app reads: ${release.error.message}`);
    throw new Error(`${url} is not a release file the app reads`);
  }
  return release.data;
}

/** The newest release, read natively; throws when it cannot be reached or is not valid. */
export function fetchLatestRelease(url: string): Promise<LatestRelease> {
  return readLatestRelease(url, nativeGetText);
}
