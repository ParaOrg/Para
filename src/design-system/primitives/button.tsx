import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/**
 * PalimosPoDesignSystem's Button, from the Figma set (node 3668:2812): a pill
 * in four voices. Special is the jeepney one — SN Pro Bold on the quiet
 * surface with an edge and a soft shadow (the set uses Cubao Free, all
 * capitals; SN Pro here, so a word reads as written, as in "Papunta at
 * Pabalik"); Secondary is Special's surface and shadows in SN Pro Medium, the
 * quiet one of a pair (the install prompt's "I'll do it later", 3732:2512);
 * Primary speaks brand blue (or, on a card, the card's colours: its `fill`)
 * and Error the destructive red, both in SN Pro Medium.
 * Each state wears the set's effect style of the same name (tokens.css):
 * Rest, Hover, Pressed (which also darkens the fill, and Special loses its
 * edge). Error borrows Primary's shadows, as the set does. Hover and press are `enabled:` only,
 * so a disabled button keeps its Rest look at the design's opacity/60.
 * Tailwind puts hover behind `(hover: hover)`, so phones never stick on it.
 * No focus state is designed yet, so the browser's own focus ring stands
 * until the owner draws one.
 */

type Size = 'base' | 'small';

/**
 * Small exists only where the set draws it — the types keep code from
 * getting ahead of the design: Special, Secondary and Primary (Default, Hover,
 * Pressed and Disabled: 3742:1196, for the timeline's "Set as start",
 * 4147:11947); Primary Small is Primary's fills and shadows at Small's sizes.
 * `size="small"` on error is a compile error until it is designed.
 */
type VariantAndSize =
  | { variant: 'special' | 'secondary'; size?: Size; fill?: never }
  | { variant: 'primary'; size?: Size; fill?: 'brand' }
  // A card's fill only as the design draws it, Primary Small and enabled
  // (4147:11947): its Base and its Disabled are compile errors until they are
  // designed.
  | { variant: 'primary'; size: 'small'; fill: CardFill; disabled?: never }
  | { variant: 'error'; size?: 'base'; fill?: never };

type Props = Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'className' | 'style' | 'dangerouslySetInnerHTML'
> &
  VariantAndSize & {
    /** Figma's ✏️ Label: the button is its text; icons decorate it. */
    label: string;
    /** Figma's 🎈 First/Last Icon slots: a square SVG drawing in currentColor. */
    firstIcon?: ReactNode;
    lastIcon?: ReactNode;
  };

const VARIANT = {
  special:
    'bg-surface-tertiary font-sn-pro font-bold text-content-primary shadow-special-button-rest ' +
    'enabled:hover:shadow-special-button-hover ' +
    'enabled:active:bg-surface-quaternary enabled:active:shadow-special-button-pressed',
  secondary:
    'bg-surface-tertiary font-sn-pro font-medium text-content-primary shadow-special-button-rest ' +
    'enabled:hover:shadow-special-button-hover ' +
    'enabled:active:bg-surface-quaternary enabled:active:shadow-special-button-pressed',
  // Primary's fill and words are its PRIMARY_FILL's.
  primary:
    'font-sn-pro font-medium shadow-primary-button-rest ' +
    'enabled:hover:shadow-primary-button-hover enabled:active:shadow-primary-button-pressed',
  error:
    'bg-error-surface font-sn-pro font-medium text-content-inverse shadow-primary-button-rest ' +
    'enabled:hover:shadow-primary-button-hover ' +
    'enabled:active:bg-error-surface-secondary enabled:active:shadow-primary-button-pressed',
} satisfies Record<Props['variant'], string>;

/**
 * Primary's fill: brand blue, or the card it sits on (for the timeline's Set
 * as start, which sits on top of its card: the Figma instance, 4147:11947,
 * overrides the fill to Card/red/surface). On a card it is the card's
 * surface, pressed down to the card's Timeline/surface as a pressed row of it
 * is, a train's line's own Map/Rail/<line>/… on its card. A card's fill sets
 * no words: they are the card's own, inherited (white, and dark on MRT-3's
 * yellow), so they read as the card's do.
 */
type PrimaryFill = keyof typeof PRIMARY_FILL;

/** The cards' fills: every PRIMARY_FILL but brand blue. */
export type CardFill = Exclude<PrimaryFill, 'brand'>;

const PRIMARY_FILL = {
  brand: 'bg-brand-surface text-content-inverse enabled:active:bg-brand-surface-secondary',
  'card-red': 'bg-card-red-surface enabled:active:bg-card-red-timeline-surface',
  'card-orange': 'bg-card-orange-surface enabled:active:bg-card-orange-timeline-surface',
  'card-violet': 'bg-card-violet-surface enabled:active:bg-card-violet-timeline-surface',
  'card-rose': 'bg-card-rose-surface enabled:active:bg-card-rose-timeline-surface',
  'card-fuchsia': 'bg-card-fuchsia-surface enabled:active:bg-card-fuchsia-timeline-surface',
  'card-pink': 'bg-card-pink-surface enabled:active:bg-card-pink-timeline-surface',
  'map-rail-light-rail-way-one':
    'bg-map-rail-light-rail-way-one-surface enabled:active:bg-map-rail-light-rail-way-one-timeline-surface',
  'map-rail-light-rail-way-two':
    'bg-map-rail-light-rail-way-two-surface enabled:active:bg-map-rail-light-rail-way-two-timeline-surface',
  'map-rail-metro-rail-way-three':
    'bg-map-rail-metro-rail-way-three-surface enabled:active:bg-map-rail-metro-rail-way-three-timeline-surface',
} satisfies Record<string, string>;

// The weight is each voice's own (VARIANT): Special's Small is bold; Secondary's and Primary's, medium.
const SIZE = {
  base: 'gap-1 px-4 py-2 text-base/6',
  small: 'gap-1 px-3 py-1.5 text-sm/5',
} satisfies Record<Size, string>;

const ICON = {
  base: 'size-5',
  small: 'size-4',
} satisfies Record<Size, string>;

export function Button({
  variant,
  size = 'base',
  fill = 'brand',
  label,
  firstIcon,
  lastIcon,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      type={type}
      className={
        'inline-flex items-center justify-center rounded-full disabled:opacity-60 ' +
        VARIANT[variant] +
        ' ' +
        (variant === 'primary' ? PRIMARY_FILL[fill] + ' ' : '') +
        SIZE[size]
      }
    >
      {/* The label is the accessible name; icons only decorate it. */}
      {firstIcon && (
        <span aria-hidden className={ICON[size] + ' *:size-full'}>
          {firstIcon}
        </span>
      )}
      {label}
      {lastIcon && (
        <span aria-hidden className={ICON[size] + ' *:size-full'}>
          {lastIcon}
        </span>
      )}
    </button>
  );
}
