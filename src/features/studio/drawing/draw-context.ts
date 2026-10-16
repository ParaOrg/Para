import type { MapLibreMap } from 'maplibre-gl';
import type { RefObject } from 'react';

import type { LngLat, Segment, SnapMode } from '@/shared/utils/geo';

import type { ModesAround } from './draw-gestures';
import type { AreaTarget, Borrow, FollowOffer, Picking } from './drawing-types';

/**
 * After a touch the browser sends a click of its own. One arriving this soon
 * after a touch the drawing has already answered is that touch's echo, not a
 * second press. (Android's contextmenu on a long-press MapLibre drops itself:
 * after a touch it ignores contextmenu until a real mouse button goes down.)
 */
export const ECHO_MS = 700;

/** A feature of the drawing's layers, carrying its point's or its gap's index. */
export interface IndexedFeature {
  properties?: { index?: number };
}

/** The drawing as the pointer reads it, through refs every mutator keeps current. */
export interface DrawRefs {
  points: RefObject<LngLat[]>;
  segments: RefObject<Segment[]>;
  area: RefObject<AreaTarget | null>;
  picking: RefObject<Picking | null>;
  join: RefObject<LngLat | null>;
  borrow: RefObject<Borrow | null>;
  follow: RefObject<((directionIds: string[], at: LngLat, offered?: LngLat) => void) | undefined>;
  selected: RefObject<number | null>;
}

/** What the pointer does to the drawing. */
export interface DrawActions {
  setPicking: (p: Picking) => void;
  addPoint: (point: LngLat) => Promise<void>;
  insertPoint: (gap: number, point: LngLat) => Promise<void>;
  deletePoint: (idx: number) => Promise<void>;
  toggleSegment: (gap: number) => Promise<void>;
  resolveGaps: (first: number, modes: SnapMode[]) => Promise<void>;
  writePoints: (pts: LngLat[]) => void;
  writeSegments: (next: Segment[]) => void;
  markStandIn: (s: Segment) => void;
  isStandIn: (s: Segment) => boolean;
  select: (i: number | null) => void;
  setFollowOffer: (o: FollowOffer | null) => void;
}

/**
 * What every gesture's handlers share, built once per drawing by
 * useDrawEvents: the map, its canvas, the drawing's refs and actions, and the
 * state the gestures pass between them, read and written live.
 */
export interface DrawContext {
  map: MapLibreMap;
  canvas: HTMLCanvasElement;
  refs: DrawRefs;
  actions: DrawActions;
  /** The point being dragged, by mouse or finger, whether it has moved, and its stretches' modes. */
  drag: { idx: number | null; moved: boolean; modes: ModesAround };
  /**
   * Until when a click is the echo of a touch already answered, and when the
   * last touch ended: a click soon after that came from a finger.
   */
  echo: { until: number; lastTouchEnd: number };
}

/** Whether a click now is the echo of a touch already answered. */
export const isEcho = (ctx: DrawContext): boolean => performance.now() < ctx.echo.until;

/** Whether a click now came from a finger: soon after the last touch ended. */
export const fromFinger = (ctx: DrawContext): boolean =>
  performance.now() - ctx.echo.lastTouchEnd < ECHO_MS;
