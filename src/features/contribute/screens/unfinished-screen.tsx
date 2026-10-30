import { RecordingCard } from './recording-card';
import { TrackingButton } from './tracking-button';
import { BackToMapButton } from '../common/back-to-map-button';
import { useFocusHeading } from '../common/use-focus-heading';
import { useStackRoom } from '../common/use-stack-room';
import type { RecordingFigures } from '../recorder/recording-figures';

interface UnfinishedScreenProps {
  figures: RecordingFigures;
  onResume: () => void;
  onStop: () => void;
}

/**
 * A recording was left open when the page closed: carry on with it, or stop it where it was. No
 * Figma frame of its own: the recording card, paused, with Resume and Stop, under a card that says why.
 */
export function UnfinishedScreen({ figures, onResume, onStop }: UnfinishedScreenProps) {
  const headingRef = useFocusHeading();
  const stackRef = useStackRoom();
  return (
    <>
      <BackToMapButton />
      <section
        ref={stackRef}
        aria-labelledby="unfinished-heading"
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 px-4 pb-[calc(1.5rem+max(2.125rem,env(safe-area-inset-bottom)))]"
      >
        <div className="rounded-4xl bg-surface px-4 pt-4 pb-2 font-sn-pro text-content-primary">
          <h1
            id="unfinished-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl/7 font-extrabold focus:outline-none"
          >
            A recording was left open
          </h1>
          <p className="py-2 text-base/6">
            Resume it, and the time since its last fix is logged as a gap, or stop it where it was.
          </p>
        </div>
        <RecordingCard
          elapsedSeconds={figures.elapsedSeconds}
          distanceM={figures.distanceM}
          state="paused"
        >
          <TrackingButton variant="resume" corner="bottom-left" onClick={onResume} />
          <TrackingButton variant="stop" corner="bottom-right" onClick={onStop} />
        </RecordingCard>
      </section>
    </>
  );
}
