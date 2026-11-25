import type { ReactNode } from 'react';

import type { LngLat } from '@/shared/utils/geo';

/** A result from another source, listed after the places and landmarks: camera-only. */
export interface Spot {
  /** Unique among the source's spots, for the row's key. */
  id: string;
  label: string;
  /** What it is and where it comes from, under its name: "Restaurant · Overture". */
  detail: string;
  point: LngLat;
}

export interface SpotMatch {
  spot: Spot;
  /** Straight-line metres from where the search was made; null without a location. */
  distanceM: number | null;
}

/**
 * More results for place search, from the caller (the studio's stores): read on the first
 * letter, as the landmarks are, and listed after them. A pick only moves the camera.
 */
export interface SpotSource {
  status: 'idle' | 'loading' | 'ready' | 'failed';
  /** Read them, once: nothing while loading, loaded or failed. */
  ask: () => void;
  /** Read them again after a failure. */
  retry: () => void;
  /** The spots the query matches, best first; none until ready. */
  search: (query: string, from: LngLat | null) => SpotMatch[];
  /** What they are called in the results' lines: "stores". */
  name: string;
  /** The credit their licences ask for, for the spots listed. */
  credit: (listed: readonly Spot[]) => ReactNode;
  /** One chosen: the caller takes the camera there (the studio marks the point too). */
  onPick: (spot: Spot) => void;
}
