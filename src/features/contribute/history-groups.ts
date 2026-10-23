import type { Recording } from './recording-schema';
import type { UploadStatus } from './use-uploads';

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
 * The one line a card shows for an upload that is not settled, or whose last action failed. A
 * settled upload has none: its group says it.
 */
export function statusLineOf(status: UploadStatus): StatusLine | null {
  switch (status.state) {
    case 'waiting':
    case 'checking':
      return { icon: 'clock', word: 'Waiting', isError: false };
    case 'uploading':
      return { icon: 'reload', word: 'Uploading', isError: false };
    case 'removing':
      return { icon: 'reload', word: 'Removing', isError: false };
    case 'failed':
      return status.willRetry
        ? { icon: 'clock', word: 'Will retry', reason: status.brief, isError: false }
        : { icon: 'alert', word: 'Failed', reason: status.brief, isError: true };
    case 'uploaded':
      return status.problem ? { icon: 'alert', word: status.problem, isError: true } : null;
    case 'removed':
      return status.byEditor
        ? { icon: 'alert', word: 'Removed by an editor', isError: false }
        : null;
    case 'unavailable':
      return null;
  }
}
