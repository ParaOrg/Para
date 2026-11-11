import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { Switch } from '@/design-system/primitives/switch';
import type { RecordingTrail } from '@/features/routes/map/recording-trail';

import { rideSummaryPng } from './draw-ride-summary';
import type { RideSummary } from './ride-summary';
import { shareOrSave, summaryFileName, type ShareOutcome } from './share-ride-summary';
import { useQuestionFocus } from '../account/use-question-focus';

interface RideSummaryPreviewProps {
  summary: RideSummary;
  /** The whole trail, drawn on the card. It is null while read, and when the ride has none. */
  trail: RecordingTrail | null;
  startedAt: number;
  /** Close or Escape. */
  onClose: () => void;
}

const OUTCOME_TEXT: Record<ShareOutcome, string | null> = {
  shared: null,
  saved: 'Saved to your downloads.',
  cancelled: null,
  screenshot: 'The picture could not be shared. Take a screenshot of the card to share it.',
};

/**
 * The ride's summary card, Strava's after-a-ride card in Para's colours, over the frosted page:
 * the picture as it will be shared, then Share (or Save where the phone cannot share files) and
 * Close. The picture is drawn once, when it opens.
 */
export function RideSummaryPreview({
  summary,
  trail,
  startedAt,
  onClose,
}: RideSummaryPreviewProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const seeThroughId = useId();
  // See-through: the words white on a clear ground, to lay over a photo in a story.
  const [isSeeThrough, setIsSeeThrough] = useState(false);
  const [png, setPng] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  useQuestionFocus(dialogRef, headingRef, isSharing, onClose);

  useEffect(() => {
    let url: string | null = null;
    let isCurrent = true;
    rideSummaryPng(summary, trail, isSeeThrough ? 'see-through' : 'card')
      .then((blob) => {
        if (!isCurrent) return;
        url = URL.createObjectURL(blob);
        setPng({ blob, url });
        setError(null);
      })
      .catch(() => {
        if (!isCurrent) return;
        // An earlier picture is not this ride's card any more, so it is not left up to be shared.
        setPng(null);
        setError('The summary could not be drawn on this phone.');
      });
    return () => {
      isCurrent = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [summary, trail, isSeeThrough]);

  const handleShare = async () => {
    if (!png) return;
    setIsSharing(true);
    setNote(null);
    try {
      setNote(OUTCOME_TEXT[await shareOrSave(png.blob, summaryFileName(startedAt))]);
    } finally {
      // Whatever sharing did, Close and Escape work again.
      setIsSharing(false);
    }
  };

  return (
    <section
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="absolute inset-0 z-50 flex items-center overflow-y-auto bg-surface/80 px-5 py-[max(1.5rem,env(safe-area-inset-top))] font-sn-pro text-content-primary backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <h2
          id={titleId}
          ref={headingRef}
          tabIndex={-1}
          className="text-center text-2xl/8 font-semibold focus:outline-none"
        >
          Ride summary
        </h2>
        <div
          className={`aspect-[4/5] w-full overflow-hidden rounded-2xl shadow-lg ${isSeeThrough ? 'bg-surface-inverse' : 'bg-surface-secondary'}`}
        >
          {png && (
            <img
              src={png.url}
              alt={`${summary.title}${summary.to ? ` to ${summary.to}` : ''}, ${summary.date}`}
              className="size-full"
            />
          )}
        </div>
        <div className="flex items-center justify-between gap-4">
          <span id={seeThroughId} className="text-base/6">
            See-through, to put over a photo
          </span>
          <Switch
            state={isSeeThrough ? 'on' : 'rest'}
            labelledBy={seeThroughId}
            disabled={isSharing}
            onClick={() => setIsSeeThrough((was) => !was)}
          />
        </div>
        {(error || note) && (
          <p role="status" className="text-center text-sm/5 text-content-quaternary">
            {error ?? note}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            label={isSharing ? 'Sharing…' : 'Share'}
            disabled={!png || isSharing}
            onClick={() => void handleShare()}
          />
          <Button
            variant="plain"
            label="Close"
            disabled={isSharing}
            onClick={onClose}
            data-safe-answer
          />
        </div>
      </div>
    </section>
  );
}
