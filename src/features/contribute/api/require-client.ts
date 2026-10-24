import { contributeClient, type ContributeClient } from './contribute-client';
import { UploadError } from './upload-problem';

/** The page's client, or the UploadError that says why there is none: no database, or its code did not load. */
export async function requireClient(): Promise<ContributeClient> {
  const client = contributeClient();
  if (!client) throw new UploadError('unavailable', 'This page has no database to upload to.');
  try {
    return await client;
  } catch (error) {
    // The client's own code did not load: no signal, most likely.
    throw new UploadError('offline', `The upload code did not load: ${String(error)}`);
  }
}
