// The small 24px icons on History's cards, drawn in currentColor like the tracking bars' icons. TODO: drawn here,
// not in Figma; swap in the owner's drawings once there are some.

const STROKE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

/** A clock: a recording waiting its turn to upload. */
export function ClockIcon() {
  return (
    <svg {...STROKE}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

/** A triangle with a mark: an upload that did not go through. */
export function AlertIcon() {
  return (
    <svg {...STROKE}>
      <path d="M12 4 21 19.5H3L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 16.75v.01" />
    </svg>
  );
}

/** Three dots: the card's other actions. */
export function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5.5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="18.5" cy="12" r="1.75" />
    </svg>
  );
}
