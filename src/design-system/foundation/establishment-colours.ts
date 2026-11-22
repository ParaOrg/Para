/**
 * Provisional, not named in Figma yet: an establishment's marker on the map, one colour per family
 * (tokens.css, --map-establishment-…), in hex for MapLibre. Apart from MAP_COLOURS so the page's
 * opening code does not carry it: only the establishments' own chunk reads it. Held to tokens.css
 * with the rest by tests/unit/map-colours-test.mjs.
 */
export const ESTABLISHMENT_COLOURS = {
  'Map/Establishment/Food/surface': '#ca3500', // orange/700
  'Map/Establishment/Shopping/surface': '#a65f00', // yellow/700
  'Map/Establishment/Money/surface': '#00786f', // teal/700
  'Map/Establishment/Health/surface': '#e7000b', // red/600
  'Map/Establishment/Education/surface': '#973c00', // amber/800
  'Map/Establishment/Transport/surface': '#007595', // cyan/700
  'Map/Establishment/Services/surface': '#45556c', // slate/600
  'Map/Establishment/Safety/surface': '#1c398e', // blue/900
} as const satisfies Record<`Map/Establishment/${string}`, `#${string}`>;
