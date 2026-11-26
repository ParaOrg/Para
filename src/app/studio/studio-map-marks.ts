/*
 * What the studio's map draws beyond the routes and the hotspots' boxes, and what it is made with
 * (MapView's props that never change). Several marks are off for now; each comes back by one
 * line here.
 */

/**
 * The hotspots' marks: no pin zoomed in and no dot zoomed out, for a terminal or a hintuan. The
 * boxes and names stay, and a tap on a box or a search still opens it. Without `shouldShowPins`
 * and `dotKinds` the pins and dots come back.
 */
export const HOTSPOT_MARKS = { shouldShowPins: false, dotKinds: [] } as const;

/**
 * OpenStreetMap's terminals as faint dots, the possible terminals an editor places Para's own by
 * (.scratch/terminals): off; `true` brings them back.
 */
export const HAS_POSSIBLE_TERMINALS = false;

/**
 * MapView's fixed props: no +, − or compass (`zoomButtons`), and no commuter's terminal markers
 * (`hasTerminalMarkers`); a pinch, Ctrl or ⌘ and the wheel, the keys and a double click zoom.
 */
export const STUDIO_MAP_VIEW = {
  zoomButtons: false,
  hasTerminalMarkers: false,
  foldCredits: true,
  hasMapStyleButton: false,
  labelsPlace: 'studio',
} as const;
