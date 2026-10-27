import type { MapLibreMap } from 'maplibre-gl';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { Turn } from '@/shared/hooks/commit-turn';
import type { Snap } from '@/shared/ui/sheet-gesture';

import type { LocatorMode } from './locator-button';
import { fixFrom, type Sample } from './locator-motion';
import {
  QUIET_MS,
  afterTap,
  commuterCamera,
  modeFor,
  trackedZoom,
  type Camera,
  type Fix,
  type LocatorStatus,
} from './locator-rules';
import { useCameraLetGo } from './use-camera-let-go';
import { askForCompass, useCompass } from './use-compass';

export interface Locator {
  status: LocatorStatus;
  fix: Fix | null;
  /** The way the commuter faces: the phone's compass, else the way the fixes go. Null: unknown. */
  heading: number | null;
  /**
   * The phone's compass has been read: TrackedLocation's tap turns the map
   * by it. Not merely a touch screen — Safari's prompt refused, Firefox, a
   * tablet with no magnetometer give none, and the map would tilt with
   * nothing to turn by.
   */
  compass: boolean;
  camera: Camera;
  /** The button's look (LocatorButton's Property 1). */
  mode: LocatorMode;
  /**
   * Asking, and the browser has said "no fix" (a timeout, or unavailable)
   * with none yet. A note beside `asking`, not a status of its own: the watch
   * is still live and the next fix may come.
   */
  noFix: boolean;
  /** The button: ask, or move the camera on round. */
  tap: () => void;
  /** How many times the button has been tapped: the dot's mood reads it (locatorMood). */
  taps: number;
}

interface Options {
  /** Where the commuter should sit from the map's centre, clear of an open card (clearOfSheet). */
  offset: () => [number, number];
  /** The open card's height: the camera keeps the commuter clear of it as it moves. */
  snap: Snap;
  /** A phone, which may have a compass to turn the map by. */
  compass: boolean;
  /**
   * Where in a commit the camera moves to the commuter (commit-turn.ts): the
   * page's turn, after the cards' camera. Without it, in this hook's effect.
   */
  cameraTurn?: Turn;
}

/**
 * The commuter's own place on the map, and the camera with them: LocatorButton's
 * rules (Figma 3870:5408). Off until asked, then the browser's own permission
 * prompt; the position never leaves the phone — nothing here talks to a server,
 * and nothing stores it. Once on it stays on, as in Google Maps; the button only
 * moves the camera:
 *
 *  - LocationOff, no location yet: a tap asks the browser for it, and its
 *    first fix brings the camera as TrackOwnLocation's tap does. Any tap
 *    after QUIET_MS without a fix asks again, so Android can offer to turn
 *    the phone's location on.
 *  - TrackOwnLocation, the camera elsewhere — the moment it moves off the
 *    commuter at all, by a finger or by the app. A tap brings it to them at
 *    the zoom it is at; from further out than 2 km on the scale bar, in to
 *    200 m (trackedZoom).
 *  - TrackedLocation, the camera on them, north up, following each fix. A
 *    tap turns on the compass.
 *  - TracksTheMapBasedOnCompassFacing, the camera tilted, 200 m on the bar,
 *    turned the way the phone faces. A tap goes back to TrackedLocation's
 *    view, at its zoom, and the next to this again.
 *
 * With no compass to read (a laptop) a tap on TrackedLocation brings the
 * camera back to the commuter instead.
 */
export function useLocator(
  map: MapLibreMap | null,
  { offset, snap, compass, cameraTurn }: Options,
): Locator {
  const [status, setStatus] = useState<LocatorStatus>('off');
  const [fix, setFix] = useState<Fix | null>(null);
  const [camera, setCamera] = useState<Camera>('free');
  // Bumped by every tap that moves the camera, so a tap on TrackedLocation
  // without a compass brings it back even though the camera's state stays.
  const [taps, setTaps] = useState(0);
  const [noFix, setNoFix] = useState(false);
  const watchRef = useRef<number | null>(null);
  // When the watch last gave a fix, or was started: a tap after QUIET_MS without one asks again.
  const heardRef = useRef(0);
  const fixesRef = useRef<Sample[]>([]);
  const headingRef = useRef<number | null>(null);
  const offsetRef = useRef(offset);

  const phone = useCompass(compass && status === 'on');
  const heading = phone ?? fix?.heading ?? null;
  const read = phone !== null;
  const readRef = useRef(read);

  // TrackedLocation's zoom, chosen as the camera comes to the commuter from
  // elsewhere (trackedZoom) and kept through the compass view and back.
  // Null: to be chosen at the next fix.
  const trackedZoomRef = useRef<number | null>(null);
  const cameraRef = useRef(camera);
  // Today's, for the tap and the camera's follow: written as the render
  // commits, before any effect of it runs or a tap can come.
  useLayoutEffect(() => {
    offsetRef.current = offset;
    readRef.current = read;
    cameraRef.current = camera;
  });

  const tap = useCallback(() => {
    setTaps((n) => n + 1);
    if (cameraRef.current === 'free') trackedZoomRef.current = null;
    if (watchRef.current !== null) {
      // Each tap is a gesture Safari's prompt may need: asked again until it is answered.
      if (compass && !readRef.current) askForCompass();
      setCamera((c) => afterTap(c, readRef.current));
      if (Date.now() - heardRef.current < QUIET_MS) return;
      // A quiet watch means location was off when it started or was turned off
      // since. Android offers to turn location on only for a new request made in
      // a tap, so this tap replaces the quiet watch with a new one.
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    } else {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setStatus('unavailable');
        return;
      }
      if (compass) askForCompass();
      setStatus('asking');
      setCamera('tracked');
    }
    heardRef.current = Date.now();
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const now = Date.now();
        heardRef.current = now;
        const next = fixFrom(p, fixesRef.current, headingRef.current, now);
        fixesRef.current = next.run;
        headingRef.current = next.fix.heading;
        setFix(next.fix);
        setNoFix(false);
        setStatus('on');
      },
      (e) => {
        // Only a refusal ends the watch. "Position unavailable" and a timeout
        // come and go — indoors, under a flyover, and between every fix on
        // an emulated GPS — and the next fix is still coming; say "no fix
        // yet" only while there has been none.
        if (e.code === e.PERMISSION_DENIED) {
          navigator.geolocation.clearWatch(watchRef.current ?? -1);
          watchRef.current = null;
          fixesRef.current = [];
          // The last fix goes too, so the dot does not stay where the commuter was
          // when they took the permission back, and the next tap does not ease
          // the camera there.
          headingRef.current = null;
          setFix(null);
          setCamera('free');
          setNoFix(false);
          setStatus('denied');
          return;
        }
        if (fixesRef.current.length === 0) setNoFix(true);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20_000 },
    );
  }, [compass]);

  useCameraLetGo(map, setCamera);

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
        }),
        offset: offsetRef.current(),
      });
    };
    // The card's height changed: the cards' overview starts in this same
    // commit (useHeightOverview), and the camera following the commuter
    // takes over from it.
    // The turn of the render this effect is from: a new one comes with each
    // render of the page, and is no reason to move the camera.
    if (cameraTurn) cameraTurn(follow);
    else follow();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cameraTurn is the render's turn, new every render, and no reason to move the camera
  }, [map, fix, camera, turn, taps, snap]);

  useEffect(
    () => () => {
      if (watchRef.current !== null) navigator.geolocation?.clearWatch(watchRef.current);
    },
    [],
  );

  return {
    status,
    fix,
    heading,
    compass: read,
    camera,
    mode: modeFor(camera, status === 'on' && !!fix),
    noFix,
    tap,
    taps,
  };
}
