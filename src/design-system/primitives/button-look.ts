/**
 * What a Button and a ButtonLink look like, in one place so the two cannot
 * drift: the same variants, sizes and card fills, state for state. States
 * are written with `usable:` (global.css), which a link always is and a
 * `<button>` is until it is disabled.
 */

export type Size = 'base' | 'small';

/**
 * Small exists only where the set draws it — the types keep code from
 * getting ahead of the design: Special, Secondary and Primary (Default, Hover,
 * Pressed and Disabled: 3742:1196, for the timeline's "Set as start",
 * 4147:11947); Primary Small is Primary's fills and shadows at Small's sizes.
 * `size="small"` on error is a compile error until it is designed.
 */
export type VariantAndSize =
  | { variant: 'special' | 'secondary'; size?: Size; fill?: never }
  | { variant: 'primary'; size?: Size; fill?: 'brand' }
  // A card's fill only as the design draws it, Primary Small and enabled
  // (4147:11947): its Base and its Disabled are compile errors until they are
  // designed.
  | { variant: 'primary'; size: 'small'; fill: CardFill; disabled?: never }
  | { variant: 'error'; size?: 'base'; fill?: never }
  // Plain (4451:14022): the words alone, as Sign in's "Forgot password". Only Base Default is drawn.
  | { variant: 'plain'; size?: 'base'; fill?: never };

const VARIANT = {
  special:
    'bg-surface-tertiary font-sn-pro font-bold text-content-primary shadow-special-button-rest ' +
    'usable:hover:shadow-special-button-hover ' +
    'usable:active:bg-surface-quaternary usable:active:shadow-special-button-pressed',
  secondary:
    'bg-surface-tertiary font-sn-pro font-medium text-content-primary shadow-special-button-rest ' +
    'usable:hover:shadow-special-button-hover ' +
    'usable:active:bg-surface-quaternary usable:active:shadow-special-button-pressed',
  // Primary's fill and words are its PRIMARY_FILL's.
  primary:
    'font-sn-pro font-medium shadow-primary-button-rest ' +
    'usable:hover:shadow-primary-button-hover usable:active:shadow-primary-button-pressed',
  error:
    'bg-error-surface font-sn-pro font-medium text-content-inverse shadow-primary-button-rest ' +
    'usable:hover:shadow-primary-button-hover ' +
    'usable:active:bg-error-surface-secondary usable:active:shadow-primary-button-pressed',
  // No fill and no shadow; the set draws no Hover or Pressed for it yet.
  plain: 'bg-transparent font-sn-pro font-medium text-content-primary',
} satisfies Record<VariantAndSize['variant'], string>;

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
  brand: 'bg-brand-surface text-content-inverse usable:active:bg-brand-surface-secondary',
  'card-red': 'bg-card-red-surface usable:active:bg-card-red-timeline-surface',
  'card-orange': 'bg-card-orange-surface usable:active:bg-card-orange-timeline-surface',
  'card-violet': 'bg-card-violet-surface usable:active:bg-card-violet-timeline-surface',
  'card-rose': 'bg-card-rose-surface usable:active:bg-card-rose-timeline-surface',
  'card-fuchsia': 'bg-card-fuchsia-surface usable:active:bg-card-fuchsia-timeline-surface',
  'card-pink': 'bg-card-pink-surface usable:active:bg-card-pink-timeline-surface',
  'map-rail-light-rail-way-one':
    'bg-map-rail-light-rail-way-one-surface usable:active:bg-map-rail-light-rail-way-one-timeline-surface',
  'map-rail-light-rail-way-two':
    'bg-map-rail-light-rail-way-two-surface usable:active:bg-map-rail-light-rail-way-two-timeline-surface',
  'map-rail-metro-rail-way-three':
    'bg-map-rail-metro-rail-way-three-surface usable:active:bg-map-rail-metro-rail-way-three-timeline-surface',
  'map-ferry': 'bg-map-ferry-surface usable:active:bg-map-ferry-timeline-surface',
} satisfies Record<string, string>;

// The weight is each voice's own (VARIANT): Special's Small is bold; Secondary's and Primary's, medium.
const SIZE = {
  base: 'gap-1 px-4 py-2 text-base/6',
  small: 'gap-1 px-3 py-1.5 text-sm/5',
} satisfies Record<Size, string>;

export const ICON = {
  base: 'size-5',
  small: 'size-4',
} satisfies Record<Size, string>;

/** The classes of a Button or ButtonLink for these props. */
export function buttonClasses({
  variant,
  size = 'base',
  fill = 'brand',
}: {
  variant: VariantAndSize['variant'];
  size?: Size;
  fill?: PrimaryFill;
}): string {
  return (
    'inline-flex items-center justify-center rounded-full disabled:opacity-60 ' +
    VARIANT[variant] +
    ' ' +
    (variant === 'primary' ? PRIMARY_FILL[fill] + ' ' : '') +
    SIZE[size]
  );
}
