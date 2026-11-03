import type { MapLibreMap } from 'maplibre-gl';

import {
  MapPlaceholder,
  StudioContributors,
  StudioPublicView,
  type ContributionStart,
  type useStudioMap,
} from '@/features/studio';

interface OtherMapsProps {
  studioMap: ReturnType<typeof useStudioMap>['studioMap'];
  /** The Contributors map is on (CONTRIBUTIONS) and chosen. */
  isContributors: boolean;
  map: MapLibreMap | null;
  /** The signed-in editor's id: a new editor's Contributors map starts afresh. */
  userId: string | undefined;
  isSignedIn: boolean;
  /** A line is being drawn in the Playground. */
  hasLine: boolean;
  onSignIn: () => void;
  onOpenPlayground: () => void;
  onContributionStart: (start: ContributionStart) => void;
}

/**
 * The maps beside the Playground: the Contributors map, the Public map, and
 * the placeholder for one that is not on yet.
 */
export function OtherMaps({
  studioMap,
  isContributors,
  map,
  userId,
  isSignedIn,
  hasLine,
  onSignIn,
  onOpenPlayground,
  onContributionStart,
}: OtherMapsProps) {
  return (
    <>
      {isContributors && (
        <StudioContributors
          key={userId}
          map={map}
          isSignedIn={isSignedIn}
          onSignIn={onSignIn}
          onOpenPlayground={onOpenPlayground}
          onStart={onContributionStart}
        />
      )}
      {studioMap === 'public' ? (
        <StudioPublicView hasLine={hasLine} onOpenPlayground={onOpenPlayground} />
      ) : (
        !isContributors &&
        studioMap !== 'playground' && (
          <MapPlaceholder map={studioMap} hasLine={hasLine} onOpenPlayground={onOpenPlayground} />
        )
      )}
    </>
  );
}
