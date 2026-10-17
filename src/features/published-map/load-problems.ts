import { MAP_FILE_TOO_NEW } from '@/features/routes/published/map-file';

/** One thing read from the published map: its error, if any, and how to read it again. */
export interface MapFileSource {
  error: unknown;
  reload: () => unknown;
}

export interface LoadProblems {
  /** Any of them failed to load. */
  loadFailed: boolean;
  /** Any of them is a map file newer than this app can read. */
  tooNew: boolean;
  /** Reads every one of them again, in order. */
  tryAgain: () => void;
}

/** What the page's notices say about loading the published map (Notices). */
export function loadProblems(sources: readonly MapFileSource[]): LoadProblems {
  return {
    loadFailed: sources.some((s) => !!s.error),
    tooNew: sources.some((s) => s.error === MAP_FILE_TOO_NEW),
    tryAgain: () => {
      for (const s of sources) void s.reload();
    },
  };
}
