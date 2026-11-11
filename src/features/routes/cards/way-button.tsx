import { useId, type ComponentPropsWithoutRef } from 'react';

import { buttonClasses } from '@/design-system/primitives/button-look';
import { ArrowLeftRightIcon } from '@/shared/ui/route-icons';

// No name of its own either: its name is its word.
interface WayButtonProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  | 'children'
  | 'className'
  | 'style'
  | 'type'
  | 'dangerouslySetInnerHTML'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
> {
  /** The way that is showing (wayWord): Papunta, Pabalik, or a train's bound. */
  way: string;
  /** Where a tap leads (switchWord), spoken after the name as "turns to Pabalik". */
  wayTo: string;
}

/**
 * PAPUNTA (Controller, 4679:23737 and 4683:32635): the Button's Special, its word the way that is
 * showing, in capitals, SN Pro Bold 17/24; a tap turns the trip, or every route listed, the other
 * way round. The capitals are the type's, so a screen reader hears the word as written, Papunta. On
 * the wide bar ⇆ stands before the word, and both are Brand/surface. A screen reader hears where a
 * tap leads after its name, as the ⇅ on a trip's ends card is named.
 */
export function WayButton({ way, wayTo, ...rest }: WayButtonProps) {
  const hintId = useId();
  // The hint stands beside the button, not in it, where it would join the button's name.
  return (
    <>
      <button
        {...rest}
        type="button"
        aria-describedby={hintId}
        className={
          buttonClasses({ variant: 'special' }) + ' uppercase sheet-floating:text-brand-surface'
        }
      >
        <span aria-hidden className="hidden size-5 *:size-full sheet-floating:flex">
          <ArrowLeftRightIcon />
        </span>
        {way}
      </button>
      <span id={hintId} className="sr-only">
        turns to {wayTo}
      </span>
    </>
  );
}
