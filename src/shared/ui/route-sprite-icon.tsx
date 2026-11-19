/** The one way route-icons.tsx draws from route-icons.svg: the symbol by id, in its own box. */

import routeSprite from './route-icons.svg?url&no-inline';

/** Each drawing in route-icons.svg, by its symbol's id, with the symbol's own box. */
const ROUTE_SPRITE_VIEW_BOX = {
  jeep: '0 0 24 24',
  close: '0 0 24 24',
  'chevron-left': '0 0 24 24',
  'chevron-left-large': '0 0 24 24',
  'chevron-down': '0 0 20 20',
  reload: '0 0 16 16',
  terminal: '0 0 20 20',
  hintuan: '0 0 20 20',
  information: '0 0 24 24',
  start: '0 0 24 24',
  end: '0 0 24 24',
  'close-large': '0 0 28 28',
  'arrow-left-right-large': '0 0 28 28',
  'filter-large': '0 0 28 28',
  'arrow-up-down': '0 0 20 20',
  'circle-arrow-right': '0 0 24 24',
  hourglass: '0 0 24 24',
} as const;

type RouteSpriteId = keyof typeof ROUTE_SPRITE_VIEW_BOX;

interface RouteSpriteIconProps {
  /** The drawing's id in route-icons.svg. */
  id: RouteSpriteId;
}

/** A drawing from route-icons.svg, in currentColor, filling the icon's size. */
export function RouteSpriteIcon({ id }: RouteSpriteIconProps) {
  return (
    <svg viewBox={ROUTE_SPRITE_VIEW_BOX[id]} fill="currentColor" aria-hidden>
      <use href={`${routeSprite}#${id}`} />
    </svg>
  );
}
