import { OVERTURE_CREDIT } from '@/features/routes/map/data-source-credits';

import type { StoreSource } from './store-files';
import type { Stores } from './store-search-data';

interface StoreCreditProps {
  /** The sources of the stores listed now. */
  sources: readonly StoreSource[];
  attribution: Stores['attribution'];
}

/** Where each source's licence page is. */
const CREDIT_HREF = {
  osm: 'https://www.openstreetmap.org/copyright',
  overture: OVERTURE_CREDIT.href,
} satisfies Record<StoreSource, string>;

/**
 * The credit under the studio search's results while stores are listed (their licences ask for
 * it wherever their places show): "Stores", then Overture's and OpenStreetMap's, each a link to
 * its licence, in the landmarks' credit line's look.
 */
export function StoreCredit({ sources, attribution }: StoreCreditProps) {
  if (sources.length === 0) return null;
  return (
    <p className="px-4 pt-1 pb-2 text-xs text-content-tertiary">
      Stores{' '}
      {sources.map((source, index) => (
        <span key={source}>
          {index > 0 && ' · '}
          <a href={CREDIT_HREF[source]} target="_blank" rel="noreferrer" className="underline">
            {attribution[source]}
          </a>
        </span>
      ))}
    </p>
  );
}
