import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { ICON, buttonClasses, type VariantAndSize } from './button-look';

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
    <button {...rest} type={type} className={buttonClasses({ variant, size, fill })}>
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
