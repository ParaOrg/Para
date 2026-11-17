// eslint-disable-next-line no-restricted-syntax -- this sheet has its own answer to a failed fetch (CreditsUnavailable below), which retryingLazy would replace with nothing
import { lazy, Suspense, useEffect, type ComponentType } from 'react';

import { useEscape } from '@/shared/hooks/use-escape';

import type { MapCredits } from './use-map-credits';

interface SheetProps {
  onClose: () => void;
  onClosed: () => void;
  /** The sheet's code could not be fetched: the page shows the credits another way. */
  onUnavailable: () => void;
}

interface CreditsOnTheirWayProps {
  /** Escape or a tap while the sheet's code is on its way: the open is called off. */
  onCancel: () => void;
}

/**
 * While the sheet's code is on its way the page is out of reach under it: Escape or a tap calls
 * the open off rather than leave the page stuck.
 */
function CreditsOnTheirWay({ onCancel }: CreditsOnTheirWayProps) {
  useEscape(onCancel);
  useEffect(() => {
    const listensFrom = performance.now();
    const handleClick = (e: MouseEvent) => {
      if (e.timeStamp >= listensFrom) onCancel();
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onCancel]);
  return null;
}

/** Stands in for the sheet when its code could not be fetched: it hands the credits back. */
function CreditsUnavailable({ onUnavailable }: SheetProps) {
  useEffect(onUnavailable, [onUnavailable]);
  return null;
}

// The Map Data Source sheet, fetched on the ⓘ's first tap: the opening page does not carry it.
// Precached, so it opens offline too; a fetch that fails all the same never blanks the page: the
// credits go back to MapLibre's corner (CreditsUnavailable). Caught here rather than by an error
// boundary, which would add its code to what the pages share.
const MapDataSourceSheet = lazy<ComponentType<SheetProps>>(() =>
  import('./map-data-source-view').then(
    (module) => ({ default: module.MapDataSourceView }),
    (error: unknown) => {
      console.warn("The map's credits could not be fetched; its corner shows them.", error);
      return { default: CreditsUnavailable };
    },
  ),
);

interface MapCreditsSheetProps {
  credits: MapCredits;
}

/**
 * The Map Data Source sheet the map's ⓘ opens (useMapCredits), over the whole page: its caller
 * makes what is under it inert while it is open.
 */
export function MapCreditsSheet({ credits }: MapCreditsSheetProps) {
  if (credits.state === 'shut') return null;
  return (
    <Suspense fallback={<CreditsOnTheirWay onCancel={credits.cancel} />}>
      <MapDataSourceSheet
        key={credits.openings}
        onClose={credits.close}
        onClosed={credits.handleGone}
        onUnavailable={credits.handleSheetMissing}
      />
    </Suspense>
  );
}
