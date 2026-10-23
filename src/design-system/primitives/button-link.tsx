import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { ICON, SIZE, type CardFill } from './button';

type Props = Omit<
  ComponentPropsWithoutRef<'a'>,
  'children' | 'className' | 'style' | 'dangerouslySetInnerHTML'
> & {
  href: string;
  fill: CardFill;
  /** Figma's ✏️ Label: the link is its text; the icon decorates it. */
  label: string;
  /** Figma's 🎈 Last Icon slot: a square SVG drawing in currentColor. */
  lastIcon?: ReactNode;
};

// Button's PRIMARY_FILL for a link: the same classes without `enabled:`. Change the two together.
const FILL = {
  'card-red': 'bg-card-red-surface active:bg-card-red-timeline-surface',
  'card-orange': 'bg-card-orange-surface active:bg-card-orange-timeline-surface',
  'card-violet': 'bg-card-violet-surface active:bg-card-violet-timeline-surface',
  'card-rose': 'bg-card-rose-surface active:bg-card-rose-timeline-surface',
  'card-fuchsia': 'bg-card-fuchsia-surface active:bg-card-fuchsia-timeline-surface',
  'card-pink': 'bg-card-pink-surface active:bg-card-pink-timeline-surface',
  'map-rail-light-rail-way-one':
    'bg-map-rail-light-rail-way-one-surface active:bg-map-rail-light-rail-way-one-timeline-surface',
  'map-rail-light-rail-way-two':
    'bg-map-rail-light-rail-way-two-surface active:bg-map-rail-light-rail-way-two-timeline-surface',
  'map-rail-metro-rail-way-three':
    'bg-map-rail-metro-rail-way-three-surface active:bg-map-rail-metro-rail-way-three-timeline-surface',
  'map-ferry': 'bg-map-ferry-surface active:bg-map-ferry-timeline-surface',
} satisfies Record<CardFill, string>;

/**
 * Button's twin for a plain link: Primary Small in a card's colours (Figma's
 * instance, 4147:11947), but an `<a>` that goes to another page. A link has no
 * `enabled` state, so hover and press apply straight. Its words are the
 * card's own, inherited, white or dark as the card's are.
 */
export function ButtonLink({ fill, label, lastIcon, ...rest }: Props) {
  return (
    <a
      {...rest}
      className={
        'inline-flex items-center justify-center rounded-full font-sn-pro font-medium shadow-primary-button-rest ' +
        'hover:shadow-primary-button-hover active:shadow-primary-button-pressed ' +
        FILL[fill] +
        ' ' +
        SIZE.small
      }
    >
      {label}
      {lastIcon && (
        <span aria-hidden className={ICON.small + ' *:size-full'}>
          {lastIcon}
        </span>
      )}
    </a>
  );
}
