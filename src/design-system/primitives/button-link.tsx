import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { ICON, buttonClasses, type VariantAndSize } from './button-look';

interface ButtonLinkBase extends Omit<
  ComponentPropsWithoutRef<'a'>,
  'children' | 'className' | 'style' | 'dangerouslySetInnerHTML'
> {
  href: string;
  /** Figma's ✏️ Label: the link is its text; icons decorate it. */
  label: string;
  /** Figma's 🎈 First/Last Icon slots: a square SVG drawing in currentColor. */
  firstIcon?: ReactNode;
  lastIcon?: ReactNode;
}

type ButtonLinkProps = ButtonLinkBase & VariantAndSize;

/**
 * Button as an `<a>` that goes to another page: the same variants, sizes and
 * card fills, drawn from the same classes (button-look.ts). A link is never
 * disabled, so its hover and press always apply.
 */
export function ButtonLink({
  variant,
  size = 'base',
  fill = 'brand',
  label,
  firstIcon,
  lastIcon,
  ...rest
}: ButtonLinkProps) {
  return (
    <a {...rest} className={buttonClasses({ variant, size, fill })}>
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
    </a>
  );
}
