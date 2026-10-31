import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, type ReactNode } from 'react';

import { BASEMAPS } from '@/features/routes/map/basemap';
import { BASEMAP_THUMBNAILS } from '@/features/routes/map/basemap-thumbnails';
import { coarse } from '@/features/routes/map/map-view';

import { isLocationGranted } from './location-permission';
import { Locator } from './locator';
import { LocatorOnMap } from './locator-on-map';
import { useLocator } from './use-locator';
import { useLocatorMood } from './use-locator-mood';

interface ContributorLocationProps {
  map: MapLibreMap | null;
  /** The map's 'load' is in and it has not failed (MapView's onLoadedChange). */
  isMapLoaded: boolean;
  /** A recording is on: the camera follows the contributor from its start. */
  isRecording: boolean;
  /** What stands above the button in its column; the contributor's mark button. */
  above?: ReactNode;
}

/**
 * Where the contributor sits from the map's centre: lifted clear of the bars
 * along the bottom, by half of what the page stands there (`--dock-foot`, as
 * Locator keeps its button clear of them), so they sit in the middle of what shows.
 */
function clearOfBars(): [number, number] {
  const foot = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--dock-foot'),
  );
  return [0, Number.isFinite(foot) ? -foot / 2 : 0];
}

/**
 * The public map's locator for the contributor's map: the button with the
 * map-style picker on it, and the dot with its moods and heading, without the
 * cards' sheet, gaze and loop tip.
 *
 * It starts by itself when the browser already allows the location, and
 * otherwise waits for a tap. When a recording starts it follows the
 * contributor if the camera is not already on them.
 */
export function ContributorLocation({
  map,
  isMapLoaded,
  isRecording,
  above,
}: ContributorLocationProps) {
  const locator = useLocator(map, { compass: coarse, snap: 'low', offset: clearOfBars });
  const { mood, face, beat, poke } = useLocatorMood(locator);
  const { tap, status, camera } = locator;

  // The latest tap, for effects that must not re-run when the hook hands out a new one.
  const latestTap = useRef(tap);
  useEffect(() => {
    latestTap.current = tap;
  });

  // Permission already granted: start as if tapped once, when the map is there.
  useEffect(() => {
    if (!map) return;
    let isCancelled = false;
    void isLocationGranted().then((isGranted) => {
      if (isGranted && !isCancelled) latestTap.current();
    });
    return () => {
      isCancelled = true;
    };
  }, [map]);

  // A recording starts: follow the contributor, unless the camera is on them already.
  const wasRecording = useRef(isRecording);
  useEffect(() => {
    const hasStarted = isRecording && !wasRecording.current;
    wasRecording.current = isRecording;
    if (!hasStarted) return;
    const isRefused = status === 'denied' || status === 'unavailable';
    if (!isRefused && camera !== 'tracked' && camera !== 'compass') latestTap.current();
  }, [isRecording, status, camera]);

  return (
    <>
      {map && (
        <Locator
          locator={locator}
          map={map}
          isMapLoaded={isMapLoaded}
          basemaps={BASEMAPS}
          basemapThumbnails={BASEMAP_THUMBNAILS}
          labelsPlace="map"
          docked={false}
          above={above}
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
          onPoke={poke}
        />
      )}
    </>
  );
}
