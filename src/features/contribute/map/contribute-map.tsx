import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';

import { MapView } from '@/features/routes/map/map-view';
import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import { useRecordingTrail } from '@/features/routes/map/use-recording-trail';
import { prefersReducedMotion } from '@/shared/utils/motion';
import { retryingImport } from '@/shared/utils/retrying-import';

import type { MapWhere } from './map-where';
import type { PausedFrostProps } from './paused-frost';
import { RIDE_FRAME_PADDING, trailBounds } from './trail-picture-frame';
import { useMapReconnect } from './use-map-reconnect';
import { usePublishedHotspots } from './use-published-hotspots';
import { usePublishedRoutes } from './use-published-routes';
import type { RecordingTrack } from './use-recording-track';
import type { MapNote } from '../notices/map-note';

// Fetched when a recording's form opens, not with the page.
const loadCapture = retryingImport(() => import('./capture-trail-picture'));
// The paused frost, out of the page's opening: fetched once a recording is on, before any pause,
// so its first ease in plays.
const loadFrost = retryingImport(() => import('./paused-frost'));

/** What the page draws on the map besides the trail: the shell's locator, which this feature may not import. */
export type ContributeLocatorSlot = (
  map: MapLibreMap,
  isMapLoaded: boolean,
  isRecording: boolean,
  mark: ReactNode,
  /** The locator's note for the page to say, given again on each tap; null once it is not true. */
  onNote: (note: MapNote | null) => void,
  /** Where the rider's dot is, as it moves; null without a fix. The paused frost clears there. */
  onWhere: (where: MapWhere | null) => void,
  /** A sheet is on the map (a ride's): the buttons stand on it, following it as it moves. */
  isDocked: boolean,
) => ReactNode;

/** A saved ride whose screen shows: its trail is drawn in the recording's place, and framed. */
export interface ShownRide {
  id: string;
  trail: RecordingTrail;
}

interface ContributeMapProps {
  track: RecordingTrack;
  /** The ride whose screen shows, with its trail read; null with none, or none read. */
  ride: ShownRide | null;
  /** Whether a recording is on the screen. */
  isRecording: boolean;
  /** The recording is paused: the map frosts over, its buttons and every screen over it crisp. */
  isFrosted: boolean;
  locator?: ContributeLocatorSlot;
  /** The Flag a stop button (flag-stop-button.tsx), for the locator's column: null when nothing is recording. */
  mark: ReactNode;
  /** The locator's note, passed on to the page's toasts. */
  onMapNote: (note: MapNote | null) => void;
  /** False while a screen shows its own ⓘ for the credits: MapLibre's corner ⓘ steps aside. */
  areCreditsShown: boolean;
  /** A screen covers the whole map: the map's own failure panel stays under it. */
  isCovered: boolean;
  /** A sheet is on the map (a ride's): the locator's buttons stand on it. */
  isDocked: boolean;
  /** The recording whose whole trail to take a picture of, for History's card; null for none. */
  pictureFor: string | null;
  /** The picture taken, a data URL; not called when none could be (no trail, or no tiles). */
  onPicture: (recordingId: string, picture: string) => void;
}

/**
 * The map under every screen: the public map's own view, with the published
 * routes faint on it and the published hotspots (boxes and pins, display-only),
 * the recording's trail over them and the shell's locator
 * (the dot, and the button with the map-style picker) on top.
 */
