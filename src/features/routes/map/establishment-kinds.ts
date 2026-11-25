import { ESTABLISHMENT_COLOURS } from '@/design-system/foundation/establishment-colours';

import { ESTABLISHMENT_IMAGE_PREFIX } from './establishment-loader';

/*
 * The establishments the map draws from the basemap's own places (OpenMapTiles' `poi` layer, in
 * every design's tiles): which places, in which family, with which glyph, from which zoom. The
 * pattern is Apple Maps' (the owner's baseline, 2026-11-22): a round marker in the family's colour
 * with a white glyph, the marker alone first and its name beside it one zoom closer, the big
 * places before the small shops, and collisions thinning the rest. The look is a placeholder
 * until the owner's Figma: the colours are tokens (Map/Establishment/…), the glyphs Maki's and
 * Temaki's (establishment-icons/, both CC0). Like the layers (establishments.ts), this is in the
 * establishments' own chunk, fetched once a design shows them: none of it is in the page's opening code.
 *
 * Pawnshops, remittance and bayad centers are not in the basemap's tiles (OpenMapTiles has no
 * class for them): they come with Para's own establishments file.
 */

export type EstablishmentFamily =
  'food' | 'shopping' | 'money' | 'health' | 'education' | 'transport' | 'services' | 'safety';

/** The glyph's file name, without `.svg`, in establishment-icons/maki/ or, for the ATM and the remittance centre, temaki/. */
export type EstablishmentGlyph =
  | 'restaurant'
  | 'fast-food'
  | 'cafe'
  | 'shop'
  | 'grocery'
  | 'convenience'
  | 'atm'
  | 'bank'
  | 'pharmacy'
  | 'hospital'
  | 'doctor'
  | 'dentist'
  | 'college'
  | 'school'
  | 'fuel'
  | 'laundry'
  | 'lodging'
  | 'toilet'
  | 'police'
  | 'jewelry-store'
  | 'money-hand';

/** 1: the big places a commuter gives directions by; 2: the everyday errands; 3: the rest. */
export type EstablishmentTier = 1 | 2 | 3;

export interface EstablishmentKind {
  glyph: EstablishmentGlyph;
  family: EstablishmentFamily;
  tier: EstablishmentTier;
  /** The tiles' `class` values that are this kind; a kind has these or `subclasses`, never both. */
  classes?: readonly string[];
  /** The tiles' `subclass` values (the OSM tag's own value) that are this kind. */
  subclasses?: readonly string[];
}

/**
 * Every kind, none overlapping another: a class named here has no subclass that another kind
 * names. The tiles' classes are OpenMapTiles' (layers/poi/poi.yaml): `hospital` holds clinics and
 * nursing homes, `shop` the chemist, the convenience store and the mall, `grocery` the supermarket
 * and the department store, so those are matched by subclass.
 */
export const ESTABLISHMENT_KINDS: readonly EstablishmentKind[] = [
  { glyph: 'shop', family: 'shopping', tier: 1, subclasses: ['mall', 'department_store'] },
  { glyph: 'hospital', family: 'health', tier: 1, subclasses: ['hospital'] },
  { glyph: 'college', family: 'education', tier: 1, classes: ['college'] },
  { glyph: 'grocery', family: 'shopping', tier: 2, subclasses: ['supermarket'] },
  { glyph: 'convenience', family: 'shopping', tier: 2, subclasses: ['convenience', 'general'] },
  { glyph: 'atm', family: 'money', tier: 2, classes: ['atm'] },
  { glyph: 'bank', family: 'money', tier: 2, classes: ['bank'] },
  { glyph: 'pharmacy', family: 'health', tier: 2, classes: ['pharmacy'] },
  { glyph: 'pharmacy', family: 'health', tier: 2, subclasses: ['chemist'] },
  { glyph: 'school', family: 'education', tier: 2, classes: ['school'] },
  { glyph: 'fuel', family: 'transport', tier: 2, subclasses: ['fuel'] },
  { glyph: 'police', family: 'safety', tier: 2, classes: ['police'] },
  { glyph: 'restaurant', family: 'food', tier: 3, classes: ['restaurant'] },
  { glyph: 'fast-food', family: 'food', tier: 3, classes: ['fast_food'] },
  { glyph: 'cafe', family: 'food', tier: 3, classes: ['cafe'] },
  { glyph: 'doctor', family: 'health', tier: 3, subclasses: ['clinic', 'doctors'] },
  { glyph: 'dentist', family: 'health', tier: 3, classes: ['dentist'] },
  { glyph: 'laundry', family: 'services', tier: 3, classes: ['laundry'] },
  { glyph: 'toilet', family: 'services', tier: 3, classes: ['toilets'] },
];

/**
 * The places the basemap's tiles lack, drawn from Para's own establishment files (E3b,
 * establishment-extra.ts): pawnshops by a jewel, the pawn they mostly take, and remittance and
 * bayad centers by money in hand. Both are money.
 */
export const EXTRA_KIND_GLYPH = { pawnshop: 'jewelry-store', remittance: 'money-hand' } as const;
export const EXTRA_FAMILY: EstablishmentFamily = 'money';

/**
 * The glyphs only Overture's places use, none of the basemap's kinds: a place to stay, by Maki's
 * lodging. Its family is a placeholder until the owner picks one.
 */
export const OVERTURE_ONLY_GLYPH_FAMILY: Partial<Record<EstablishmentGlyph, EstablishmentFamily>> =
  {
    lodging: 'services',
  };

/** Each family's marker colour, as the map paints it (tokens.css, Map/Establishment/…). */
export const FAMILY_COLOUR: Record<EstablishmentFamily, string> = {
  food: ESTABLISHMENT_COLOURS['Map/Establishment/Food/surface'],
  shopping: ESTABLISHMENT_COLOURS['Map/Establishment/Shopping/surface'],
  money: ESTABLISHMENT_COLOURS['Map/Establishment/Money/surface'],
  health: ESTABLISHMENT_COLOURS['Map/Establishment/Health/surface'],
  education: ESTABLISHMENT_COLOURS['Map/Establishment/Education/surface'],
  transport: ESTABLISHMENT_COLOURS['Map/Establishment/Transport/surface'],
  services: ESTABLISHMENT_COLOURS['Map/Establishment/Services/surface'],
  safety: ESTABLISHMENT_COLOURS['Map/Establishment/Safety/surface'],
};

/**
 * Where the places from Para's own cell files first show (the pawnshops, Overture's places): the
 * cells are read only from here in, and each place's name joins it a zoom closer.
 */
export const ESTABLISHMENT_FILL_ZOOM = 16;

/** Where a tier's marker first shows, and where its name joins it. */
export const TIER_ZOOM: Record<EstablishmentTier, { marker: number; name: number }> = {
  1: { marker: 14, name: 15 },
  2: { marker: 15, name: 16 },
  3: { marker: 16, name: 17 },
};

export function establishmentImageOf(glyph: EstablishmentGlyph): string {
  return `${ESTABLISHMENT_IMAGE_PREFIX}${glyph}`;
}

/** The family a glyph's marker is coloured by: each glyph belongs to one. */
export function familyOfGlyph(glyph: EstablishmentGlyph): EstablishmentFamily | null {
  if (Object.values(EXTRA_KIND_GLYPH).some((extra) => extra === glyph)) return EXTRA_FAMILY;
  const overtureOnly = OVERTURE_ONLY_GLYPH_FAMILY[glyph];
  if (overtureOnly) return overtureOnly;
  return ESTABLISHMENT_KINDS.find((kind) => kind.glyph === glyph)?.family ?? null;
}
