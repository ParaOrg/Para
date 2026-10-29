import type { Recording } from '../storage/recording-schema';
import type { UploadStatus } from '../uploads/upload-state';

/** The id of History's heading, which focus returns to after a card is deleted from it. */
export const HISTORY_HEADING_ID = 'history-heading';

export type HistoryGroupKey = 'not-uploaded' | 'uploaded' | 'on-phone';

interface HistoryGroup {
  key: HistoryGroupKey;
  /** The heading, which says what every card under it has in common. */
  title: string;
}

/** In the order History lists them: what still needs sending comes first. */
export const HISTORY_GROUPS: readonly HistoryGroup[] = [
  { key: 'not-uploaded', title: 'Not uploaded' },
  { key: 'uploaded', title: 'Uploaded' },
  { key: 'on-phone', title: 'Only on this phone' },
];

/** Which group a recording sits in, by where its upload stands. */
export function groupOf(status: UploadStatus): HistoryGroupKey {
  switch (status.state) {
    case 'waiting':
    case 'checking':
    case 'uploading':
    case 'failed':
      return 'not-uploaded';
    case 'uploaded':
    case 'removing':
      return 'uploaded';
    case 'removed':
    case 'held':
    case 'unavailable':
      return 'on-phone';
  }
}

export interface Grouped {
  recording: Recording;
  status: UploadStatus;
}

/** The recordings split into History's groups, each in the order given, empty groups left out. */
export function groupRecordings(
  recordings: readonly Recording[],
  statusOf: (recording: Recording) => UploadStatus,
): { group: HistoryGroup; items: Grouped[] }[] {
  const items = recordings.map((recording) => ({ recording, status: statusOf(recording) }));
  return HISTORY_GROUPS.map((group) => ({
    group,
    items: items.filter((item) => groupOf(item.status) === group.key),
  })).filter(({ items: inGroup }) => inGroup.length > 0);
}

export type StatusIcon = 'clock' | 'reload' | 'alert';

export interface StatusLine {
  icon: StatusIcon;
  /** One short word or phrase: Waiting, Uploading, Will retry, Failed. */
  word: string;
  /** Why, in a few words, where there is a reason. */
  reason?: string;
  isError: boolean;
}

/**
 * The one line a card shows for an upload that is not settled, whose last action failed, or that
 * this phone cannot take back. A plainly settled upload has none: its group says it.
 */
export function statusLineOf(status: UploadStatus, canRemove: boolean): StatusLine | null {
  switch (status.state) {
    case 'waiting':
      return { icon: 'clock', word: 'Waiting', isError: false };
    case 'checking':
      return { icon: 'clock', word: 'Waiting', reason: 'Person check', isError: false };
    case 'uploading':
      return { icon: 'reload', word: 'Uploading', isError: false };
    case 'removing':
      return { icon: 'reload', word: 'Removing', isError: false };
    case 'failed':
      return status.willRetry
        ? { icon: 'clock', word: 'Will retry', reason: status.brief, isError: false }
        : { icon: 'alert', word: 'Failed', reason: status.brief, isError: true };
    case 'uploaded':
      if (status.problem) return { icon: 'alert', word: status.problem, isError: true };
      return canRemove
        ? null
        : { icon: 'alert', word: 'Uploaded from an earlier sign-in', isError: false };
    case 'removed':
      return status.byEditor
        ? { icon: 'alert', word: 'Removed by an editor', isError: false }
        : null;
    case 'held':
    case 'unavailable':
      return null;
  }
}
