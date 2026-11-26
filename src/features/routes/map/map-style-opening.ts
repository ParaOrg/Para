/**
 * Which way the card opens from its button: down from the top-right corner
 * (BasemapControl), up from LocationAndMap, which sits on the card's sheet.
 */
export type MapStyleDirection = 'down' | 'up';

/**
 * Down from a button in the map's top half, up from one in its foot: the public map's pill, at the
 * top right on a phone and over the LocatorButton where the card floats (MapViewPill).
 */
export type MapStyleOpening = MapStyleDirection | 'auto';

/** Between the button and the card (gap-2), and kept clear past the card, as the corner's margin. */
const CARD_GAP_PX = 8;
const CARD_EDGE_PX = 10;

interface Box {
  top: number;
  bottom: number;
}

/**
 * Which way the card opens and how tall it may grow, in px, as it opens: to the map's edge and no
 * further, as the map clips what is past it (MapLibre's overflow). Undefined room with no boxes.
 */
export function cardOpening(
  opening: MapStyleOpening,
  button: Box | undefined,
  edges: Box | undefined,
): { direction: MapStyleDirection; room: number | undefined } {
  const direction =
    opening !== 'auto'
      ? opening
      : button && edges && button.top - edges.top > edges.bottom - button.bottom
        ? 'up'
        : 'down';
  if (!button || !edges) return { direction, room: undefined };
  const room = direction === 'down' ? edges.bottom - button.bottom : button.top - edges.top;
  return { direction, room: room - CARD_GAP_PX - CARD_EDGE_PX };
}
