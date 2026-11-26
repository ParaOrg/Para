import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from 'react';

import { BASEMAPS, type Basemap } from '@/features/routes/map/basemap';
import { BASEMAP_THUMBNAILS } from '@/features/routes/map/basemap-thumbnails';
import type { LabelsPlace } from '@/features/routes/map/location-labels';
import { coarse } from '@/features/routes/map/map-view';
import type { CommuterWhere } from '@/features/routes/model/loop-tip';
import type { Turn } from '@/shared/hooks/commit-turn';
import type { Snap } from '@/shared/ui/sheet-gesture';

import { gazeSubjects, type Picks } from './dot-gaze';
import { Locator } from './locator';
import type { LocatorNote } from './locator-note';
import { LocatorOnMap } from './locator-on-map';
import { useLocator } from './use-locator';
import { useLocatorMood } from './use-locator-mood';
import { shouldTell } from './where-told';

/** What the page may ask of the locator beyond its own button. */
export interface CommuterLocationHandle {
  /** Locate, or bring the camera to the commuter (the public map's "Turn on location" row). */
  locate: () => void;
}

interface Props {
  ref?: Ref<CommuterLocationHandle>;
  map: MapLibreMap | null;
  /** The open card's height: the camera keeps the commuter clear of it as it moves. */
  snap: Snap;
  /** Where the commuter should sit from the map's centre, clear of the card on show (useCardCamera's clearOfOpen). */
  offset: () => [number, number];
  /** The map's 'load' is in and it has not failed (MapView's onLoadedChange). */
  isMapLoaded: boolean;
  /** The designs MapView was handed, for the pill's card: the public map's by default, the studio's its own. */
  basemaps?: readonly Basemap[];
  basemapThumbnails?: Readonly<Record<string, string>>;
  /** Whose Location Labels choice the card keeps: the public map's by default, the studio's its own. */
  labelsPlace?: LabelsPlace;
  docked: boolean; // A card is open: the button sits on its sheet.
  /** The map-style button over the LocatorButton (the studio), or the LocatorButton alone (Locator). */
  hasMapStyle?: boolean;
  above?: ReactNode; // 12 over the LocatorButton alone (Locator's): the public map's list filter.
  cameraTurn: Turn; // The page's turn for the camera (commit-turn.ts): after the cards'.
  picks: Picks; // What was just picked, for the dot's gaze; and when ‹ or ✕ last went back.
  hushedAt: { readonly current: number };
  /**
   * Where the commuter is, said at the first fix and then only when it matters (shouldTell), so
   * the page renders for a walk across town, not for every fix; null when the fix is lost. It never
   * leaves this phone (ADR 0004): the page keeps it in memory to choose a loop's tip.
   */
  onWhere?: (where: CommuterWhere | null) => void;
  /** What the locator has to say, for the page's problem toast; null once a fix comes (Locator). */
  onNote?: (note: LocatorNote | null) => void;
}

/**
 * The commuter's own position, when they ask for it, and the camera with them, kept clear of the
 * card on show, as a picked hintuan is. The button, and the dot on the map with its moods and gaze.
 *
 * A child of PublicMapApp, not hooks of it: a fix, a turn of the phone and the
 * dot's moods, a second apart, render this alone. As hooks of the page they
 * would re-render it once or twice a second, drawing the same thing, for
 * nothing while location is on. Its camera still moves at the page's turn
 * (`cameraTurn`).
 */
export function CommuterLocation({
  ref,
  map,
  isMapLoaded,
  basemaps = BASEMAPS,
  basemapThumbnails = BASEMAP_THUMBNAILS,
  labelsPlace = 'map',
  snap,
  offset,
  docked,
  hasMapStyle = true,
  above,
  cameraTurn,
  picks,
  hushedAt,
  onWhere,
  onNote,
}: Props) {
  const locator = useLocator(map, { compass: coarse, snap, offset, cameraTurn });
  // Asks for the location, or brings the camera back to the commuter, as the button's first taps
  // do; never its compass step, which a row reading "Turn on location" does not promise.
  const { mode, tap } = locator;
  const isOnCommuter = mode === 'TrackedLocation' || mode === 'TracksTheMapBasedOnCompassFacing';
  useImperativeHandle(ref, () => ({ locate: () => (isOnCommuter ? undefined : tap()) }), [
    isOnCommuter,
    tap,
  ]);
  // How the dot feels: glad as the location comes, a boing at a tap on the
  // button or on the dot, now and then a huff (locatorMood).
  const { mood, face, beat, poke } = useLocatorMood(locator);
  // Told to the page by shouldTell; a fix lost says null, and found again says it afresh.
  const told = useRef<CommuterWhere | null>(null);
  const latestOnWhere = useRef(onWhere);
  useEffect(() => {
    latestOnWhere.current = onWhere;
  });
  const fix = locator.fix;
  useEffect(() => {
    if (!fix) {
      if (told.current) latestOnWhere.current?.(null);
      told.current = null;
      return;
    }
    const where = { at: fix.at, accuracyM: fix.accuracy };
    if (!shouldTell(told.current, where)) return;
    told.current = where;
    latestOnWhere.current?.(where);
  }, [fix]);
  // …and its gaze: at what was just picked, for three seconds (dot-gaze.ts);
  // ‹ and ✕ are hushed, so going back picks nothing.
  const gazeAt = gazeSubjects(picks, locator.fix?.at ?? null);
  return (
    <>
      {map && (
        <Locator
          locator={locator}
          map={map}
          isMapLoaded={isMapLoaded}
          basemaps={basemaps}
          basemapThumbnails={basemapThumbnails}
          labelsPlace={labelsPlace}
          docked={docked}
          hasMapStyle={hasMapStyle}
          above={above}
          onNote={onNote}
        />
      )}
      {map && locator.fix && (
        <LocatorOnMap
          map={map}
          fix={locator.fix}
          heading={locator.heading}
          mood={mood}
          face={face}
          beat={beat}
          gazeAt={gazeAt}
          hushedAt={hushedAt}
          onPoke={poke}
        />
      )}
    </>
  );
}
