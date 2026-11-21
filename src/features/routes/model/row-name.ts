import { directionEnds, isLoop, type Direction } from './routes';

/** A card's row in two parts: the place it goes to, and its route's via, or null with none. */
export interface RowParts {
  to: string;
  via: string | null;
}

/** Where a direction goes and its route's via, apart. A loop's name already holds its via. */
export function directionRowParts(v: Direction): RowParts {
  const via = v.route?.via?.trim();
  return { to: directionEnds(v).to, via: via && !isLoop(v) ? via : null };
}

/** A row's words, `SM Fairview via Maligaya`, so two routes to the same place read apart. */
export const rowName = ({ to, via }: RowParts): string => (via ? `${to} via ${via}` : to);

/** A direction as a card's row says it: its rowName. */
export const directionRowName = (v: Direction): string => rowName(directionRowParts(v));
