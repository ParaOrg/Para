import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import { coarse } from '@/features/routes/map/map-view';
import type { Turn } from '@/shared/hooks/commit-turn';
import type { Snap } from '@/shared/ui/sheet-gesture';
import { haversine, type LngLat } from '@/shared/utils/geo';

import { gazeSubjects, type Picks } from './dot-gaze';
import { Locator } from './locator';
import { LocatorOnMap } from './locator-on-map';
import { useLocator } from './use-locator';
import { useLocatorMood } from './use-locator-mood';

interface Props {
  map: MapLibreMap | null;
  /** The open card's height: the camera keeps the commuter clear of it as it moves. */
  snap: Snap;
  /** Where the commuter should sit from the map's centre, clear of the card on show (useCardCamera's clearOfOpen). */
  offset: () => [number, number];
  /** A card is open: the button sits on its sheet. */
  docked: boolean;
  /** The page's turn for the camera (commit-turn.ts): after the cards' camera. */
  cameraTurn: Turn;
  /** What was just picked, for the dot to gaze at; and when ‹ or ✕ last went back (useGazeHush). */
  picks: Picks;
  hushedAt: { readonly current: number };
  /**
   * Where the commuter is, said once at the first fix and then only after a
   * move of more than WHERE_MOVE_M, so the page that listens renders for a
   * walk across town and not for every fix. It never leaves this phone
   * (ADR 0004): the page keeps it in memory to choose a loop's tip.
   */
  onWhere?: (at: LngLat, accuracyM: number) => void;
}

/** How far the commuter moves before the page is told again. */
export const WHERE_MOVE_M = 50;

/**
 * The commuter's own position, when they ask for it, and the camera with
 * them, kept clear of the card on show, as a picked hintuan is. The button,
 * and the dot on the map with its moods and its gaze.
 *
 * A child of PublicMapApp, not hooks of it: a fix, a turn of the phone and the
 * dot's moods, a second apart, render this alone. As hooks of the page they
 * would re-render it once or twice a second, drawing the same thing, for
 * nothing while location is on. Its camera still moves at the page's turn
 * (`cameraTurn`).
 */
export function CommuterLocation({
  map,
  snap,
  offset,
  docked,
  cameraTurn,
  picks,
  hushedAt,
  onWhere,
}: Props) {
  const locator = useLocator(map, { compass: coarse, snap, offset, cameraTurn });
  // How the dot feels: glad as the location comes, a boing at a tap on the
  // button or on the dot, now and then a huff (locatorMood).
  const { mood, face, beat, poke } = useLocatorMood(locator);
  // Told to the page at the first fix and after each 50 m; a fix lost and found again says it afresh.
  const told = useRef<LngLat | null>(null);
  const latestOnWhere = useRef(onWhere);
  useEffect(() => {
    latestOnWhere.current = onWhere;
  });
  const fix = locator.fix;
  useEffect(() => {
    if (!fix) {
      told.current = null;
      return;
    }
    if (told.current && haversine(told.current, fix.at) <= WHERE_MOVE_M) return;
    told.current = fix.at;
    latestOnWhere.current?.(fix.at, fix.accuracy);
  }, [fix]);
  // …and its gaze: at what was just picked, for three seconds (dot-gaze.ts);
  // ‹ and ✕ are hushed, so going back picks nothing.
  const gazeAt = gazeSubjects(picks, locator.fix?.at ?? null);
  return (
    <>
      {map && <Locator locator={locator} docked={docked} />}
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
