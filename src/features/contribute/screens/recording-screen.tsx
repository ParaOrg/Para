import { useEffect, useId, useRef, useState, type Ref } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { ChevronDownIcon, CloseIcon } from '@/shared/ui/route-icons';

import { RecordingCard, type RecordingCardState } from './recording-card';
import { RecordingTint } from './recording-tint';
import { TrackingButton } from './tracking-button';
import { ConfirmDelete } from '../common/confirm-delete';
import { useStackRoom } from '../common/use-stack-room';
import { CreditsButton } from '../map/credits-button';
import type { RecordingFigures } from '../recorder/recording-figures';
import type { Mode } from '../recorder/recording-rules';

interface RecordingScreenProps {
  figures: RecordingFigures;
  mode: Mode;
  /** Paused for now: Resume and Finish replace Pause and the mode button. */
  isPaused: boolean;
  /** Whether the screen is being kept awake. */
  isAwake: boolean;
  /** Focus the Pause bar as the screen opens, not its heading: back from Keep recording. */
  shouldFocusPause: boolean;
  onPause: () => void;
  onResume: () => void;
  onModeSwitch: () => void;
  /** Ends the recording and opens the Save form. */
  onFinish: () => void;
  /** Throws the recording away, once the contributor has said yes. */
  onDiscard: () => void;
  /** The card folded away: the map has the screen, and the recording goes on. */
  isCardFolded: boolean;
  onCardFoldedChange: (isFolded: boolean) => void;
  /** The ⓘ: opens the map's credits, the Map Data Source sheet. */
  onOpenCredits: () => void;
  /** The ⓘ, for focus to come back to when the credits close. */
  creditsButtonRef: Ref<HTMLButtonElement>;
}

const CARD_STATE = { walk: 'lakad', ride: 'sakay' } satisfies Record<Mode, RecordingCardState>;

/**
 * While recording, or paused (Figma's "Recording" frames 4494:2038, 4494:2134
 * and 4494:2233): the map's edges tinted for the state, ✕ at the top left, the
 * recording card with Pause and the mode button, or Resume and Finish, 20 in
 * and 40 over the screen's foot, and the map's ⓘ under it. A chevron over the
 * card's left folds it away (4496:10784, 4496:10906): the right-hand column
 * slides down to where the card was, and the chevron, turned up, brings it back.
 */
export function RecordingScreen({
  figures,
  mode,
  isPaused,
  isAwake,
  shouldFocusPause,
  onPause,
  onResume,
  onModeSwitch,
  onFinish,
  onDiscard,
  isCardFolded,
  onCardFoldedChange,
  onOpenCredits,
  creditsButtonRef,
}: RecordingScreenProps) {
  const cardId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stackRef = useStackRoom();
  const pauseRef = useRef<HTMLButtonElement>(null);
  // The heading takes focus as the screen opens, a screen reader starting at its top; back from
  // Keep recording it is the Pause bar, where the contributor was before.
  useEffect(() => {
    (shouldFocusPause ? pauseRef.current : headingRef.current)?.focus();
    // Once, as the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a change of the prop alone must not move focus
  }, []);
  const [isAsking, setIsAsking] = useState(false);
  const closeRef = useRef<HTMLDivElement>(null);
  const wasAsking = useRef(false);

  // Back from the question, focus returns to ✕, which asked it.
  useEffect(() => {
    if (wasAsking.current && !isAsking) closeRef.current?.querySelector('button')?.focus();
    wasAsking.current = isAsking;
  }, [isAsking]);

  const state: RecordingCardState = isPaused ? 'paused' : CARD_STATE[mode];

  // The recording frames stand the right-hand column 20 in, where Start keeps 16.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--dock-right', '1.25rem');
    return () => {
      root.style.removeProperty('--dock-right');
    };
  }, []);

  return (
    <>
      <RecordingTint state={state} />
      <div
        ref={closeRef}
        className="absolute top-0 left-0 z-30 pt-[calc(env(safe-area-inset-top)+1.5rem)] pl-[max(1rem,env(safe-area-inset-left))]"
      >
        <IconButton
          tooltip="top"
          size="large"
          label="Discard recording"
          icon={<CloseIcon />}
          onClick={() => setIsAsking(true)}
        />
      </div>
      {/* At the left, level with the right-hand column's foot, which stands 16 (--dock-gap) over
          the stack: it slides with it as the card folds and comes back. */}
      <div className="absolute bottom-0 left-5 z-10 flex -translate-y-[calc(var(--stack-room,0px)+var(--dock-gap,1rem))] transition-[translate] duration-sheet ease-enter motion-reduce:transition-none">
        <IconButton
          tooltip="right"
          size="large"
          label={isCardFolded ? 'Show the recording card' : 'Hide the recording card'}
          icon={isCardFolded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          aria-expanded={!isCardFolded}
          aria-controls={cardId}
          onClick={() => onCardFoldedChange(!isCardFolded)}
        />
      </div>
      <div className="absolute bottom-3 left-3 z-10 flex">
        <CreditsButton ref={creditsButtonRef} onClick={onOpenCredits} />
      </div>
      <section
        ref={stackRef}
        aria-labelledby="recording-heading"
        className={
          'absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 px-5 ' +
          // Open, the card stands 40 over the screen's foot; folded, the column does, its 16 over
          // the stack taken off.
          (isCardFolded
            ? 'pb-[calc(max(2.125rem,env(safe-area-inset-bottom))-0.625rem)]'
            : 'pb-[calc(0.375rem+max(2.125rem,env(safe-area-inset-bottom)))]')
        }
      >
        <h1 id="recording-heading" ref={headingRef} tabIndex={-1} className="sr-only">
          {isPaused ? 'Recording paused' : 'Recording a route'}
        </h1>
        {/* At the foot, over the card, so it never covers the page's problem line at the top. */}
        {isAsking && (
          <ConfirmDelete
            question="Throw this recording away?"
            onConfirm={onDiscard}
            onKeep={() => setIsAsking(false)}
          />
        )}
        {!isAwake && !isPaused && (
          <p className="bg-surface p-2 font-sn-pro text-sm/5 text-content-primary">
            The screen could not be kept awake, so it may sleep and the location may stop.
          </p>
        )}
        <div id={cardId} hidden={isCardFolded}>
          <RecordingCard
            elapsedSeconds={figures.elapsedSeconds}
            distanceM={figures.distanceM}
            state={state}
          >
            {isPaused ? (
              <>
                <TrackingButton variant="resume" corner="bottom-left" onClick={onResume} />
                <TrackingButton variant="finish" corner="bottom-right" onClick={onFinish} />
              </>
            ) : (
              <>
                <TrackingButton
                  ref={pauseRef}
                  variant="pause"
                  corner="bottom-left"
                  onClick={onPause}
                />
                <TrackingButton
                  variant={mode === 'walk' ? 'sakay' : 'lakad'}
                  corner="bottom-right"
                  onClick={onModeSwitch}
                />
              </>
            )}
          </RecordingCard>
        </div>
      </section>
    </>
  );
}

/** chevron-up: the chevron-down turned over, to bring the card back. */
function ChevronUpIcon() {
  return (
    <span className="block size-full rotate-180 *:size-full">
      <ChevronDownIcon />
    </span>
  );
}
