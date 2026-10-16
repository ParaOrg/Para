import { useEffect, useState } from 'react';

import { slide } from '@/shared/ui/sheet-gesture';

import { LocatorButton } from './locator-button';
import type { Locator as State } from './use-locator';

interface Props {
  locator: State;
  /** A card is open: the button sits on its sheet rather than at the map's foot. */
  docked: boolean;
}

/** What each look says it will do, for a screen reader. */
const LABEL = {
  LocationOff: 'Turn on my location',
  TrackOwnLocation: 'Show where I am',
  TrackedLocation: 'Turn the map the way I face',
  TracksTheMapBasedOnCompassFacing: 'Put north up',
} as const;

/** What the note says for the locator's state, or null for none. */
function noteFor(status: State['status'], noFix: boolean): string | null {
  if (status === 'denied')
    return 'Location is off for this site. Allow it in your browser settings, then try again.';
  if (status === 'unavailable') return 'This browser cannot give a location.';
  if (noFix) return 'No fix yet. Try again outdoors, or check that location is on.';
  return null;
}

/**
 * The LocatorButton placed as ScreenLocationBehavior draws it (Figma
 * 3870:5941): at the map's right edge, 12 above the card's sheet, following
 * it down from Middle to Low; up past Middle it stays where Middle left it,
 * and the sheet covers it. With no card open it sits at the map's foot; where
 * the card floats in the corner (`@float:`), at the bottom right, clear of
 * the credit line.
 * BottomSheet says where its top is as `--dock-y` on the page; this layer
 * slides the same way, by the same length.
 *
 * Denied or unavailable: a short note above it, and the button stays as it
 * was, to try again once the browser's setting is changed.
 */
export function Locator({ locator, docked }: Props) {
  const { status, noFix, mode, heading, compass, tap } = locator;
  const [note, setNote] = useState(() => noteFor(status, noFix));
  // Each change of the state says its note afresh, even one the timer below has hidden.
  const [noted, setNoted] = useState({ status, noFix });
  if (noted.status !== status || noted.noFix !== noFix) {
    setNoted({ status, noFix });
    setNote(noteFor(status, noFix));
  }
  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(null), 5000);
    return () => window.clearTimeout(t);
  }, [note]);

  // Never above Middle's top; the map's foot, short of a phone's home bar, with no card.
  const y = docked
    ? `max(var(--dock-y, 100%), ${slide('middle')})`
    : 'calc(100% - env(safe-area-inset-bottom))';
  return (
    <div
      data-testid="locator-dock"
      className={
        'pointer-events-none absolute inset-0 z-[5] ' +
        'transition-[translate] duration-sheet ease-enter in-data-dock-dragging:transition-none motion-reduce:transition-none ' +
        '@float:translate-none!'
      }
      style={{ translate: `0 ${y}` }}
    >
      <div className="pointer-events-auto absolute right-[calc(0.75rem+env(safe-area-inset-right))] bottom-full mb-3 flex flex-col items-end gap-1 @float:right-3 @float:bottom-10 @float:mb-0">
        {/* No Figma design for the note yet, so it uses the raw palette. */}
        {note && (
          <p
            role="status"
            data-testid="where-note"
            className="max-w-[14rem] rounded-lg bg-neutral-900/90 px-3 py-2 text-right text-xs text-content-inverse shadow backdrop-blur"
          >
            {note}
          </p>
        )}
        <LocatorButton
          mode={mode}
          // TrackedLocation keeps north up, so the phone's heading is the arrow's on the screen too.
          heading={mode === 'TrackedLocation' ? heading : null}
          onClick={tap}
          aria-label={mode === 'TrackedLocation' && !compass ? LABEL.TrackOwnLocation : LABEL[mode]}
          data-testid="where"
          data-state={status}
        />
      </div>
    </div>
  );
}
