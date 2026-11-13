import { useId, useRef } from 'react';

import { Button } from '@/design-system/primitives/button';
import { IconButton } from '@/design-system/primitives/icon-button';
import { useEscape } from '@/shared/hooks/use-escape';
import { useFocusHeading } from '@/shared/hooks/use-focus-heading';

import { StopNotesTimeline, type StopNotesTimelineProps } from './stop-notes-timeline';
import { StopNotesTitle } from './stop-notes-title';
import { ArrowLeftIcon } from '../account/arrow-left-icon';

interface StopNotesScreenProps extends Omit<StopNotesTimelineProps, 'headingRef' | 'isFlush'> {
  /** The back arrow, Go back, Escape, or Android's back: closes the page. */
  onBack: () => void;
}

/**
 * Figma's Stops notes (4720:28437): the back arrow, the title and how many stops the ride has
 * flagged, then the stops on their timeline. Every stop deleted, it says so, with Go back: the
 * Stops notes button has gone with the last flag, so the page cannot be opened again.
 */
export function StopNotesScreen({ marks, onBack, ...timeline }: StopNotesScreenProps) {
  const headingId = useId();
  const headingRef = useFocusHeading();
  const sectionRef = useRef<HTMLElement>(null);
  // Escape is a note's or a stop map's first, while one is open, then the page's.
  useEscape(() => {
    if (!sectionRef.current?.querySelector('textarea, [role="dialog"], [role="alertdialog"]')) {
      onBack();
    }
  });

  return (
    <section
      ref={sectionRef}
      aria-labelledby={headingId}
      className="absolute inset-0 z-40 flex flex-col overflow-y-auto bg-surface pb-[max(2rem,env(safe-area-inset-bottom))] font-sn-pro text-content-primary"
    >
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-2">
        <IconButton tooltip="bottom" label="Back" icon={<ArrowLeftIcon />} onClick={onBack} />
      </div>
      <div className="px-4 pt-4 pb-2">
        <StopNotesTitle id={headingId} count={marks.length} headingRef={headingRef} />
      </div>
      {marks.length > 0 ? (
        <StopNotesTimeline marks={marks} headingRef={headingRef} {...timeline} />
      ) : (
        <div className="flex flex-col items-start gap-4 px-4 pt-4">
          <div className="flex flex-col gap-1">
            <p className="text-base/6 font-semibold">All stops are deleted</p>
            <p className="text-sm/5 text-content-quaternary">
              Flag a stop while recording to write a note again.
            </p>
          </div>
          <Button variant="secondary" size="small" label="Go back" onClick={onBack} />
        </div>
      )}
    </section>
  );
}
