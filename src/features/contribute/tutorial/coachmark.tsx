import { useEffect, useId, useRef } from 'react';

import { Button } from '@/design-system/primitives/button';
import { cn } from '@/shared/utils/cn';

/** The target's box on the page, in the overlay's own coordinates. */
export interface CoachmarkTarget {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The overlay's size: where the card goes depends on which half the target is in. */
export interface CoachmarkFrame {
  width: number;
  height: number;
}

interface CoachmarkProps {
  target: CoachmarkTarget;
  frame: CoachmarkFrame;
  title: string;
  body: string;
  stepNumber: number;
  stepCount: number;
  onNext: () => void;
  /** Skip, or Got it on the last step: back to Record. */
  onClose: () => void;
}

/** How far the spotlight reaches round its target (the frames' 8). */
const SPOTLIGHT_PAD = 8;
/** The card's gap from the spotlight, which its caret spans (the frames' 10). */
const CARET_HEIGHT = 10;
const CARET_WIDTH = 20;
/** The card's inset from the screen's sides (the frames' 32), and its corner (24). */
const CARD_INSET = 32;
const CARD_RADIUS = 24;

/**
 * One step of the tutorial (Figma's Coachmark overlay, 4530:3569): the page dimmed in
 * Background/surface-transparent but for a spotlight on the step's control, and a card with the
 * step's title and words, "n of 7", Skip and Next (Got it on the last), its caret pointing at the
 * spotlight. Above the control when it is in the lower half, under it in the upper. A dialog:
 * focus on Next, Tab goes round the card (Escape is the tutorial's own). Nothing under it takes a tap.
 */
export function Coachmark({
  target,
  frame,
  title,
  body,
  stepNumber,
  stepCount,
  onNext,
  onClose,
}: CoachmarkProps) {
  const titleId = useId();
  const bodyId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const isLast = stepNumber === stepCount;

  // Each step's card is new (keyed by its step): focus goes to its Next, so the step is read out.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    [...card.querySelectorAll('button')].at(-1)?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const buttons = [...card.querySelectorAll('button')];
      const first = buttons.at(0);
      const last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    card.addEventListener('keydown', handleKeyDown);
    return () => card.removeEventListener('keydown', handleKeyDown);
  }, []);

  const spot = {
    left: target.left - SPOTLIGHT_PAD,
    top: target.top - SPOTLIGHT_PAD,
    width: target.width + 2 * SPOTLIGHT_PAD,
    height: target.height + 2 * SPOTLIGHT_PAD,
  };
  const isAbove = target.top + target.height / 2 > frame.height / 2;
  // The caret over the target's middle, kept off the card's rounded corners.
  const caretLeft = Math.min(
    Math.max(target.left + target.width / 2 - CARET_WIDTH / 2, CARD_INSET + CARD_RADIUS),
    frame.width - CARD_INSET - CARD_RADIUS - CARET_WIDTH,
  );

  return (
    <div className="absolute inset-0 z-50 font-sn-pro">
      {/* The page dimmed all round the spotlight, by the spotlight's own shadow. */}
      <div
        aria-hidden
        className="absolute rounded-full shadow-[0_0_0_100vmax_var(--color-surface-transparent)]"
        style={spot}
      />
      <svg
        aria-hidden
        viewBox="0 0 20 10"
        className={cn('absolute h-2.5 w-5 fill-surface', !isAbove && 'rotate-180')}
        style={{
          left: caretLeft,
          top: isAbove ? spot.top - CARET_HEIGHT : spot.top + spot.height,
        }}
      >
        <path d="M0 0H20L10 10Z" />
      </svg>
      <section
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="absolute inset-x-8 flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-large"
        style={
          isAbove
            ? { bottom: frame.height - spot.top + CARET_HEIGHT }
            : { top: spot.top + spot.height + CARET_HEIGHT }
        }
      >
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-lg/7 font-semibold text-content-primary">
            {title}
          </h2>
          <p id={bodyId} className="text-sm/5 text-content-secondary">
            {body}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm/5 text-content-tertiary">
            {stepNumber} of {stepCount}
          </p>
          <div className="flex items-center gap-2">
            {!isLast && <Button variant="plain" label="Skip" onClick={onClose} />}
            <Button
              variant="primary"
              size="small"
              label={isLast ? 'Got it' : 'Next'}
              onClick={isLast ? onClose : onNext}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
