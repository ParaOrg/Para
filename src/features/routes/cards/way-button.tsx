import type { ComponentPropsWithoutRef } from 'react';

import { buttonClasses } from '@/design-system/primitives/button-look';
import { ArrowLeftRightIcon } from '@/shared/ui/route-icons';

type WayButtonProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'className' | 'style' | 'type'
> & {
  /** The way that is showing (wayWord): Papunta, Pabalik, or a train's bound. */
  way: string;
};

/**
 * PAPUNTA (Controller, 4679:23737 and 4683:32635): the Button's Special, its word the way that is
 * showing, in capitals, SN Pro Bold 17/24; a tap turns the trip, or every route listed, the other
 * way round. The capitals are the type's, so a screen reader hears the word as written, Papunta. On
 * the wide bar ⇆ stands before the word, and both are Brand/surface.
 */
export function WayButton({ way, ...rest }: WayButtonProps) {
  return (
    <button
      {...rest}
      type="button"
      className={
        buttonClasses({ variant: 'special' }) + ' uppercase sheet-floating:text-brand-surface'
      }
    >
      <span aria-hidden className="hidden size-5 *:size-full sheet-floating:flex">
        <ArrowLeftRightIcon />
      </span>
      {way}
    </button>
  );
}
