import { useId } from 'react';

import { Button } from '@/design-system/primitives/button';

import handWithPhone from './hand-with-phone.svg';

interface TrackRoutesCardProps {
  /** Opens the walkthrough of recording a first ride. */
  onTutorial: () => void;
  /** Puts the walkthrough off. */
  onLater: () => void;
}

/**
 * "Track your routes" (Figma 4451:514, the card 4461:2601): the offer of a walkthrough of
 * recording a first ride, over the map. Where it sits on the map is the page's to decide.
 */
export function TrackRoutesCard({ onTutorial, onLater }: TrackRoutesCardProps) {
  const titleId = useId();
  const lineId = useId();
  return (
    <section
      aria-labelledby={titleId}
      aria-describedby={lineId}
      className="flex w-full flex-col gap-6 overflow-clip rounded-4xl bg-surface p-4 font-sn-pro shadow-large"
    >
      <div className="flex flex-col items-center gap-4">
        {/* The illustration fills its 80px frame's height less 4.17% top and bottom, as drawn. */}
        <span className="flex size-20 items-center justify-center">
          <img src={handWithPhone} alt="" width={15} height={22} className="h-18.25 w-auto" />
        </span>
        <div className="flex w-full flex-col gap-2 text-center">
          <h2 id={titleId} className="text-2xl font-bold text-content-primary">
            Track your routes
          </h2>
          <p id={lineId} className="text-base-lower text-content-tertiary">
            A quick walkthrough of recording your first ride, step by step.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="primary" label="Tutorial" onClick={onTutorial} />
        <Button variant="secondary" label="Later" onClick={onLater} />
      </div>
    </section>
  );
}
