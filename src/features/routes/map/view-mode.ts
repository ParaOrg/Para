import * as z from 'zod/mini';

/*
 * The map's view (the owner's commuter-map designs, 4885:44801): 2D is a flat map, looking
 * straight down, its buildings flat footprints however it is tilted by hand (the owner,
 * 2026-11-26); 3D tilts the camera and raises the designs' buildings (their fill-extrusion layers,
 * e.g. monochrome.ts's and Colour's building-3d; building-look.ts). No terrain. The first visit is
 * always 2D; after that the device keeps the commuter's choice.
 */

export const VIEW_MODES = ['2d', '3d'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

/**
 * The camera's tilt in each view, in degrees. 3D's 55: high enough that a street's buildings read
 * as standing, low enough that the horizon stays off a phone's screen at street zoom and the
 * labels stay flat to read.
 */
export const VIEW_PITCH = { '2d': 0, '3d': 55 } satisfies Record<ViewMode, number>;

/** Where the device keeps the choice. */
export const VIEW_MODE_KEY = 'para.view-mode.v1';

const storedSchema = z.enum(VIEW_MODES);

/** The device's choice, or 2D on a first visit, an unreadable value or blocked storage. */
export function readViewMode(): ViewMode {
  try {
    const stored = storedSchema.safeParse(localStorage.getItem(VIEW_MODE_KEY));
    return stored.success ? stored.data : '2d';
  } catch {
    return '2d';
  }
}

/** Keeps the choice on this device. */
export function rememberViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
}

/** The other view: what a tap on ViewModeButton switches to. */
export function otherViewMode(mode: ViewMode): ViewMode {
  return mode === '2d' ? '3d' : '2d';
}

/** The tilt a camera that follows the commuter rests at: the device's view's. */
export function restingPitch(): number {
  return VIEW_PITCH[readViewMode()];
}
