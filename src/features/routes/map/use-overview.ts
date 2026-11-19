import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

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
 */
export function useOverview(
  map: MapLibreMap | null,
  framing: string | null,
  framed: Framed,
  dock: () => HTMLElement | null,
  snap: Snap,
): Overview {
  const [settledOn, setSettledOn] = useState<string | null>(null);
  // The framing the button's fit is on its way to; null once any other move starts.
  const fitting = useRef<string | null>(null);
  const lines = linesOf(framed);
  const now = useRef({ framing, lines, dock, snap });
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

  const go = () => {
    const { framing: name, lines: toFit, dock: sheetOf, snap: snapNow } = now.current;
    if (!map || name === null || toFit.length === 0) return;
    fitting.current = name;
    overview(map, toFit, sheetOf(), snapNow, OVERVIEW_MOVE);
  };

  return {
    isShown: !!map && framing !== null && lines.length > 0 && settledOn !== framing,
    go,
  };
}
