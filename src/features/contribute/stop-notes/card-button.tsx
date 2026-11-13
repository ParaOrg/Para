import type { ReactNode } from 'react';

import { BLOB_PLACE } from '@/features/routes/cards/livery-card';
import blobPrimary from '@/features/routes/cards/route-card-blob-primary.svg';
import { cn } from '@/shared/utils/cn';

/** Which of the bars: the plain one on the white surface, Save's green, or Delete's red. */
export type CardButtonLook = 'plain' | 'save' | 'delete';

/** The card corner a bar rounds: one of two side by side, or the whole foot alone. */
export type CardButtonCorner = 'left' | 'right' | 'both';

// Figma's TrackingButtonPrimary in the cards' own colours (4709:10949, 4725:29179).
const LOOK = {
  plain: 'border-border-secondary bg-surface text-content-primary',
  save: 'border-save-border bg-save-surface text-content-inverse',
  delete: 'border-delete-border bg-delete-surface text-content-inverse',
} satisfies Record<CardButtonLook, string>;

const CORNER = {
  left: 'rounded-bl-4xl',
  right: 'rounded-br-4xl',
  both: 'rounded-b-4xl',
} satisfies Record<CardButtonCorner, string>;

interface CardButtonProps {
  icon: ReactNode;
  label: string;
  look: CardButtonLook;
  corner: CardButtonCorner;
  type?: 'button' | 'submit';
  onClick?: () => void;
}

/**
 * A bar at the foot of a stop's card, the note's or the map's: its icon and words, the gloss Blob
 * and the RouteCardPrimary press, as the recording card's bars have them (tracking-button.tsx).
 */
export function CardButton({
  icon,
  label,
  look,
  corner,
  type = 'button',
  onClick,
}: CardButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        'group relative isolate flex flex-1 items-center justify-center gap-1.5 overflow-clip border-0-6 px-3 py-2.5 font-sn-pro text-base-lower/6 font-semibold outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-brand-surface',
        LOOK[look],
        CORNER[corner],
      )}
    >
      <img src={blobPrimary} alt="" aria-hidden className={BLOB_PLACE} />
      <span aria-hidden className="size-5 shrink-0 *:size-full">
        {icon}
      </span>
      {label}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-route-card-primary group-active:shadow-route-card-primary-selected"
      />
    </button>
  );
}
