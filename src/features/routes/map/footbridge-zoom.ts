/**
 * From street level in, where a footbridge means something (.scratch/footbridges). Its own
 * module, with the layers' names, so the hook that waits for it and shows or hides the layer
 * carries none of the layer's code.
 */
export const FOOTBRIDGE_MIN_ZOOM = 15;

/** The footbridges' source and its layers, by name: the suites read them. */
export const FOOTBRIDGE_LAYERS = {
  source: 'footbridges',
  line: 'footbridges-line',
  elevator: 'footbridges-elevator',
} as const;
