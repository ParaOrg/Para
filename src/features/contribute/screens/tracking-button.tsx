import type { ComponentPropsWithoutRef } from 'react';

import { BLOB_PLACE, CARD_SURFACE } from '@/features/routes/cards/livery-card';
import blobPrimary from '@/features/routes/cards/route-card-blob-primary.svg';
import { cn } from '@/shared/utils/cn';

import { PauseIcon, PlayIcon } from './tracking-icons';

/**
 * Which bar. Lakad and Sakay are the mode button, named for the mode a tap
 * switches TO: Sakay (green) while the recording is on Lakad, Lakad (blue)
 * while it is on Sakay.
 */
export type TrackingVariant = 'start' | 'resume' | 'stop' | 'save' | 'cancel' | 'lakad' | 'sakay';

interface Look {
  text: string;
  /** What a screen reader says; it always contains the words on the bar. */
  name: string;
  surface: string;
  icon: 'play' | 'pause' | null;
  /** A full-width bar, or one of the row's buttons. */
  size: 'bar' | 'row';
  /** In the row, the mode button and Save share the width and Cancel shrinks to its text. */
  width: 'w-full' | 'flex-1' | 'shrink-0';
}

// Figma names this green "card/green-(don't-add)": the owner does not want green
// added as a route livery, so the bars take Tailwind's green-700 and green-800
// directly and there is no card-green token.
const GREEN = 'bg-green-700 border-green-800';

// Red means End or stop, so it is no route livery either: the bars take the red tokens directly.
const RED = 'bg-card-red-surface border-card-red-border-primary';

// Route/RouteCardPrimary, and its Selected press, under every bar whatever its colour.
const SHADOW = 'shadow-route-card-primary';
const SHADOW_SELECTED = 'shadow-route-card-primary-selected';

const LOOK = {
  start: {
    text: 'Start',
    name: 'Start recording',
    surface: GREEN,
    icon: 'play',
    size: 'bar',
    width: 'w-full',
  },
  resume: {
    text: 'Resume',
    name: 'Resume',
    surface: GREEN,
    icon: 'play',
    size: 'bar',
    width: 'w-full',
  },
  stop: {
    text: 'Stop',
    name: 'Stop',
    surface: RED,
    icon: 'pause',
    size: 'bar',
    width: 'w-full',
  },
  save: {
    text: 'Save',
    name: 'Save',
    surface: CARD_SURFACE.violet,
    icon: null,
    size: 'row',
    width: 'flex-1',
  },
  cancel: {
    text: 'Cancel',
    name: 'Cancel',
    surface: RED,
    icon: null,
    size: 'row',
    width: 'shrink-0',
  },
  sakay: {
    text: 'Sakay',
    name: 'Switch to Sakay',
    surface: GREEN,
    icon: null,
    size: 'row',
    width: 'flex-1',
  },
  lakad: {
    text: 'Lakad',
    name: 'Switch to Lakad',
    surface: 'bg-brand-surface border-brand-border',
    icon: null,
    size: 'row',
    width: 'flex-1',
  },
} satisfies Record<TrackingVariant, Look>;

const SIZE = {
  bar: 'gap-1.5 p-3.5',
  row: 'px-3.5 py-3',
} satisfies Record<Look['size'], string>;

interface TrackingButtonProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'className' | 'style' | 'aria-label' | 'dangerouslySetInnerHTML'
> {
  variant: TrackingVariant;
  /** Pressed in, as Figma draws the Stop bar while the ride is being recorded. */
  isActive?: boolean;
}

/**
 * Figma's TrackingButtonPrimary: a square bar in a RouteCard's colours, its
 * Route/RouteCardPrimary effect and gloss Blob, which press in under
 * RouteCardPrimarySelected. Start, Resume and Stop are full-width bars; Save,
 * Cancel and the mode button sit in a row under them.
 */
export function TrackingButton({
  variant,
  isActive = false,
  type = 'button',
  ...rest
}: TrackingButtonProps) {
  const look = LOOK[variant];
  const shadow = isActive
    ? SHADOW_SELECTED
    : cn(SHADOW, 'group-active:shadow-route-card-primary-selected');
  return (
    <button
      {...rest}
      type={type}
      aria-label={look.name}
      className={cn(
        // A white ring inside the bar: the browser's own is nearly invisible on green and red.
        'group relative isolate flex items-center justify-center overflow-clip border-[0.6px] font-sn-pro text-lg/7 font-bold text-content-inverse focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-content-inverse',
        look.surface,
        look.width,
        SIZE[look.size],
      )}
    >
      <img src={blobPrimary} alt="" aria-hidden className={BLOB_PLACE} />
      {look.icon && (
        <span aria-hidden className="size-6 shrink-0 *:size-full">
          {look.icon === 'play' ? <PlayIcon /> : <PauseIcon />}
        </span>
      )}
      {look.text}
      <span aria-hidden className={cn('pointer-events-none absolute inset-0', shadow)} />
    </button>
  );
}
