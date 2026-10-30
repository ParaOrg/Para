import { Button } from '@/design-system/primitives/button';
import type { LngLat } from '@/shared/utils/geo';

import { controlPointsOf, type ContributionStart } from './contribution-start';
import type { Contribution, ContributionDetail } from '../../data/contributions-read';
import { longestRideLine, splitTrail } from '../trail-parts';

interface UseThisLineProps {
  contribution: Contribution;
  /** The opened upload's trail and parts; undefined while read, or when the read failed. */
  detail: ContributionDetail | undefined;
  isDetailLoading: boolean;
  onStart: (start: ContributionStart) => void;
}

const NOTE = 'w-full text-sm text-content-secondary';

/**
 * Use this line: the upload's line goes to the Playground as a draft
 * direction, snapped to the roads there. Only riding becomes a route: with
 * walking in it, the longest ride part is used and the walking left out.
 * When the trail could not be read, the parts are unknown and the upload's
 * own line is used, as for an upload sent before Lakad and Sakay.
 */
export function UseThisLine({
  contribution: c,
  detail,
  isDetailLoading,
  onStart,
}: UseThisLineProps) {
  if (!detail && isDetailLoading) return <p className={NOTE}>Reading the trail…</p>;
  const pieces = detail ? splitTrail(detail.trail, detail.parts) : [];
  const rideCount = pieces.filter((piece) => piece.mode === 'ride').length;
  const hasWalk = pieces.some((piece) => piece.mode === 'walk');
  const line: LngLat[] | null = hasWalk ? longestRideLine(pieces) : c.line;
  if (hasWalk && !line) {
    return (
      <p className={NOTE}>
        {rideCount === 0
          ? 'This upload is all walking: there is no ride to use.'
          : 'No ride in this upload is long enough to use.'}
      </p>
    );
  }
  if (!line || line.length < 2) return <p className={NOTE}>This upload has no line to use.</p>;
  const handleClick = () =>
    onStart({
      kind: 'direction',
      contributionId: c.id,
      points: controlPointsOf(line),
      startName: c.startName,
      endName: c.endName,
    });
  return (
    <>
      {hasWalk && (
        <p className={NOTE}>
          {rideCount > 1
            ? `Walking is left out: Use this line takes the longest of its ${rideCount} rides.`
            : 'Walking is left out: Use this line takes the ride only.'}
        </p>
      )}
      <Button variant="primary" label="Use this line" onClick={handleClick} />
    </>
  );
}
