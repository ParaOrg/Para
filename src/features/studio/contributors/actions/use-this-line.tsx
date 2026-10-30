import { Button } from '@/design-system/primitives/button';

import { controlPointsOf, type ContributionStart } from './contribution-start';
import type { Contribution, ContributionDetail } from '../../data/contributions-read';
import { longestRide, splitTrail } from '../trail-parts';

interface UseThisLineProps {
  contribution: Contribution;
  /** The opened upload's trail and parts; nothing is offered until they are read. */
  detail: ContributionDetail | undefined;
  onStart: (start: ContributionStart) => void;
}

/**
 * Use this line: the upload's line goes to the Playground as a draft
 * direction, snapped to the roads there. Only riding becomes a route: with
 * walking in it, the longest ride part is used and the walking left out.
 */
export function UseThisLine({ contribution: c, detail, onStart }: UseThisLineProps) {
  if (!detail) return null;
  const pieces = splitTrail(detail.trail, detail.parts);
  const hasWalk = pieces.some((piece) => piece.mode === 'walk');
  const ride = hasWalk ? longestRide(pieces) : null;
  const line = hasWalk ? (ride?.points.map((p) => p.at) ?? null) : c.line;
  if (hasWalk && !line) {
    return (
      <p className="w-full text-sm text-content-secondary">
        This upload is all walking: there is no ride to use.
      </p>
    );
  }
  if (!line || line.length < 2) {
    return <p className="w-full text-sm text-content-secondary">This upload has no line to use.</p>;
  }
  const rideCount = pieces.filter((piece) => piece.mode === 'ride').length;
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
        <p className="w-full text-sm text-content-secondary">
          {rideCount > 1
            ? `Walking is left out: Use this line takes the longest of its ${rideCount} rides.`
            : 'Walking is left out: Use this line takes the ride only.'}
        </p>
      )}
      <Button variant="primary" label="Use this line" onClick={handleClick} />
    </>
  );
}
