import { latestReleaseSchema, type LatestRelease } from './latest-release-schema';

/** Reads the release file; throws when it cannot be reached or is not what the app reads. */
export async function fetchLatestRelease(url: string): Promise<LatestRelease> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} answered HTTP ${response.status}`);
  return latestReleaseSchema.parse(await response.json());
}
