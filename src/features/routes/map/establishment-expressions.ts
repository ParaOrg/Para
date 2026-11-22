import type { ExpressionSpecification } from 'maplibre-gl';

import {
  ESTABLISHMENT_KINDS,
  type EstablishmentKind,
  type EstablishmentTier,
} from './establishment-kinds';

/*
 * The expressions the establishments' layers (establishments.ts) choose their places by: which
 * places are a tier's, and what each shows, from the tiles' `class` and `subclass`.
 */

const matches = (
  key: 'class' | 'subclass',
  values: readonly string[],
): boolean | ExpressionSpecification =>
  values.length > 0 ? ['match', ['get', key], [...values], true, false] : false;

/** Whether a place is one of the kinds, or one of a tier's when `tier` is given. */
export function isEstablishment(tier?: EstablishmentTier): ExpressionSpecification {
  const kinds = ESTABLISHMENT_KINDS.filter((kind) => tier === undefined || kind.tier === tier);
  return [
    'any',
    matches(
      'class',
      kinds.flatMap((kind) => kind.classes ?? []),
    ),
    matches(
      'subclass',
      kinds.flatMap((kind) => kind.subclasses ?? []),
    ),
  ];
}

/** A match on `key`, from each value list to its output, else `fallback`. */
function matchOn(
  key: 'class' | 'subclass',
  pairs: readonly (readonly [string[], string])[],
  fallback: string | ExpressionSpecification,
): string | ExpressionSpecification {
  const [first, ...rest] = pairs.filter(([values]) => values.length > 0);
  if (!first) return fallback;
  return ['match', ['get', key], first[0], first[1], ...rest.flat(), fallback];
}

/**
 * What each place shows, by its kind (`output`): its subclass's kind first, then its class's, else
 * `fallback`. The kinds never overlap (establishment-kinds.ts), so the order only saves a lookup.
 */
export function byKind(output: (kind: EstablishmentKind) => string, fallback: string) {
  const pairs = (key: 'classes' | 'subclasses') =>
    ESTABLISHMENT_KINDS.map((kind): [string[], string] => [[...(kind[key] ?? [])], output(kind)]);
  return matchOn('subclass', pairs('subclasses'), matchOn('class', pairs('classes'), fallback));
}
