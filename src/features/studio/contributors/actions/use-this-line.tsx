import { Button } from '@/design-system/primitives/button';
import type { LngLat } from '@/shared/utils/geo';

import { controlPointsOf, type ContributionStart } from './contribution-start';
import { RideList } from './ride-list';
import type { Contribution, ContributionDetail } from '../../data/contributions-read';
import { rideLines, splitTrail } from '../trail-parts';

interface UseThisLineProps {
  contribution: Contribution;
  /** The opened upload's trail and parts; undefined while read, or when the read failed. */
  detail: ContributionDetail | undefined;
  isDetailLoading: boolean;
  onStart: (start: ContributionStart) => void;
  /** A ride's row pointed at or focused, by its trail part, for the map; null when none is. */
  onHighlightRide: (piece: number | null) => void;
}

const NOTE = 'w-full text-sm text-content-secondary';

/**
 * Use this line: a line of the upload goes to the Playground as a draft
 * direction, snapped to the roads there. Only riding becomes a route: with
 * walking in it, each ride is offered on its own and the walking left out.
 * When the trail could not be read, the parts are unknown and the upload's
 * own line is used, as for an upload sent before Lakad and Sakay.
 */
export function UseThisLine({
  contribution: c,
  detail,
  isDetailLoading,
  onStart,
  onHighlightRide,
}: UseThisLineProps) {
  if (!detail && isDetailLoading) return <p className={NOTE}>Reading the trail…</p>;
  const pieces = detail ? splitTrail(detail.trail, detail.parts) : [];
  const hasWalk = pieces.some((piece) => piece.mode === 'walk');
  const rides = hasWalk ? rideLines(pieces) : [];
  const start = (line: readonly LngLat[]) =>
    onStart({
      kind: 'direction',
      contributionId: c.id,
      points: controlPointsOf(line),
      startName: c.startName,
      endName: c.endName,
    });

  if (hasWalk && rides.length > 1) {
    return (
      <>
        <p className={NOTE}>Walking is left out: each ride can be used on its own.</p>
        <RideList rides={rides} onUse={(ride) => start(ride.line)} onHighlight={onHighlightRide} />
      </>
    );
  }
  const line = hasWalk ? (rides[0]?.line ?? null) : c.line;
  if (hasWalk && !line) {
    return (
      <p className={NOTE}>
        {pieces.some((piece) => piece.mode === 'ride')
          ? 'No ride in this upload is long enough to use.'
          : 'This upload is all walking: there is no ride to use.'}
      </p>
    );
  }
  if (!line || line.length < 2) return <p className={NOTE}>This upload has no line to use.</p>;
  return (
    <>
      {hasWalk && <p className={NOTE}>Walking is left out: Use this line takes the ride only.</p>}
      <Button variant="primary" label="Use this line" onClick={() => start(line)} />
    </>
  );
}
