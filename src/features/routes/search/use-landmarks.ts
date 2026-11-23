import { useState } from 'react';

import { retryingImport } from '@/shared/utils/retrying-import';

import { searchableLandmarks, type SearchLandmark } from '../model/landmark-search';
import type { LandmarkFileRead } from '../published/fetch-landmarks';

/** Where the landmarks come from: the file, or a stand-in (stories). */
export type LoadLandmarks = () => Promise<LandmarkFileRead>;

/** The landmarks ready to search, with the credit their licence asks for. */
export interface Landmarks {
  /** Every landmark, its names folded once (searchableLandmarks). */
  landmarks: SearchLandmark[];
  /** "© OpenStreetMap contributors". */
  attribution: string;
}

export type LandmarksState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; landmarks: Landmarks }
  | { status: 'failed' };

/** The reader and the file, fetched the first time a search asks: the page carries neither. */
const loadFromFile: LoadLandmarks = () =>
  retryingImport(() => import('../published/fetch-landmarks'))().then((reader) =>
    reader.fetchLandmarks(),
  );

/**
 * The OpenStreetMap landmarks for place search (decision 7): nothing until `ask`, which the
 * search calls as the first letter is typed. A failure stays a failure until `retry`, so a
 * commuter offline is not refetching on every keystroke.
 */
export function useLandmarks(load: LoadLandmarks = loadFromFile) {
  const [state, setState] = useState<LandmarksState>({ status: 'idle' });

  const start = () => {
    setState({ status: 'loading' });
    load().then(
      (read) =>
        setState({
          status: 'ready',
          landmarks: {
            landmarks: searchableLandmarks(read.landmarks),
            attribution: read.attribution,
          },
        }),
      (error: unknown) => {
        console.warn('Place search could not read the landmarks.', error);
        setState({ status: 'failed' });
      },
    );
  };

  return {
    state,
    /** Load the landmarks once; nothing while loading, loaded or failed. */
    ask: () => {
      if (state.status === 'idle') start();
    },
    /** Load them again after a failure. */
    retry: () => {
      if (state.status === 'failed') start();
    },
  };
}
