import { useEffect, useRef, useState } from 'react';

import { useEscape } from '@/shared/hooks/use-escape';
import { cn } from '@/shared/utils/cn';

import { Coachmark, type CoachmarkFrame, type CoachmarkTarget } from './coachmark';
import { TUTORIAL_STEPS, type TutorialDemo, type TutorialTarget } from './tutorial-steps';
import { RecordingScreen } from '../screens/recording-screen';
import { START_BUTTON_ATTR } from '../screens/start-morph-attrs';

interface TutorialProps {
  /** What the page shows under the step: Record, or the demo's running or paused recording. */
  onDemoChange: (demo: TutorialDemo) => void;
  /** Skip, Escape, or Got it: back to Record. Keeps its identity, or each step's wait restarts. */
  onClose: () => void;
}

interface CoachmarkPlace {
  target: CoachmarkTarget;
  frame: CoachmarkFrame;
}

/**
 * How long a step waits for its control to be drawn: the demo's lazy parts arrive within a frame
 * or two. One never drawn (Start held back by the app's own gate, Flag a stop's chunk missing
 * offline) ends the tutorial rather than leave the page covered with nothing to press.
 */
const TARGET_WAIT_MS = 3000;

/** How many frames a control's box must keep still before it is taken as settled. */
const SETTLED_FRAMES = 10;

const isSamePlace = (a: CoachmarkPlace, b: CoachmarkPlace): boolean =>
  a.target.left === b.target.left &&
  a.target.top === b.target.top &&
  a.target.width === b.target.width &&
  a.target.height === b.target.height &&
  a.frame.width === b.frame.width &&
  a.frame.height === b.frame.height;

const DEMO_FIGURES = { elapsedSeconds: 0, distanceM: 0 };

const doNothing = () => undefined;

/** The step's control on the page, or null while it is not drawn yet. */
function findTarget(target: TutorialTarget): Element | null {
  if (target.kind === 'start') return document.querySelector(`[${START_BUTTON_ATTR}]`);
  return document.querySelector(`button[aria-label="${target.name}"]`);
}

/**
 * The tutorial (Figma 4530:3552), from Record's ?: seven coachmarks, one control each. Start
 * tracking is pointed at on Record itself; the rest on a demo recording drawn in its place, with
 * nothing recorded, no location asked for, and no control that does anything. The page shows the
 * demo's Flag a stop where a recording's goes (onDemoChange). Leaving at any step is back on Record.
 */
export function Tutorial({ onDemoChange, onClose }: TutorialProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = TUTORIAL_STEPS[stepIndex];
  const overlayRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<CoachmarkPlace | null>(null);
  // Escape leaves at any moment, a step's card drawn or not.
  useEscape(onClose, true);
  const discardRef = useRef<HTMLButtonElement>(null);
  const creditsRef = useRef<HTMLButtonElement>(null);

  // The control's box, measured while it settles (the demo's card and the map's column move into
  // place after they are drawn), then again only when the page is resized or scrolled. A control
  // not drawn, or drawn with no size (display: none), is waited for, then the tutorial ends.
  useEffect(() => {
    if (!step) return;
    let frameId = 0;
    let stillFrames = 0;
    let last: CoachmarkPlace | null = null;
    const askedAt = performance.now();
    const measure = (): 'placed' | 'missing' => {
      const overlay = overlayRef.current;
      const element = findTarget(step.target);
      const box = element?.getBoundingClientRect();
      if (!overlay || !box || box.width === 0 || box.height === 0) return 'missing';
      const frame = overlay.getBoundingClientRect();
      const next: CoachmarkPlace = {
        target: {
          left: box.left - frame.left,
          top: box.top - frame.top,
          width: box.width,
          height: box.height,
        },
        frame: { width: frame.width, height: frame.height },
      };
      if (last && isSamePlace(last, next)) {
        stillFrames += 1;
      } else {
        stillFrames = 0;
        last = next;
        setPlace(next);
      }
      return 'placed';
    };
    const settle = () => {
      if (measure() === 'missing' && performance.now() - askedAt > TARGET_WAIT_MS) {
        console.warn('The tutorial could not find its step on the page.', step.target);
        onClose();
        return;
      }
      if (stillFrames < SETTLED_FRAMES) frameId = requestAnimationFrame(settle);
    };
    const settleAgain = () => {
      cancelAnimationFrame(frameId);
      stillFrames = 0;
      frameId = requestAnimationFrame(settle);
    };
    settle();
    const resizes = new ResizeObserver(settleAgain);
    resizes.observe(document.documentElement);
    window.addEventListener('resize', settleAgain);
    window.addEventListener('scroll', settleAgain, true);
    return () => {
      cancelAnimationFrame(frameId);
      resizes.disconnect();
      window.removeEventListener('resize', settleAgain);
      window.removeEventListener('scroll', settleAgain, true);
    };
  }, [step, onClose]);

  if (!step) return null;

  const goTo = (index: number) => {
    const next = TUTORIAL_STEPS[index];
    if (!next) return;
    setPlace(null);
    setStepIndex(index);
    onDemoChange(next.demo);
  };

  return (
    <>
      {step.demo && (
        // Under the overlay, which takes every tap: nothing here can be pressed.
        <div inert className="contents">
          <RecordingScreen
            figures={DEMO_FIGURES}
            mode="walk"
            isPaused={step.demo === 'paused'}
            shouldFocusPause={false}
            onPause={doNothing}
            onResume={doNothing}
            onModeSwitch={doNothing}
            onFinish={doNothing}
            onAskToStop={doNothing}
            discardButtonRef={discardRef}
            isCardFolded={false}
            onCardFoldedChange={doNothing}
            onOpenCredits={doNothing}
            creditsButtonRef={creditsRef}
          />
        </div>
      )}
      {/* Measured from, and drawn over the page once the step's control is there: until then
          nothing covers the page. */}
      <div
        ref={overlayRef}
        className={cn('absolute inset-0', place ? 'z-50' : 'pointer-events-none')}
      >
        {place && (
          <Coachmark
            key={stepIndex}
            target={place.target}
            frame={place.frame}
            title={step.title}
            body={step.body}
            stepNumber={stepIndex + 1}
            stepCount={TUTORIAL_STEPS.length}
            onNext={() => goTo(stepIndex + 1)}
            onClose={onClose}
          />
        )}
      </div>
    </>
  );
}
