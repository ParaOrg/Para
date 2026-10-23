import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/**
 * Button's Special voice (Figma's set, 3668:2812) as an `<a>` that goes to
 * another page, Base size: the pill that IconLink draws round, here with its
 * word beside the icon. A link has no `enabled` state, so hover and press
 * apply straight.
 */

type Props = Omit<
  ComponentPropsWithoutRef<'a'>,
  'children' | 'className' | 'style' | 'dangerouslySetInnerHTML'
> & {
  href: string;
  /** Figma's ✏️ Label: the link is its text; the icon decorates it. */
  label: string;
  /** Figma's 🎈 First Icon slot: a square SVG drawing in currentColor. */
  firstIcon?: ReactNode;
};

const LOOK =
  'bg-surface-tertiary text-content-primary shadow-special-button-rest ' +
  'hover:shadow-special-button-hover active:bg-surface-quaternary active:shadow-special-button-pressed';

export function SpecialButtonLink({ label, firstIcon, ...rest }: Props) {
  return (
    <a
      {...rest}
      className={
        'inline-flex items-center justify-center gap-1 rounded-full px-4 py-2 font-sn-pro text-base/6 font-bold whitespace-nowrap ' +
        LOOK
      }
    >
      {firstIcon && (
        <span aria-hidden className="size-5 *:size-full">
          {firstIcon}
        </span>
      )}
      {label}
    </a>
  );
}
