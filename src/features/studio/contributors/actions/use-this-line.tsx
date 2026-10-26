import { Button } from '@/design-system/primitives/button';

import { controlPointsOf, type ContributionStart } from './contribution-start';
import type { Contribution } from '../../data/contributions-read';

interface UseThisLineProps {
  contribution: Contribution;
  onStart: (start: ContributionStart) => void;
}

/**
 * Use this line: the upload's line goes to the Playground as a draft
 * direction, snapped to the roads there. An upload without a line has none to use.
 */
export function UseThisLine({ contribution: c, onStart }: UseThisLineProps) {
  if (!c.line || c.line.length < 2) {
    return <p className="w-full text-sm text-content-secondary">This upload has no line to use.</p>;
  }
  const line = c.line;
  return (
    <Button
      variant="primary"
      label="Use this line"
      onClick={() =>
        onStart({
          kind: 'direction',
          contributionId: c.id,
          points: controlPointsOf(line),
          startName: c.startName,
          endName: c.endName,
        })
      }
    />
  );
}
