import type { ComponentProps, ReactNode } from 'react';

import {
  ICON,
  SHOWN,
  SIZE,
  TOOLTIP,
  VARIANT,
  type Size,
  type TooltipPosition,
} from './icon-button-look';
import { Indicator } from './indicator';
import { Tooltip } from './tooltip';

export type { Size, TooltipPosition };

// No `title` either: the Tooltip replaces the browser's, and both
// at once would show two bubbles, perhaps saying different things.
type Props = Omit<
  ComponentProps<'button'>,
  | 'children'
  | 'className'
  | 'style'
  | 'dangerouslySetInnerHTML'
  | 'aria-label'
  | 'aria-labelledby'
  | 'title'
> &
  // Only the pairs the set draws: Brand comes at Large alone, Plain at Small (the studio's ⋮).
  (
    | { variant?: 'special'; size?: Size }
    | { variant: 'brand'; size: 'large' }
    | { variant: 'plain'; size: 'small' }
  ) & {
    /** Figma's 🙏 Icon Instance: a square SVG drawing in currentColor. */
    icon: ReactNode;
    /**
     * Not in the Figma set: with no words on it, this is what a screen reader
     * says the button does, and what its tooltip reads.
     */
    label: string;
    /**
     * Where the tooltip points from, as the Tooltip set names it. The screen
     * picks: a control at the bottom of the map wants the bubble above it,
     * Bottom; one along a card's top edge wants it below, Top.
     */
    tooltip?: TooltipPosition;
    /**
     * The Indicator on its top right corner (4885:42134), 4 out from the pill: how many of
     * something are on, as the filter's modes picked. None, zero or less shows nothing; the circle
     * holds two digits at most. The badge is for the eyes: the label says the same to a screen
     * reader. A disabled button dims it with the pill.
     */
    count?: number;
  };

/**
 * PalimosPoDesignSystem's IconButton, from the Figma set (node 3668:2815):
 * Button's Special voice with the words taken out — a round pill holding one
 * icon, on the same surfaces and the same InnerShadow/SpecialButton… effect
 * styles, state for state (see Button). Brand is Button's Primary the same way:
 * Brand/surface under the PrimaryButton/… effect styles. aria-disabled looks
 * disabled too, for a button that must keep its focus while it can do nothing.
 * Plain is the icon alone, with no surface or shadow, at Small: the route line detail's ⋮.
 *
 * With no words on it, its label shows as the Tooltip on hover — every
 * IconButton, so none can forget it, a disabled one too (it still says what
 * the button is). The Tooltip shows on hover only, never on phones
 * (Tailwind's hover waits for a pointer that can hover), after
 * delay/tooltip; it arrives over duration/base with ease/enter, rising 4px
 * off the button, and leaves over duration/quick with ease/exit.
 */
export function IconButton({
  variant = 'special',
  size = 'base',
  icon,
  label,
  tooltip = 'bottom',
  count = 0,
  type = 'button',
  ...rest
}: Props) {
  return (
    // size-fit: a stretching parent widens nothing, so the bubble stays
    // centred on the button.
    <span className="group/icon relative inline-flex size-fit shrink-0">
      <button
        {...rest}
        type={type}
        aria-label={label}
        className={
          'inline-flex shrink-0 items-center justify-center rounded-full disabled:opacity-60 aria-disabled:opacity-60 ' +
          VARIANT[variant] +
          ' ' +
          SIZE[size]
        }
      >
        <span aria-hidden className={ICON[size] + ' *:size-full'}>
          {icon}
        </span>
      </button>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex group-has-disabled/icon:opacity-60 group-has-aria-disabled/icon:opacity-60">
          <Indicator count={count} />
        </span>
      )}
      {/* The label again, for eyes: the button already says it to a screen reader. */}
      <span
        aria-hidden
        className={
          'pointer-events-none absolute z-20 opacity-0 transition-[opacity,translate] duration-quick ease-exit ' +
          'group-hover/icon:opacity-100 group-hover/icon:delay-tooltip group-hover/icon:duration-base group-hover/icon:ease-enter ' +
          TOOLTIP[tooltip] +
          ' ' +
          SHOWN[tooltip]
        }
      >
        <Tooltip position={tooltip} label={label} />
      </span>
    </span>
  );
}
