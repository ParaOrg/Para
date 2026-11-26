import { useMemo, useState } from 'react';

import type { Spot, SpotSource } from '@/features/routes/search/spot-source';
import { retryingImport } from '@/shared/utils/retrying-import';

import type { StoreSource } from './store-files';
import type { Stores } from './store-search-data';

/** Where the stores come from: the files, or a stand-in (stories). */
export type LoadStores = () => Promise<Stores>;

/** The reader and the matcher, one chunk, fetched the first time a search asks. */
const loadModule = retryingImport(() => import('./store-search-data'));
type StoreModule = Awaited<ReturnType<typeof loadModule>>;

const loadFromFiles: LoadStores = () => loadModule().then((module) => module.fetchStores());

type StoresState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; stores: Stores; module: StoreModule }
  | { status: 'failed' };

/** The stores as place search reads them, and what the credit under the results needs. */
export interface StoreSearch {
  source: Omit<SpotSource, 'credit' | 'onPick'>;
  /** The credit each source asks for, once read. */
  attribution: Stores['attribution'] | null;
  /** Which sources the listed spots come from, for the credit. */
  sourcesOf: (listed: readonly Spot[]) => StoreSource[];
}

/**
 * The studio search's stores and establishments (useLandmarks' pattern): nothing until the first
 * letter, then both files and the matcher; a failure stays one until "Try again".
 */
export function useStores(load: LoadStores = loadFromFiles): StoreSearch {
  const [state, setState] = useState<StoresState>({ status: 'idle' });

  const start = () => {
    setState({ status: 'loading' });
    Promise.all([load(), loadModule()]).then(
      ([stores, module]) => setState({ status: 'ready', stores, module }),
      (error: unknown) => {
        console.warn('Studio search could not read the stores.', error);
        setState({ status: 'failed' });
      },
    );
  };

  // A new function once the stores are read, and only then: the rows' memo keys on it.
  const search = useMemo<SpotSource['search']>(
    () =>
      state.status === 'ready'
        ? (query, from) => state.module.searchStores(query, state.stores.stores, from)
        : () => [],
    [state],
  );

  return {
    source: {
      status: state.status,
      ask: () => {
        if (state.status === 'idle') start();
      },
      retry: () => {
        if (state.status === 'failed') start();
      },
      search,
      name: 'stores',
    },
    attribution: state.status === 'ready' ? state.stores.attribution : null,
    sourcesOf: (listed) =>
      state.status === 'ready' ? [...new Set(listed.map(state.module.sourceOf))] : [],
  };
}
