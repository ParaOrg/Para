import { useId, type Ref } from 'react';

import { Button } from '@/design-system/primitives/button';

import handWithPhone from './hand-with-phone.svg';

interface TrackRoutesCardProps {
  /** Opens the walkthrough of recording a first ride. */
  onTutorial: () => void;
  /** Puts the walkthrough off. */
  onLater: () => void;
  /** The heading, which takes focus as the card opens. */
  headingRef?: Ref<HTMLHeadingElement>;
}

/**
 * "Track your routes" (Figma 4569:8465): the offer of a walkthrough of recording a first ride,
 * over the map. Where it sits on the map is the page's to decide.
 */
export function TrackRoutesCard({ onTutorial, onLater, headingRef }: TrackRoutesCardProps) {
  const titleId = useId();
  const lineId = useId();
  return (
    <section
      aria-labelledby={titleId}
      aria-describedby={lineId}
      className="flex w-full flex-col gap-6 overflow-clip rounded-4xl bg-surface p-4 font-sn-pro shadow-large"
    >
      <div className="flex items-start gap-4">
        {/* The drawing fills its 68px frame's height less 4.17% top and bottom, as drawn. */}
        <span className="flex size-17 shrink-0 items-center justify-center">
          <img src={handWithPhone} alt="" className="h-full w-auto py-[4.17%]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2
            id={titleId}
            ref={headingRef}
            tabIndex={-1}
            className="text-lg/7 font-semibold text-content-primary"
          >
            Track your routes
          </h2>
          <p id={lineId} className="text-sm/5 text-content-tertiary">
            A quick walkthrough of recording your first ride, step by step.
          </p>
        </div>
      </div>
      <div className="flex gap-2 *:flex-1">
        <Button variant="secondary" label="Later" onClick={onLater} />
        <Button variant="primary" label="Start Tutorial" onClick={onTutorial} />
      </div>
    </section>
  );
}
