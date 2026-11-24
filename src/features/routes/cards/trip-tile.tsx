import type { ReactNode } from 'react';

import { FIGURE, NAME, TILE } from './trip-tile-look';

interface TileProps {
  name: string;
  children: ReactNode;
}

/** One tile (4821:38784): its figure, SemiBold 18/26, over its name, Regular 12/16. */
export function Tile({ name, children }: TileProps) {
  return (
    <div className={TILE}>
      <span className={FIGURE}>{children}</span>
      <span className={NAME}>{name}</span>
    </div>
  );
}
