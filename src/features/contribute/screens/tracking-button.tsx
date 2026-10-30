import type { ComponentProps, ReactNode } from 'react';

import { BLOB_PLACE } from '@/features/routes/cards/livery-card';
import blobPrimary from '@/features/routes/cards/route-card-blob-primary.svg';
import { ReloadIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { FinishIcon, PauseIcon, PlayIcon } from './tracking-icons';

/**
 * Which bar. Lakad and Sakay are the mode button, named for the mode a tap
 * switches TO: Sakay (green) while the recording is on Lakad, Lakad (blue)
 * while it is on Sakay. Stop is the open recording's, found after a reload.
 */
export type TrackingVariant = 'start' | 'resume' | 'pause' | 'stop' | 'finish' | 'lakad' | 'sakay';

interface Look {
  text: string;
  /** What a screen reader says; it always contains the words on the bar. */
  name: string;
  surface: string;
  icon: 'play' | 'pause' | 'finish' | 'switch';
}

// Figma names these "card/green-(don't-add)" and "card/blue-(don't-add)": the owner does not
// want them added as route liveries, so the bars take Tailwind's 700 and 800 directly and there
// are no card-green or card-blue tokens.
const GREEN = 'bg-green-700 border-green-800';
const BLUE = 'bg-blue-700 border-blue-800';

// Red means End or stop, so it is no route livery either: the bars take the red tokens directly.
const RED = 'bg-card-red-surface border-card-red-border-primary';

// Pause and Resume wear the brand; Finish is the dark of the content colours.
const BRAND = 'bg-brand-surface border-brand-border';
const DARK = 'bg-content-secondary border-content-primary';

// Route/RouteCardPrimary, and its Selected press, under every bar whatever its colour.
const SHADOW = 'shadow-route-card-primary';
const SHADOW_SELECTED = 'shadow-route-card-primary-selected';

const LOOK = {
  start: { text: 'Start', name: 'Start recording', surface: GREEN, icon: 'play' },
  resume: { text: 'Resume', name: 'Resume', surface: BRAND, icon: 'play' },
  pause: { text: 'Pause', name: 'Pause', surface: BRAND, icon: 'pause' },
  stop: { text: 'Stop', name: 'Stop', surface: RED, icon: 'pause' },
  finish: { text: 'Finish', name: 'Finish', surface: DARK, icon: 'finish' },
  sakay: { text: 'Sakay', name: 'Switch to Sakay', surface: GREEN, icon: 'switch' },
  lakad: { text: 'Lakad', name: 'Switch to Lakad', surface: BLUE, icon: 'switch' },
} satisfies Record<TrackingVariant, Look>;

const ICON = {
  play: <PlayIcon />,
  pause: <PauseIcon />,
  finish: <FinishIcon />,
  switch: <ReloadIcon />,
} satisfies Record<Look['icon'], ReactNode>;

/** A bar alone fills the width; two side by side at the foot of a card round its outer corners. */
export type TrackingCorner = 'none' | 'bottom-left' | 'bottom-right';

const CORNER = {
  none: 'w-full',
  'bottom-left': 'flex-1 rounded-bl-4xl',
  'bottom-right': 'flex-1 rounded-br-4xl',
} satisfies Record<TrackingCorner, string>;

interface TrackingButtonProps extends Omit<
  ComponentProps<'button'>,
  'children' | 'className' | 'style' | 'aria-label' | 'dangerouslySetInnerHTML'
> {
  variant: TrackingVariant;
  corner?: TrackingCorner;
  /** Pressed in, its Selected shadow held. */
  isActive?: boolean;
}

/**
 * Figma's TrackingButtonPrimary: a bar in a RouteCard's colours, its
 * Route/RouteCardPrimary effect and gloss Blob, which press in under
 * RouteCardPrimarySelected. Start and Stop are full-width bars; on the
 * recording card two sit side by side (4482:24012), Pause or Resume on the
 * left and the mode button or Finish on the right.
 */
export function TrackingButton({
  variant,
  corner = 'none',
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
        'group relative isolate flex items-center justify-center gap-1.5 overflow-clip border-[0.6px] p-3.5 font-sn-pro text-lg/7 font-bold text-content-inverse focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-content-inverse',
        look.surface,
        CORNER[corner],
      )}
    >
      <img src={blobPrimary} alt="" aria-hidden className={BLOB_PLACE} />
      <span aria-hidden className="size-6 shrink-0 *:size-full">
        {ICON[look.icon]}
      </span>
      {look.text}
      <span
        aria-hidden
        className={cn('pointer-events-none absolute inset-0 rounded-[inherit]', shadow)}
      />
    </button>
  );
}
