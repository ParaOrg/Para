import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { historyKeys } from './history-keys';
import { mergeHistory } from './history-merge';
import { rideFactsOf, storedFactsOf, uploadFactsOf, type RideFacts } from './ride-facts';
import { accountKeys } from '../api/account-keys';
import { UploadError } from '../api/upload-problem';
import { useAccountUploadsQuery } from '../api/use-account-uploads-query';
import { useRemoveAccountUploadMutation } from '../api/use-remove-account-upload-mutation';
import { fixOfRow } from '../recorder/recording-fixes';
import type { Recording } from '../storage/recording-schema';
import { loadFixes, updateRecording } from '../storage/recording-store';
import type { UploadStatus } from '../uploads/upload-state';
import type { Uploads } from '../uploads/use-uploads';

/** Whether the account's uploads from the database have arrived, with the one line if they could not. */
export interface HistoryLoad {
  state: 'loading' | 'ready' | 'error';
  message: string | null;
  onRetry: () => void;
}

export interface HistoryItems {
  recordings: readonly Recording[];
  uploads: Uploads;
  /** Whether the recording is kept on this phone; an upload from another phone is not. */
  isOnPhone: (recording: Recording) => boolean;
  /** Its distance and trail: read from its fixes on this phone, or what the database keeps of an upload from another; null until read. */
  factsOf: (recording: Recording) => RideFacts | null;
  load: HistoryLoad;
}

/** A build with no database never asks (the query is idle), so there is nothing to wait for. */
function loadStateOf(query: {
  isError: boolean;
  isPending: boolean;
  fetchStatus: string;
}): HistoryLoad['state'] {
  if (query.isError) return 'error';
  if (query.isPending && query.fetchStatus !== 'idle') return 'loading';
  return 'ready';
}

const loadMessageOf = (error: unknown): string =>
  error instanceof UploadError && error.problem === 'offline'
    ? "No signal — can't load your uploads"
    : "Can't load your uploads right now";

const removeBriefOf = (error: unknown): string =>
  error instanceof UploadError && error.problem === 'offline'
    ? 'No signal'
    : "Para isn't taking this now";

/**
 * A recording's facts from its fixes, the one read History makes of them: for its trail, when it
 * has no picture, and for its distance, when it was saved before the distance was kept. That
 * distance is written back, so the next opening need not read the fixes for it.
 */
async function factsFromFixes(recording: Recording): Promise<RideFacts> {
  const facts = rideFactsOf(recording, (await loadFixes(recording.id)).map(fixOfRow));
  if (recording.distanceM === undefined) {
    updateRecording(recording.id, (stored) => ({ ...stored, distanceM: facts.distanceM })).catch(
      (error: unknown) => {
        // Not kept: the next opening works it out again. Nothing on the card is lost.
        console.warn("A recording's distance could not be kept on the phone.", error);
      },
    );
  }
  return facts;
}

/**
 * What History lists: this phone's recordings merged with the account's uploads from the
 * database, whichever phone sent them. Any upload the account owns can be removed. A recording's
 * fixes are read only when its card needs them: no distance kept, or no picture to show
 * (`pictures`, unknown until they are read).
 */
export function useHistoryItems(
  saved: readonly Recording[],
  uploads: Uploads,
  pictures: ReadonlyMap<string, string> | undefined,
): HistoryItems {
  const queryClient = useQueryClient();
  const query = useAccountUploadsQuery();
  const removal = useRemoveAccountUploadMutation();
  const needsFixes = saved.filter(
    (recording) =>
      recording.distanceM === undefined || (pictures !== undefined && !pictures.has(recording.id)),
  );
  // Read in one go and drawn once: a query a recording redrew the whole list as each came.
  const factsQuery = useQuery({
    queryKey: historyKeys.facts(needsFixes.map((recording) => recording.id)),
    queryFn: async () =>
      new Map(
        await Promise.all(
          needsFixes.map(
            async (recording) => [recording.id, await factsFromFixes(recording)] as const,
          ),
        ),
      ),
    enabled: needsFixes.length > 0,
    // A saved recording's fixes never change, so they are read once a History opening.
    staleTime: Infinity,
  });
  // A stable reference for each, so a card's facts change only when they do.
  const storedFacts = useMemo(
    () => new Map(saved.map((recording) => [recording.id, storedFactsOf(recording)])),
    [saved],
  );
  const accountUploads = query.data ?? [];
  const ownedIds = new Set(accountUploads.map((upload) => upload.id));
  const uploadById = new Map(accountUploads.map((upload) => [upload.id, upload]));
  const onPhoneIds = new Set(saved.map((recording) => recording.id));

  const isOnPhone = (recording: Recording) => onPhoneIds.has(recording.id);

  const statusOf = (recording: Recording): UploadStatus => {
    if (isOnPhone(recording)) return uploads.statusOf(recording);
    const status: UploadStatus = { state: 'uploaded', at: recording.startedAt, by: '' };
    if (removal.variables !== recording.id) return status;
    if (removal.isPending) return { state: 'removing' };
    if (removal.isError)
      return { ...status, problem: `Not removed. ${removeBriefOf(removal.error)}` };
    return status;
  };

  const canRemove = (recording: Recording): boolean =>
    uploads.canRemove(recording) ||
    (ownedIds.has(recording.id) && statusOf(recording).state === 'uploaded');

  const removeUploaded = async (recording: Recording): Promise<void> => {
    if (!isOnPhone(recording)) {
      removal.mutate(recording.id);
      return;
    }
    await uploads.removeUploaded(recording);
    await queryClient.invalidateQueries({ queryKey: accountKeys.uploads() });
  };

  return {
    recordings: mergeHistory(saved, accountUploads),
    uploads: { ...uploads, statusOf, canRemove, removeUploaded },
    isOnPhone,
    factsOf: (recording) => {
      if (isOnPhone(recording)) {
        return factsQuery.data?.get(recording.id) ?? storedFacts.get(recording.id) ?? null;
      }
      const upload = uploadById.get(recording.id);
      return upload ? uploadFactsOf(upload) : null;
    },
    load: {
      state: loadStateOf(query),
      message: query.isError ? loadMessageOf(query.error) : null,
      onRetry: () => void query.refetch(),
    },
  };
}
