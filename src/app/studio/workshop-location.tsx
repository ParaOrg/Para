import type { MapLibreMap } from 'maplibre-gl';
import type { ComponentProps } from 'react';

import { CommuterLocation } from '@/features/locator';
import type { useCardCamera } from '@/features/routes/map/use-card-camera';
import type { useCardStack } from '@/features/routes/map/use-card-stack';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import { STUDIO_BASEMAPS, STUDIO_BASEMAP_THUMBNAILS } from '@/features/studio';
import type { Turn } from '@/shared/hooks/commit-turn';

interface WorkshopLocationProps {
  map: MapLibreMap | null;
  isMapLoaded: boolean;
  saved: ReturnType<typeof useSavedRoutes<DirectionRow>>;
  hotspots: ReturnType<typeof useSavedHotspots<HotspotRow>>;
  cards: ReturnType<typeof useCardStack>;
  camera: ReturnType<typeof useCardCamera>;
  /** The page's turn for the pill's camera, taken where the workshop's hooks stand. */
  cameraTurn: Turn;
  hushedAt: ComponentProps<typeof CommuterLocation>['hushedAt'];
}

/**
 * The commuter's own position and the map's design, one pill, as on the
 * public map: the studio sees the map the way a commuter does.
 */
export function WorkshopLocation({
  map,
  isMapLoaded,
  saved,
  hotspots,
  cards,
  camera,
  cameraTurn,
  hushedAt,
}: WorkshopLocationProps) {
  const { ride, clearOfOpen } = camera;

  return (
    <CommuterLocation
      map={map}
      isMapLoaded={isMapLoaded}
      basemaps={STUDIO_BASEMAPS}
      basemapThumbnails={STUDIO_BASEMAP_THUMBNAILS}
      labelsPlace="studio"
      snap={cards.snap}
      offset={clearOfOpen}
      docked={cards.open}
      cameraTurn={cameraTurn}
      picks={{
        pickedId: ride.pickedId,
        pinAt: ride.pinAt,
        place: hotspots.selected,
        trip: saved.selected,
        highlight: saved.highlight,
        candidates: saved.candidates,
        litDirections: saved.litDirections,
      }}
      hushedAt={hushedAt}
    />
  );
}
