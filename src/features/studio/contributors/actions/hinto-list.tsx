import { Button } from '@/design-system/primitives/button';

import { boxAround, type ContributionStart } from './contribution-start';
import type { ContributionHinto } from '../../data/contributions-read';
import { minutes } from '../contribution-format';

interface HintoListProps {
  hintos: readonly ContributionHinto[];
  onStart: (start: ContributionStart) => void;
}

/** The opened upload's hintos as text, each with Draw a hintuan here: the map's circles, for anyone not looking at it. */
export function HintoList({ hintos, onStart }: HintoListProps) {
  if (hintos.length === 0) return <p>This upload has no hintos.</p>;
  return (
    <ul aria-label="Hintos" className="flex flex-col gap-2">
      {hintos.map((h) => (
        <li key={h.seq} className="flex items-center justify-between gap-2">
          <span>
            Hinto {h.seq + 1}: {minutes(h.seconds)} at {h.at[1].toFixed(5)}, {h.at[0].toFixed(5)}
          </span>
          <Button
            variant="secondary"
            label="Draw a hintuan here"
            onClick={() => onStart({ kind: 'hintuan', ring: boxAround(h.at) })}
          />
        </li>
      ))}
    </ul>
  );
}
