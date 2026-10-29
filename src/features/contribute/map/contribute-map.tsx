import type { MapLibreMap } from 'maplibre-gl';
import { useState, type ReactNode } from 'react';

import { MapView } from '@/features/routes/map/map-view';
import { useRecordingTrail } from '@/features/routes/map/use-recording-trail';

import type { RecordingTrack } from './use-recording-track';

/** What the page draws on the map besides the trail: the shell's locator, which this feature may not import. */
export type ContributeLocatorSlot = (
  map: MapLibreMap,
  isMapLoaded: boolean,
  isRecording: boolean,
  mark: ReactNode,
) => ReactNode;

interface ContributeMapProps {
  track: RecordingTrack;
  /** Whether a recording is on the screen. */
  isRecording: boolean;
  locator?: ContributeLocatorSlot;
  /** The mark button, for the locator's column: null when nothing is recording. */
  mark: ReactNode;
}

/**
 * The map under every screen: the public map's own view, with the recording's
 * trail drawn on it and the shell's locator (the dot, and the button with the
 * map-style picker) on top.
 */
export function ContributeMap({ track, isRecording, locator, mark }: ContributeMapProps) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useRecordingTrail(map, track.trail);

  return (
    <>
      <MapView
        onReady={setMap}
        onLoadedChange={setIsMapLoaded}
        zoomButtons={false}
        foldCredits
        hasMapStyleButton={false}
        creditsAtBottom
      />
      {map && locator?.(map, isMapLoaded, isRecording, mark)}
    </>
  );
}
