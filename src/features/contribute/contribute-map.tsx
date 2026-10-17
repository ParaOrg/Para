import type { MapLibreMap } from 'maplibre-gl';
import { useState } from 'react';

import { MapView } from '@/features/routes/map/map-view';
import { RideFollowControls } from '@/features/routes/map/ride-follow-controls';
import type { FollowMode } from '@/features/routes/map/use-ride-follow';
import { useRideFollow } from '@/features/routes/map/use-ride-follow';
import { useRideTrail } from '@/features/routes/map/use-ride-trail';

import type { Follow } from './use-follow';
import type { RideTrack } from './use-ride-track';

interface ContributeMapProps {
  track: RideTrack;
  follow: Follow;
  /** Whether a recording is on the screen, which is when the follow controls show. */
  hasRecording: boolean;
}

const NEXT_MODE = { 'course-up': 'north-up', 'north-up': 'course-up' } satisfies Record<
  FollowMode,
  FollowMode
>;

/**
 * The map under every screen: the public map's own view and map-style button,
 * with the recording's trail drawn on it and the camera following the ride.
 */
export function ContributeMap({ track, follow, hasRecording }: ContributeMapProps) {
  const [map, setMap] = useState<MapLibreMap | null>(null);

  useRideTrail(map, track.trail);
  useRideFollow(map, {
    here: track.trail.here,
    bearing: track.bearing,
    mode: follow.mode,
    isFollowing: follow.isFollowing,
    onLetGo: follow.letGo,
  });

  return (
    <>
      <MapView onReady={setMap} zoomButtons={false} foldCredits />
      {map && hasRecording && (
        <RideFollowControls
          map={map}
          mode={follow.mode}
          isFollowing={follow.isFollowing}
          onModeToggle={() => follow.setMode(NEXT_MODE[follow.mode])}
          onRecentre={follow.recentre}
        />
      )}
    </>
  );
}
