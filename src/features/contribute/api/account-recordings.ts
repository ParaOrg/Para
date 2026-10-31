import type { Recording } from '../storage/recording-schema';

/**
 * The recordings on this phone that go when the account `accountId` is deleted: every one, sent
 * or not, except an upload another identity made. That one is still in Para under someone else
 * (an earlier account signed in on this phone), and its copy here is the only way to remove it.
 * A recording never sent belongs to whoever is signed in: Delete account says so before it asks.
 */
export function recordingsOfAccount(
  recordings: readonly Recording[],
  accountId: string,
): Recording[] {
  return recordings.filter(
    (recording) => recording.upload?.state !== 'uploaded' || recording.upload.by === accountId,
  );
}
