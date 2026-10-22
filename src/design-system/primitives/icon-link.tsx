import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { ICON, SHOWN, SIZE, TOOLTIP, type Size, type TooltipPosition } from './icon-button';
import { Tooltip } from './tooltip';

/**
 * IconButton's twin for a plain link: the same round Special pill holding one
 * icon, the same tooltip, state for state (see IconButton), but an `<a>` that
 * goes to another page. A link has no `enabled` state, so hover and press
 * apply straight.
 */

type Props = Omit<
  ComponentPropsWithoutRef<'a'>,
  | 'children'
  | 'className'
  | 'style'
  | 'dangerouslySetInnerHTML'
  | 'aria-label'
  | 'aria-labelledby'
  | 'title'
> & {
  href: string;
  size?: Size;
  /** A square SVG drawing in currentColor. */
  icon: ReactNode;
  /** What a screen reader says the link does, and what its tooltip reads. */
  label: string;
  /** Where the tooltip points from, as IconButton names it. */
  tooltip?: TooltipPosition;
};

const LOOK =
  'bg-surface-tertiary text-content-primary shadow-special-button-rest ' +
  'hover:shadow-special-button-hover active:bg-surface-quaternary active:shadow-special-button-pressed';

export function IconLink({ size = 'base', icon, label, tooltip = 'bottom', ...rest }: Props) {
  return (
    <span className="group/icon relative inline-flex size-fit shrink-0">
      <a
        {...rest}
        aria-label={label}
        className={
          'inline-flex shrink-0 items-center justify-center rounded-full ' + LOOK + ' ' + SIZE[size]
        }
      >
        <span aria-hidden className={ICON[size] + ' *:size-full'}>
          {icon}
        </span>
      </a>
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
