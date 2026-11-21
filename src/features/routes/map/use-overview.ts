import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import type { Snap } from '@/shared/ui/sheet-gesture';
import type { LngLat } from '@/shared/utils/geo';

import { APP_MOVE } from './map-view';
import { overview } from './use-overviews';
import type { Framed } from '../cards/card-stack';

/** What the Overview button's own fit carries on its events, so it can tell its fit from any other move. */
const OVERVIEW_MOVE = { ...APP_MOVE, overview: true } as const;

const isOverviewMove = (e: object): boolean => 'overview' in e && e.overview === true;

/** The lines a framing takes in, those long enough to fit; none for a place or for nothing. */
const linesOf = (framed: Framed): readonly (readonly LngLat[])[] =>
  framed && 'lines' in framed ? framed.lines.filter((line) => line.length >= 2) : [];

interface Framing {
  framing: string | null;
  lines: readonly (readonly LngLat[])[];
  dock: () => HTMLElement | null;
  snap: Snap;
}

/** The camera takes in what is framed, as the button's own fit, so it reads as at the overview. */
function fitFramed(map: MapLibreMap, at: Framing, fitting: RefObject<string | null>): void {
  if (at.framing === null || at.lines.length === 0) return;
  fitting.current = at.framing;
  overview(map, at.lines, at.dock(), at.snap, OVERVIEW_MOVE);
}

interface Overview {
  /** Whether the Overview button shows: there are routes to take in, and the camera is not on them. */
  isShown: boolean;
  /** The Overview button pressed: the camera takes in what is framed, clear of the sheet. */
  go: () => void;
}

/**
 * The Overview button's camera. The camera is "at the overview" only once the button's own fit
 * has settled on what is framed now, and leaves it with any other move, the commuter's hand (an
 * `originalEvent`) or the app's (a hintuan's glide, locate-me), rather than by comparing bounds.
 * `framing` names what is framed (a trip, the picked cards), null when nothing is; a new name
 * starts away from its overview. It shows only where a press would move the camera: a map, and
 * routes to take in.
 *
 * `opened` names a trip as it opens (its id; null with none): the camera takes in its whole route
 * once, as a press would, so the button starts hidden. A trip whose line has not loaded yet is
 * taken in as it lands. Only a new trip fits again; dragging the sheet never does.
 */
export function useOverview(
  map: MapLibreMap | null,
  framing: string | null,
  framed: Framed,
  dock: () => HTMLElement | null,
  snap: Snap,
  opened: string | null = null,
): Overview {
  const [settledOn, setSettledOn] = useState<string | null>(null);
  // The framing the button's fit is on its way to; null once any other move starts.
  const fitting = useRef<string | null>(null);
  const lines = linesOf(framed);
  const now = useRef<Framing>({ framing, lines, dock, snap });
  // Kept current as each render commits, for a press to read.
  useLayoutEffect(() => {
    now.current = { framing, lines, dock, snap };
  });

  useEffect(() => {
    if (!map) return;
    const handleMoveStart = (e: object) => {
      if (isOverviewMove(e)) return;
      fitting.current = null;
      setSettledOn(null);
    };
    // A fit stopped with no move after it (the window losing focus mid-glide) ends with its own
    // data too, and reads as settled: the camera part-way, the button hidden until the next move.
    const handleMoveEnd = (e: object) => {
      if (!isOverviewMove(e) || fitting.current === null) return;
      setSettledOn(fitting.current);
      fitting.current = null;
    };
    map.on('movestart', handleMoveStart);
    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('movestart', handleMoveStart);
      map.off('moveend', handleMoveEnd);
    };
  }, [map]);

  // The trip the camera last took in as it opened; let go as it closes, so the same trip opened
  // again fits again.
  const fittedOpen = useRef<string | null>(null);
  const hasLines = lines.length > 0;
  useEffect(() => {
    if (opened === null) fittedOpen.current = null;
    if (!map || opened === null || !hasLines || fittedOpen.current === opened) return;
    fittedOpen.current = opened;
    fitFramed(map, now.current, fitting);
  }, [map, opened, hasLines]);

  const go = () => {
    if (map) fitFramed(map, now.current, fitting);
  };

  return {
    isShown: !!map && framing !== null && lines.length > 0 && settledOn !== framing,
    go,
  };
}
