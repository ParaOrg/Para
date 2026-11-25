import type { Terminal } from '../published/terminal-file-schema';

/*
 * OpenStreetMap's terminals on the map (.scratch/terminals) as points, and their layers' names and
 * zooms: the commuter's markers (terminal-markers.ts) and the studio's possible terminals
 * (terminal-dots-layer.ts). Their own module, so the hook that waits for the dots, and each layer
 * that gives way to the other, carries none of the other's code.
 */

/** The commuter's terminal markers' source and layer. */
export const TERMINAL_SOURCE = 'osm-terminals';

/** From the district in, where the studio's possible terminals start to tell apart. */
export const TERMINAL_DOTS_MIN_ZOOM = 13;

/** Where a dot's name joins it. */
export const TERMINAL_DOTS_NAME_ZOOM = 15;

/** The dots' source and its layers, by name: the suites read them. */
export const TERMINAL_DOTS = {
  source: 'possible-terminals',
  dot: 'possible-terminals-dot',
  name: 'possible-terminals-name',
} as const;

/** The kinds a commuter is shown: a terminal whose kind is not known may not be one for them. */
export const COMMUTER_TERMINAL_KINDS: readonly Terminal['kind'][] = ['jeepney', 'uv', 'bus'];

/** The terminals of the kinds given as map points, with their names. */
export function terminalFeatures(
  terminals: readonly Terminal[],
  kinds: readonly Terminal['kind'][],
) {
  return {
    type: 'FeatureCollection' as const,
    features: terminals
      .filter((terminal) => kinds.includes(terminal.kind))
      .map((terminal) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [...terminal.point] },
        properties: { id: terminal.osmId, kind: terminal.kind, name: terminal.name },
      })),
  };
}
