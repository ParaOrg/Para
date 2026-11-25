/** What an IconButton looks like (icon-button.tsx): its voices, sizes and tooltip's places. */

export type Size = 'large' | 'base' | 'small';

/** Tooltip's Position: the side its arrow is on, so Bottom sits above the button. */
export type TooltipPosition = 'bottom' | 'top' | 'left' | 'right';

/** The voices the set draws: Brand only at Large (icon-button.tsx's props). */
export type Variant = 'special' | 'brand';

export const VARIANT = {
  special:
    'bg-surface-tertiary text-content-primary shadow-special-button-rest ' +
    'enabled:not-aria-disabled:hover:shadow-special-button-hover ' +
    'enabled:not-aria-disabled:active:bg-surface-quaternary ' +
    'enabled:not-aria-disabled:active:shadow-special-button-pressed',
  // Pressed keeps Brand/surface: the set darkens only the shadow.
  brand:
    'bg-brand-surface text-content-inverse shadow-primary-button-rest ' +
    'enabled:not-aria-disabled:hover:shadow-primary-button-hover ' +
    'enabled:not-aria-disabled:active:shadow-primary-button-pressed',
} satisfies Record<Variant, string>;

// Large is 48px round (10px around a 28px icon); Base 40px (8px around 24px);
// Small 32px (6px around 20px).
// The size is pinned as well as padded, so a parent that stretches its children
// cannot make the pill oval; the size-fit wrapper in icon-button.tsx does the same.
export const SIZE = {
  large: 'size-12 p-2.5',
  base: 'size-10 p-2',
  small: 'size-8 p-1.5',
} satisfies Record<Size, string>;

export const ICON = {
  large: 'size-7',
  base: 'size-6',
  small: 'size-5',
} satisfies Record<Size, string>;

// The bubble beside the button, its arrow's tip 4px off it (the arrow
// sticks out 7px, so 11px from the pill), and where it rises from: 4px
// nearer the button, settling away from it.
export const TOOLTIP = {
  bottom: 'bottom-full mb-2.75 left-1/2 -translate-x-1/2 translate-y-1',
  top: 'top-full mt-2.75 left-1/2 -translate-x-1/2 -translate-y-1',
  left: 'left-full ml-2.75 top-1/2 -translate-y-1/2 -translate-x-1',
  right: 'right-full mr-2.75 top-1/2 -translate-y-1/2 translate-x-1',
} satisfies Record<TooltipPosition, string>;

// Shown: settled, over the enter timing. Written out whole for Tailwind.
export const SHOWN = {
  bottom: 'group-hover/icon:translate-y-0',
  top: 'group-hover/icon:translate-y-0',
  left: 'group-hover/icon:translate-x-0',
  right: 'group-hover/icon:translate-x-0',
} satisfies Record<TooltipPosition, string>;
