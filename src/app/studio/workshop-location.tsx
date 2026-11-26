import type { MapLibreMap } from 'maplibre-gl';
import { Suspense, useState, type ComponentProps } from 'react';

import { LocationIcon } from '@/design-system/primitives/location-icon';
import { CommuterLocation, type LocatorNote } from '@/features/locator';
import { OverviewButton } from '@/features/routes/map/overview-button';
import type { useCardCamera } from '@/features/routes/map/use-card-camera';
import type { useCardStack } from '@/features/routes/map/use-card-stack';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import { useTerminalDots } from '@/features/routes/map/use-terminal-dots';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import {
  FootbridgesSwitch,
  STUDIO_BASEMAPS,
  STUDIO_BASEMAP_THUMBNAILS,
  useIsWideScreen,
} from '@/features/studio';
import type { Turn } from '@/shared/hooks/commit-turn';
import { retryingLazy } from '@/shared/lib/retrying-lazy';
import type { StandingToast } from '@/shared/ui/standing-toasts';
import { retryingImport } from '@/shared/utils/retrying-import';

import { HAS_POSSIBLE_TERMINALS } from './studio-map-marks';

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
  /** Whether the map's ⓘ stands at the bottom left, for the Overview button to stand beside it. */
  hasCredits: boolean;
}

/** What the locator last said, and how many times: each says it again (Locator's onNote). */
interface SaidNote {
  note: LocatorNote;
  saying: number;
}

// The locator's toast, fetched the first time it has something to say, as the public map's is.
const StandingToasts = retryingLazy(() =>
  retryingImport(() => import('@/shared/ui/standing-toasts'))().then(
    (module) => module.StandingToasts,
  ),
);

/**
 * The commuter's own position and the map's design, one pill, as on the
 * public map: the studio sees the map the way a commuter does. What the
 * locator has to say is a problem toast at the top, as there; the Overview
 * button stands at the bottom left, as there too.
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
  hasCredits,
}: WorkshopLocationProps) {
  const { ride, clearOfOpen } = camera;
  const isOverviewOnTop = useIsWideScreen() && (!!saved.selected || cards.choosing);
  // OpenStreetMap's terminals as faint dots, for an editor placing Para's own (.scratch/terminals),
  // when HAS_POSSIBLE_TERMINALS is on.
  useTerminalDots(HAS_POSSIBLE_TERMINALS ? map : null);
  // What the locator last said, and how many times (Locator's onNote).
  const [said, setSaid] = useState<SaidNote | null>(null);
  const handleNote = (note: LocatorNote | null) => {
    setSaid((last) => note && { note, saying: (last?.saying ?? 0) + 1 });
  };
  // The toast's code comes with the first note, and stays.
  const [hasToasts, setHasToasts] = useState(false);
  if (said && !hasToasts) setHasToasts(true);
  const toasts: StandingToast[] = said
    ? [
        {
          id: said.note.id,
          saying: said.saying,
          content: {
            kind: 'problem',
            icon: <LocationIcon />,
            title: said.note.title,
            body: said.note.body,
          },
        },
      ]
    : [];

  return (
    <FootbridgesSwitch map={map}>
      {/* The camera back on what the open card frames; a computer's trip and list have their own (PlaygroundTrip). */}
      <OverviewButton
        isShown={camera.overviewButton.isShown && !isOverviewOnTop}
        go={camera.overviewButton.go}
        isBesideCredits={hasCredits}
        map={map}
      />
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
        onNote={handleNote}
      />
      {hasToasts && (
        <Suspense fallback={null}>
          <StandingToasts toasts={toasts} />
        </Suspense>
      )}
    </FootbridgesSwitch>
  );
}
