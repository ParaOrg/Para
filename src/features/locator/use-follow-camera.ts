import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, type RefObject } from 'react';

import { restingPitch } from '@/features/routes/map/view-mode';
import type { Turn } from '@/shared/hooks/commit-turn';
import type { Snap } from '@/shared/ui/sheet-gesture';

import { commuterCamera, trackedZoom, type Camera, type Fix } from './locator-rules';

interface FollowCameraInput {
  map: MapLibreMap | null;
  fix: Fix | null;
  camera: Camera;
  heading: number | null;
  /** The button's taps, each one a reason to move the camera more slowly. */
  taps: number;
  snap: Snap;
  offsetRef: RefObject<() => [number, number]>;
  /** TrackedLocation's zoom, kept through the compass view and back (useLocator). */
  trackedZoomRef: RefObject<number | null>;
  cameraTurn?: Turn;
}

/**
 * The camera with the commuter (useLocator's), the whole view on every fix, turn and tap
 * (commuterCamera). The tracked view rests at the tilt of the view the commuter chose, 2D's flat or
 * 3D's (restingPitch), read on each move, so the compass view comes back to it and a tilt under way
 * is never stopped halfway.
 */
export function useFollowCamera({
  map,
  fix,
  camera,
  heading,
  taps,
  snap,
  offsetRef,
  trackedZoomRef,
  cameraTurn,
}: FollowCameraInput): void {
  // The camera on the commuter: each fix, each turn of the phone, each tap.
  // The whole view every time, not only the centre: a fix arriving mid-glide
  // would otherwise hotspot the zoom halfway. A finger zooming lets go first,
  // so the zoom is the one the tap chose.
  const lastTaps = useRef(taps);
  // The heading turns only the compass view: north stays up otherwise. And
  // the card's height: the commuter stays clear of it as it moves.
  const turn = camera === 'compass' ? heading : null;
  const lastSnap = useRef(snap);
  useEffect(() => {
    const follow = () => {
      if (!map || !fix || camera === 'free') return;
      const tapped = lastTaps.current !== taps || lastSnap.current !== snap;
      lastTaps.current = taps;
      lastSnap.current = snap;
      trackedZoomRef.current ??= trackedZoom(map.getZoom(), fix.at[1]);
      map.easeTo({
        ...commuterCamera({
          camera,
          fix,
          turn,
          keptZoom: trackedZoomRef.current,
          mapBearing: map.getBearing(),
          tapped,
          // The view the commuter chose, read now: a tap on 2D/3D since the last fix counts.
          restPitch: restingPitch(),
        }),
        offset: offsetRef.current(),
      });
    };
    // The card's height changed: the camera following the commuter keeps
    // them clear of it, taking over from any overview the page starts in this
    // same commit.
    // The turn of the render this effect is from: a new one comes with each
    // render of the page, and is no reason to move the camera.
    if (cameraTurn) cameraTurn(follow);
    else follow();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cameraTurn is the render's turn, new every render, and no reason to move the camera
  }, [map, fix, camera, turn, taps, snap]);
}
