import { Button } from '@/design-system/primitives/button';

import { boxAround, type ContributionStart } from './contribution-start';
import type { ContributionPart } from '../../data/contribution-events';
import type { ContributionHinto } from '../../data/contributions-read';
import { minutes } from '../contribution-format';
import { modeAt } from '../trail-parts';

interface HintoListProps {
  hintos: readonly ContributionHinto[];
  /** The upload's walk and ride parts: a hinto while walking is no hintuan. */
  parts: readonly ContributionPart[];
  onStart: (start: ContributionStart) => void;
}

/**
 * The opened upload's hintos as text: the map's circles, for anyone not
 * looking at it. Each made while riding has Draw a hintuan here.
 */
export function HintoList({ hintos, parts, onStart }: HintoListProps) {
  if (hintos.length === 0) return <p>This upload has no hintos.</p>;
  return (
    <ul aria-label="Hintos" className="flex flex-col gap-2">
      {hintos.map((h) => (
        <li key={h.seq} className="flex items-center justify-between gap-2">
          <span>
            Hinto {h.seq + 1}: {minutes(h.seconds)} at {h.at[1].toFixed(5)}, {h.at[0].toFixed(5)}
          </span>
          {modeAt(parts, h.startedAt) === 'walk' ? (
            <span>While walking: not a hintuan.</span>
          ) : (
            <Button
              variant="secondary"
              label="Draw a hintuan here"
              onClick={() => onStart({ kind: 'hintuan', ring: boxAround(h.at) })}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
