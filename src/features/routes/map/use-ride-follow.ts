import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import type { LngLat } from '@/shared/utils/geo';

/** Course-up turns the map to the direction of travel; north-up keeps north at the top. */
export type FollowMode = 'course-up' | 'north-up';

/** Close enough to read a street, and no further out than the contributor already is. */
const FOLLOW_ZOOM = 16;
/** The bottom stack covers the foot of the map: the contributor sits in the room above it. */
const STACK_ROOM_PX = 240;
const GLIDE_MS = 800;

interface RideFollow {
  /** Where the contributor is now. */
  here: LngLat | null;
  /** The direction of travel in degrees from north, or null while standing still. */
  bearing: number | null;
  mode: FollowMode;
  /** False once the contributor has moved the map by hand, until they recentre. */
  isFollowing: boolean;
  /** The contributor moved the map by hand. */
  onLetGo: () => void;
}

/**
 * Keeps the camera on the contributor. Course-up turns to the bearing it is
 * given and holds the last one while that is null; a finger on the map lets
 * the camera go until `isFollowing` is true again.
 */
export function useRideFollow(
  map: MapLibreMap | null,
  { here, bearing, mode, isFollowing, onLetGo }: RideFollow,
): void {
  const lastBearing = useRef<number | null>(null);

  useEffect(() => {
    if (!map) return;
    const letGo = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) onLetGo();
    };
    map.on('dragstart', letGo);
    map.on('rotatestart', letGo);
    return () => {
      map.off('dragstart', letGo);
      map.off('rotatestart', letGo);
    };
  }, [map, onLetGo]);

  useEffect(() => {
    if (bearing !== null) lastBearing.current = bearing;
  }, [bearing]);

  useEffect(() => {
    if (!map || !here || !isFollowing) return;
    const turn = mode === 'north-up' ? 0 : (bearing ?? lastBearing.current ?? map.getBearing());
    map.easeTo({
      center: here,
      bearing: turn,
      zoom: Math.max(map.getZoom(), FOLLOW_ZOOM),
      padding: { top: 0, left: 0, right: 0, bottom: STACK_ROOM_PX },
      duration: GLIDE_MS,
      essential: true,
    });
  }, [map, here, bearing, mode, isFollowing]);
}
