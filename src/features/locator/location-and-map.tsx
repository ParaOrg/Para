import type { ReactNode } from 'react';

interface LocationAndMapProps {
  /** The map-style button over the LocatorButton, each with its own corners. */
  children: ReactNode;
}

/**
 * LocationAndMap (Figma 4245:1966): the map-style button and the
 * LocatorButton as one 48 × 96 pill, under shadow-sm. Each half keeps its own
 * Special look and its own press.
 */
export function LocationAndMap({ children }: LocationAndMapProps) {
  return <div className="flex flex-col rounded-full shadow-sm">{children}</div>;
}
