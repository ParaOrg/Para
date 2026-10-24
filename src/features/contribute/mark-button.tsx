import { useEffect, useState } from 'react';

interface MarkButtonProps {
  /** False once the ride holds the most marks: the button stays, disabled. */
  canMark: boolean;
  onMark: () => void;
}

/** How long "Marked" stays beside the button. */
const MARKED_MS = 1500;

/**
 * The round map button that marks the place the contributor is, just the mark:
 * no note, no label, no question afterwards. It looks as the locator's button
 * does (48 px Special, shadow-sm) and stands above it in the same column; a
 * tap says "Marked" beside it for a moment (a screen reader hears it from the
 * page's status line).
 */
export function MarkButton({ canMark, onMark }: MarkButtonProps) {
  const [markedTaps, setMarkedTaps] = useState(0);
  const isMarkedShown = markedTaps > 0;

  // Each tap restarts the moment, so "Marked" is on screen for MARKED_MS after the last one.
  useEffect(() => {
    if (markedTaps === 0) return;
    const timer = window.setTimeout(() => setMarkedTaps(0), MARKED_MS);
    return () => window.clearTimeout(timer);
  }, [markedTaps]);

  const handleClick = () => {
    // aria-disabled, not disabled: focus stays on the button on the tap that fills the ride.
    if (!canMark) return;
    onMark();
    setMarkedTaps((taps) => taps + 1);
  };

  return (
    <div className="relative rounded-full shadow-sm">
      {isMarkedShown && (
        // No Figma design for this note yet, so it keeps the locator note's look.
        <p
          data-testid="marked-note"
          className="pointer-events-none absolute top-1/2 right-full mr-2 -translate-y-1/2 rounded-lg bg-neutral-900/90 px-3 py-2 text-xs text-content-inverse shadow backdrop-blur"
        >
          Marked
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        aria-disabled={!canMark}
        aria-label="Mark this place"
        title={canMark ? 'Mark this place' : 'This ride has the most marks it can hold'}
        className={
          'group relative grid size-12 shrink-0 place-items-center rounded-full bg-surface-tertiary text-content-primary ' +
          'outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-brand-surface ' +
          'aria-disabled:opacity-60'
        }
      >
        <MapPinIcon />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full shadow-special-button-rest group-active:shadow-special-button-pressed"
        />
      </button>
    </div>
  );
}

// TODO: swap for the owner's Figma icon
function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-6">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2.25a7.25 7.25 0 0 0-7.25 7.25c0 4.9 5.2 10.4 6.6 11.8a.9.9 0 0 0 1.3 0c1.4-1.4 6.6-6.9 6.6-11.8A7.25 7.25 0 0 0 12 2.25Zm0 4.75a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"
      />
    </svg>
  );
}
