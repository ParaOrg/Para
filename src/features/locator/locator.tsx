import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, type ReactNode } from 'react';

import type { Basemap } from '@/features/routes/map/basemap';
import type { LabelsPlace } from '@/features/routes/map/location-labels';
import { DOCK_TOP_CSS, FRAMED_SHARE, slide } from '@/shared/ui/sheet-gesture';

import { LocationAndMapControl } from './location-and-map-control';
import { LocatorButton } from './locator-button';
import { noteFor, type LocatorNote } from './locator-note';
import type { Locator as State } from './use-locator';

interface Props {
  locator: State;
  /** The map the pill's top half switches the design of; null in a story, where a pick does nothing. */
  map: MapLibreMap | null;
  /** The map's 'load' is in and it has not failed: the pill's top half waits for it. */
  isMapLoaded: boolean;
  /** The designs the pill's card offers, and their pictures: MapView's. */
  basemaps: readonly Basemap[];
  basemapThumbnails: Readonly<Record<string, string>>;
  /** Whose Location Labels choice the card keeps: the studio's own, or the public pages'. */
  labelsPlace: LabelsPlace;
  /** A card is open: the button sits on its sheet rather than at the map's foot. */
  docked: boolean;
  /**
   * Docked, it follows the sheet up to the framed height (FRAMED_SHARE) and stays there, the sheet
   * covering it above (`framed`, the public map's). A fitted sheet's open height is its content's, the map in sight
   * above it, so the button rides on it up to just under the status bar (`top`, the contributor's
   * ride: DOCK_TOP_CSS), the sheet covering it only when its content fills the screen.
   */
  dockCap?: 'framed' | 'top';
  /** Stands directly above the pill, hidden while the Map Style card is open; the contributor's mark button. */
  above?: ReactNode;
  /**
   * What the locator has to say, for the page to show as a problem toast: said as the browser
   * refuses or gives no fix, again at each tap while it still does, and null once a fix comes.
   */
  onNote?: (note: LocatorNote | null) => void;
}

/** What each look says it will do, for a screen reader. */
const LABEL = {
  LocationOff: 'Turn on my location',
  TrackOwnLocation: 'Show where I am',
  TrackedLocation: 'Turn the map the way I face',
  TracksTheMapBasedOnCompassFacing: 'Put north up',
} as const;

/**
 * LocationAndMap (4245:1966), the map-style button over the LocatorButton,
 * placed as ScreenLocationBehavior draws the LocatorButton (Figma
 * 3870:5941): at the map's right edge, 12 above the card's sheet, following
 * it down to Low; up past the framed height (FRAMED_SHARE) it stays there,
 * and the sheet covers it (unless `dockCap` is `top`, over a fitted sheet,
 * where it rides higher, up to DOCK_TOP_CSS). With no card open it sits at the map's foot. Where
 * the card floats in the corner (`@float:`), which the frame does not show, it
 * sits at the bottom right, clear of the credit line.
 * BottomSheet says where its top is as `--dock-y`: on the page at rest, and on this layer
 * itself (`data-dock-follower`) as a finger drags it; this layer slides the same way, by the same
 * length.
 *
 * Denied, unavailable or no fix yet: it tells the page (onNote), and the
 * button stays as it was, to try again once the browser's setting is changed.
 */
export function Locator({
  locator,
  map,
  isMapLoaded,
  basemaps,
  basemapThumbnails,
  labelsPlace,
  docked,
  dockCap = 'framed',
  above,
  onNote,
}: Props) {
  const { status, noFix, mode, heading, compass, tap, taps } = locator;
  // The page's toast is outside React's reach from here: it is told, not rendered.
  const latestOnNote = useRef(onNote);
  useEffect(() => {
    latestOnNote.current = onNote;
  });
  // A note is out, so a fix has one to take back.
  const hasSaidRef = useRef(false);
  useEffect(() => {
    const note = noteFor(status, noFix);
    if (note === undefined) return;
    if (note === null) {
      if (!hasSaidRef.current) return;
      hasSaidRef.current = false;
      latestOnNote.current?.(null);
      return;
    }
    // Each tap still refused says it again: the toast comes back if it was closed.
    hasSaidRef.current = true;
    latestOnNote.current?.(note);
  }, [status, noFix, taps]);

  // Never above the framed height's top (FRAMED_SHARE). With no card, the map's foot: short of a
  // phone's home bar, and of what the page stands in the corner (`--dock-foot`,
  // the studio's New buttons). `--dock-gap` and `--dock-right` set the column's
  // gap over that foot and from the right edge; the contributor page sets them,
  // the public map keeps 0.75rem each.
  const y = docked
    ? `max(var(--dock-y, 100%), ${dockCap === 'top' ? DOCK_TOP_CSS : slide(FRAMED_SHARE)})`
    : 'calc(100% - max(env(safe-area-inset-bottom), var(--dock-foot, 0px)))';
  return (
    <div
      data-testid="locator-dock"
      data-dock-follower
      className={
        'pointer-events-none absolute inset-0 z-[5] ' +
        'transition-[translate] duration-sheet ease-enter in-data-dock-dragging:transition-none motion-reduce:transition-none ' +
        '@float:translate-none!'
      }
      style={{ translate: `0 ${y}` }}
    >
      <div className="pointer-events-auto absolute right-[calc(var(--dock-right,0.75rem)+env(safe-area-inset-right))] bottom-full mb-[var(--dock-gap,0.75rem)] flex flex-col items-end gap-1 @float:right-3 @float:bottom-[max(2.5rem,calc(var(--dock-foot,0px)+0.75rem))] @float:mb-0">
        <LocationAndMapControl
          map={map}
          isMapLoaded={isMapLoaded}
          basemaps={basemaps}
          thumbnails={basemapThumbnails}
          labelsPlace={labelsPlace}
          above={above}
        >
          <LocatorButton
            mode={mode}
            corners="bottom"
            // TrackedLocation keeps north up, so the phone's heading is the arrow's on the screen too.
            heading={mode === 'TrackedLocation' ? heading : null}
            onClick={tap}
            aria-label={
              mode === 'TrackedLocation' && !compass ? LABEL.TrackOwnLocation : LABEL[mode]
            }
            data-testid="where"
            data-state={status}
          />
        </LocationAndMapControl>
      </div>
    </div>
  );
}