export function ContributeMap({
  track,
  ride,
  isRecording,
  isFrosted,
  locator,
  mark,
  onMapNote,
  areCreditsShown,
  isCovered,
  isDocked,
  pictureFor,
  onPicture,
}: ContributeMapProps) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  // The rider's dot, from the locator: the paused frost clears round it, and follows it.
  const [where, setWhere] = useState<MapWhere | null>(null);
  // Drawn once its chunk is here, never suspended: a suspended part would hold back the update
  // that starts the recording, and with it Start's morph into the card.
  const [PausedFrost, setPausedFrost] = useState<ComponentType<PausedFrostProps> | null>(null);
  useEffect(() => {
    if (!isRecording || PausedFrost) return;
    let isGone = false;
    loadFrost()
      .then((chunk) => {
        if (!isGone) setPausedFrost(() => chunk.PausedFrost);
      })
      .catch((error: unknown) => {
        // Offline: the map stays clear while paused, and the next recording asks again.
        console.warn('The paused frost could not be loaded; the map stays clear.', error);
      });
    return () => {
      isGone = true;
    };
  }, [isRecording, PausedFrost]);

  // A map made with no signal is made again once there is one (use-map-reconnect.ts).
  const mapAttempt = useMapReconnect(map, isMapLoaded);

  usePublishedRoutes(map, isMapLoaded);
  usePublishedHotspots(map, isMapLoaded);
  useRecordingTrail(map, ride?.trail ?? track.trail);

  // Once each time a ride's screen opens, its whole trail framed above the folded sheet. A ride
  // with no trail here (uploaded from another phone) leaves the map where it was.
  const framedRideId = useRef<string | null>(null);
  useEffect(() => {
    if (!ride) {
      framedRideId.current = null;
      return;
    }
    if (!map || !isMapLoaded || framedRideId.current === ride.id) return;
    const bounds = trailBounds(ride.trail);
    if (!bounds) return;
    framedRideId.current = ride.id;
    // The status bar and a phone's home bar, as the sheet and Back stand clear of them.
    const insets = screenInsets(map.getContainer());
    map.fitBounds(bounds, {
      padding: {
        ...RIDE_FRAME_PADDING,
        top: RIDE_FRAME_PADDING.top + insets.top,
        bottom: RIDE_FRAME_PADDING.bottom + insets.bottom,
      },
      bearing: 0,
      pitch: 0,
      maxZoom: 17,
      duration: prefersReducedMotion() ? 0 : 600,
    });
  }, [map, isMapLoaded, ride]);

  // Once each time a recording's form opens, the trail whole on the map under it: the form covers
  // the map, so framing the trail for the picture moves nothing the rider sees. The ref keeps a
  // second picture from being taken. The form closing (Keep recording, Stop without saving) aborts
  // a capture still under way; one cut short otherwise is tried again.
  const pictureTakenFor = useRef<string | null>(null);
  const { trail } = track;
  useEffect(() => {
    if (pictureFor === null) pictureTakenFor.current = null;
    if (!map || !isMapLoaded || pictureFor === null || pictureTakenFor.current === pictureFor) {
      return;
    }
    pictureTakenFor.current = pictureFor;
    const controller = new AbortController();
    let isDone = false;
    loadCapture()
      .then(({ captureTrailPicture }) => captureTrailPicture(map, trail, controller.signal))
      .then((picture) => {
        isDone = true;
        if (picture && !controller.signal.aborted) onPicture(pictureFor, picture);
      })
      .catch((error: unknown) => {
        isDone = true;
        console.warn("The trail's picture could not be taken; History draws the trail.", error);
      });
    return () => {
      controller.abort();
      if (!isDone) pictureTakenFor.current = null;
    };
  }, [map, isMapLoaded, pictureFor, trail, onPicture]);

  return (
    <>
      <MapView
        key={mapAttempt}
        onReady={setMap}
        onLoadedChange={setIsMapLoaded}
        zoomButtons={false}
        hasMapStyleButton={false}
        creditsAtBottom
        areCreditsShown={areCreditsShown}
        isCovered={isCovered}
      />
      {/* Over the map's canvas, under the locator's buttons (drawn after it) and every screen. */}
      {PausedFrost && <PausedFrost map={map} where={where} isFrosted={isFrosted} />}
      {map && locator?.(map, isMapLoaded, isRecording, mark, onMapNote, setWhere, isDocked)}
    </>
  );
}

/**
 * The page's status bar (`--map-safe-top`) and a phone's home bar (`safe-area-inset-bottom`), in
 * pixels, as `host` sees them: both 0 in a browser that keeps clear of them itself.
 */
function screenInsets(host: HTMLElement): { top: number; bottom: number } {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:absolute;visibility:hidden;padding-top:var(--map-safe-top, 0px);' +
    'padding-bottom:env(safe-area-inset-bottom, 0px)';
  host.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: parseFloat(style.paddingTop) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
  };
  probe.remove();
  return insets;
}
